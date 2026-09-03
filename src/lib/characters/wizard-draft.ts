// The wizard's draft: eight steps that survive being walked away from
// (`guided-creation/wizard-frame`).
//
// A first character takes twenty minutes and gets made on a phone, which means
// it gets made in two sittings — a lock screen, a doorbell, a tab that reloads.
// Every step therefore writes the whole build to `localStorage` as it is
// answered, and reopening `/characters/new` resumes on the step it stopped at.
//
// `localStorage` rather than a `character_drafts` table on purpose: an
// unfinished character is not a character, and a row for one would show up in
// every owner-scoped query in the app — the party glance, the campaign roster,
// the list — as a nameless level-1 nothing. The cost is that a draft does not
// follow the player to another device, which for a build they will finish in
// one sitting on the phone in their hand is the right trade.
//
// Nothing here throws. A draft is a convenience; a corrupt one is discarded and
// the wizard opens on its recommendation, which is what it would have done
// anyway.
import { z } from 'zod'

import { ABILITIES, isAbilityKey, type AbilityKey } from '@/lib/characters/schema'
import { parseQuizAnswers, type QuizAnswers } from '@/lib/characters/vibe-quiz'
import {
  DEFAULT_CLASS_INDEX,
  recommendedChoices,
  WIZARD_STEP_IDS,
  type WizardChoices,
  type WizardStepId,
} from '@/lib/characters/wizard'
import { CLASSES } from '@/lib/srd/classes'

/** Where the draft lives. Versioned in the key so a shape change cannot half-load. */
export const WIZARD_DRAFT_KEY = 'dnd:character-wizard:v1'

export interface WizardDraft {
  /** The step to reopen on. */
  stepId: WizardStepId
  /** The campaign this character joins on completion, or `null`. */
  campaignId: string | null
  choices: WizardChoices
  /**
   * The vibe quiz's answers, or `null` for a build that skipped it
   * (`guided-creation/vibe-quiz`). Kept so a re-run opens on what was answered
   * last time rather than on a blank quiz — changing one answer is the common
   * reason to retake it.
   */
  quizAnswers: QuizAnswers | null
  /** ISO timestamp of the last write — what the resume banner dates. */
  updatedAt: string
}

const abilityKey = z.string().refine((key): key is AbilityKey => isAbilityKey(key))

const abilityScores = z.object(
  Object.fromEntries(ABILITIES.map((ability) => [ability.key, z.number()])) as Record<
    AbilityKey,
    z.ZodNumber
  >,
)

/**
 * The stored shape, checked field by field.
 *
 * Deliberately strict about *types* and silent about *meaning*: a draft naming
 * a class the SRD data no longer carries parses fine here and is caught by
 * {@link loadDraft}, which has the data to say so. Splitting it that way keeps
 * this schema a description of the JSON and not a second copy of the rules.
 */
const draftSchema = z.object({
  stepId: z.enum(WIZARD_STEP_IDS as [WizardStepId, ...WizardStepId[]]),
  campaignId: z.string().nullable(),
  updatedAt: z.string(),
  // Optional rather than required, and checked by the quiz's own parser rather
  // than by a copy of its answer lists: a draft written before the quiz existed
  // is still a character somebody is halfway through making, and losing it to a
  // schema change would be the one failure this file exists to prevent.
  quizAnswers: z.unknown().optional(),
  choices: z.object({
    classIndex: z.string(),
    speciesIndex: z.string(),
    backgroundIndex: z.string(),
    abilityAssignment: z.array(abilityKey),
    manualScores: abilityScores.nullable(),
    backgroundAbilitySpread: z.enum(['two-and-one', 'one-each']),
    backgroundAbilities: z.array(abilityKey),
    skillProficiencies: z.array(z.string()),
    skillExpertise: z.array(z.string()),
    classEquipmentOption: z.number().int().min(0),
    backgroundEquipmentOption: z.number().int().min(0),
    cantripIndexes: z.array(z.string()),
    levelOneSpellIndexes: z.array(z.string()),
    // Defaulted rather than required, for the same reason `quizAnswers` is
    // optional: a draft written before the Advanced overrides existed is still
    // a character somebody is halfway through making, and it resumes with every
    // number derived — which is what it was doing when it was written.
    manualMaxHitPoints: z.number().nullable().default(null),
    manualArmorClass: z.number().nullable().default(null),
    manualSpeed: z.number().nullable().default(null),
    name: z.string(),
  }),
})

/**
 * `localStorage`, or `null` where there isn't one.
 *
 * Server rendering has no `window`, and a browser in private mode can throw on
 * the *property access* rather than on the call — so both are guarded, and a
 * refusal to remember is never a refusal to work.
 */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** The draft as stored, or `null` — missing, unparseable, or built on stale data. */
export function loadDraft(): WizardDraft | null {
  const store = storage()
  if (!store) return null

  let raw: string | null = null

  try {
    raw = store.getItem(WIZARD_DRAFT_KEY)
  } catch {
    return null
  }

  if (!raw) return null

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const draft = draftSchema.safeParse(parsed)
  if (!draft.success) return null

  return { ...draft.data, quizAnswers: parseQuizAnswers(draft.data.quizAnswers) }
}

/** Write the draft, or do nothing at all if the browser will not have it. */
export function saveDraft(draft: Omit<WizardDraft, 'updatedAt'>): void {
  const store = storage()
  if (!store) return

  try {
    store.setItem(
      WIZARD_DRAFT_KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // A full quota — or a browser that refuses to store anything — costs the
    // player the resume, not the character they are in the middle of making.
  }
}

/** Forget the draft. Called once the character exists, and by "start again". */
export function clearDraft(): void {
  const store = storage()
  if (!store) return

  try {
    store.removeItem(WIZARD_DRAFT_KEY)
  } catch {
    // Nothing to do about it, and nothing depends on it having worked.
  }
}

/** An opening draft, plus whether it came out of storage or was invented. */
export interface OpeningDraft extends WizardDraft {
  /**
   * True only when a stored draft was found *and* was still buildable.
   *
   * The wizard needs the distinction the moment the vibe quiz exists: a player
   * with a draft is coming back to a character, and asking them four questions
   * about a character they have already half-made is the wrong screen. A
   * synthesized opening draft looks identical otherwise, which is exactly why
   * this flag has to be carried rather than inferred from `stepId`.
   */
  resumed: boolean
}

/**
 * Where the wizard opens: a resumable draft, or the recommendation.
 *
 * A draft is only resumed when it is still buildable — the class it names has
 * to be one the SRD data carries — because a draft written before an SRD
 * update would otherwise resume onto steps whose options have all moved.
 *
 * `campaignId` from the page wins over the draft's: a player who has just
 * followed a join link is making *this* campaign's character, whatever the
 * draft they abandoned last week was for.
 */
export function openingDraft(campaignId: string | null): OpeningDraft {
  const stored = loadDraft()

  if (stored && CLASSES.has(stored.choices.classIndex)) {
    return { ...stored, campaignId: campaignId ?? stored.campaignId, resumed: true }
  }

  return {
    stepId: 'class',
    campaignId,
    choices: recommendedChoices(DEFAULT_CLASS_INDEX),
    quizAnswers: null,
    updatedAt: new Date().toISOString(),
    resumed: false,
  }
}
