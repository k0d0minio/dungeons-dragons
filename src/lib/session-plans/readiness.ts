// How far through prepping a night the DM is
// (`dm-chronology/eight-steps-plan`).
//
// One pure function over a plan, its child rows and the party, returning **the
// Lazy DM's eight steps** in the order the book writes them, each with whether
// it is done and what it says on the row. Three screens read it and none of
// them counts to a literal eight: the Prep tab's hero draws its rail from
// `steps.length`, the plan screen renders one row per step, and
// `dm-chronology/sessions-tab` will put the same tally on a night's row — so
// the three can never disagree about whether Thursday is ready.
//
// **The eight steps map onto what a plan already stores; no entity is new.**
// The five sections `prep-tab` counted became eight by splitting the one that
// was really three — "the prep it leans on" is fantastic locations, important
// NPCs and monsters, which are the three link kinds `session_plan_links`
// already has — and by putting the book's first step, review the characters,
// at the front. That step is the only one that is not the plan's own data,
// which is why the party arrives as its own argument rather than being smuggled
// into `ReadablePlan`: a night's prep does not own the party, it is measured
// against it.
import type { SessionPlanItemKind, SessionPlanLinkKind } from '@/lib/db/schema'

/** The eight steps, as a key each, in the order the Lazy DM writes them. */
export type PlanStepKey =
  | 'characters'
  | 'strongStart'
  | 'scenes'
  | 'secrets'
  | 'locations'
  | 'npcs'
  | 'monsters'
  | 'treasure'

/** One step of a night's prep: what it is called, how it stands, and whether it is done. */
export interface PlanStep {
  key: PlanStepKey
  /** The row's own heading — "Fantastic locations". */
  heading: string
  /**
   * The step inside a sentence — "still to do: a strong start".
   *
   * Lower case and shaped to sit in a list, which is why it is not the heading
   * with a `toLowerCase()` over it: "NPCs" is not "npcs", and "review the
   * characters" is not what you say after "still to do".
   */
  short: string
  /**
   * How the step stands, in words — "7 written · aim for about 10", "Empty".
   *
   * Every one of these says the answer in words rather than leaving it to the
   * primary-coloured heading beside it, because colour is never the only
   * signal on a screen read at a dim table.
   */
  status: string
  ready: boolean
}

/** The rail and its arithmetic, in the order the steps are written in. */
export interface PlanReadiness {
  steps: PlanStep[]
  /** How many steps have something in them. */
  ready: number
  /** How many there are — the Lazy DM's eight. */
  total: number
}

/**
 * As much of a plan as the rule reads. `SessionPlanDetail` satisfies it.
 *
 * `kind` is `string` rather than the union because that is what the stored
 * row's type says — the column is `text` with a CHECK, and the check is the
 * database's. The kinds are named below against the schema's own constants, so
 * a renamed kind is a compile error here rather than a step that silently
 * never goes green.
 */
export interface ReadablePlan {
  plan: { strongStart: string | null; treasure: string | null }
  items: readonly { kind: string }[]
  links: readonly { kind: string; label: string }[]
}

/**
 * The party the night is prepped for, as `countPartyReadiness` tallies it.
 *
 * Structural rather than imported from `src/lib/db/prep.ts` so this module
 * stays free of the data layer and a test can hand it two numbers.
 */
export interface PartyCount {
  total: number
  notReady: number
}

/** The kinds of line and link a plan owns, named once from the schema. */
const SCENE: SessionPlanItemKind = 'scene'
const SECRET: SessionPlanItemKind = 'secret'
const LOCATION: SessionPlanLinkKind = 'location'
const NPC: SessionPlanLinkKind = 'npc'
const ENCOUNTER: SessionPlanLinkKind = 'encounter'

/** What the book asks for: about ten one-sentence secrets a night. */
export const SECRETS_TARGET = 10

/** Whitespace is not prep: a field of spaces is an empty field. */
function written(value: string | null): boolean {
  return (value ?? '').trim().length > 0
}

/** "Written · 3 lines", or the honest nothing — how a prose field stands. */
function proseStatus(value: string | null): string {
  if (!written(value)) return 'Empty'

  const lines = (value ?? '').split('\n').filter((line) => line.trim().length > 0).length

  return `Written · ${lines} ${lines === 1 ? 'line' : 'lines'}`
}

/** The names a plan has linked of one kind, as the DM typed them. */
function linkedNames(links: ReadablePlan['links'], kind: SessionPlanLinkKind): string[] {
  return links.filter((link) => link.kind === kind).map((link) => link.label)
}

/** "Halda · The lighthouse", or the words for nothing linked yet. */
function linkStatus(names: string[], empty: string): string {
  return names.length > 0 ? names.join(' · ') : empty
}

/** How many lines of one kind the plan has. */
function count(items: ReadablePlan['items'], kind: SessionPlanItemKind): number {
  return items.filter((item) => item.kind === kind).length
}

/** "5 characters · 1 not ready" — the step that is a job rather than a field. */
function partyStatus({ total, notReady }: PartyCount): string {
  if (total === 0) return 'Nobody at the table yet'

  const heads = `${total} ${total === 1 ? 'character' : 'characters'}`

  return notReady === 0 ? `${heads} · all ready` : `${heads} · ${notReady} not ready`
}

/**
 * The eight steps of one night's prep, each with whether it is done.
 *
 * `party` is separate from `plan` because it is not the plan's: reviewing the
 * characters is done when there is a party and every sheet on it is ready for
 * a session, which is a fact about the campaign that no amount of writing on
 * this screen changes. A DM with an unfinished sheet at the table is told so
 * here, and fixes it on the character's own page.
 */
export function planReadiness(
  { plan, items, links }: ReadablePlan,
  party: PartyCount,
): PlanReadiness {
  const secrets = count(items, SECRET)
  const scenes = count(items, SCENE)
  const locations = linkedNames(links, LOCATION)
  const npcs = linkedNames(links, NPC)
  const monsters = linkedNames(links, ENCOUNTER)

  const steps: PlanStep[] = [
    {
      key: 'characters',
      heading: 'Review the characters',
      short: 'the characters',
      status: partyStatus(party),
      ready: party.total > 0 && party.notReady === 0,
    },
    {
      key: 'strongStart',
      heading: 'A strong start',
      short: 'a strong start',
      status: proseStatus(plan.strongStart),
      ready: written(plan.strongStart),
    },
    {
      key: 'scenes',
      heading: 'Potential scenes',
      short: 'scenes',
      status: scenes === 0 ? 'None yet' : `${scenes} ${scenes === 1 ? 'scene' : 'scenes'}`,
      ready: scenes > 0,
    },
    {
      key: 'secrets',
      heading: 'Secrets and clues',
      short: 'secrets',
      status:
        secrets === 0
          ? 'None yet'
          : secrets < SECRETS_TARGET
            ? `${secrets} written · aim for about ${SECRETS_TARGET}`
            : `${secrets} written`,
      ready: secrets > 0,
    },
    {
      key: 'locations',
      heading: 'Fantastic locations',
      short: 'locations',
      status: linkStatus(locations, 'None linked'),
      ready: locations.length > 0,
    },
    {
      key: 'npcs',
      heading: 'Important NPCs',
      short: 'NPCs',
      status: linkStatus(npcs, 'None linked'),
      ready: npcs.length > 0,
    },
    {
      key: 'monsters',
      heading: 'Monsters',
      short: 'monsters',
      status: linkStatus(monsters, 'Nothing built yet — open the encounter builder'),
      ready: monsters.length > 0,
    },
    {
      key: 'treasure',
      heading: 'Treasure',
      short: 'treasure',
      status: proseStatus(plan.treasure),
      ready: written(plan.treasure),
    },
  ]

  return { steps, ready: steps.filter((step) => step.ready).length, total: steps.length }
}

/** How many names the "still to do" line prints before it starts counting. */
const NAMED = 3

/**
 * "a strong start, secrets and treasure" — what is left, as a DM would say it.
 *
 * Three names and then a tally, because this line sits under a title on a
 * phone: a night nothing has been written for would otherwise print every
 * step and push the row to four lines. Empty when there is nothing left,
 * and the hero says the night is ready instead.
 */
export function stillToDo({ steps }: PlanReadiness): string {
  const left = steps.filter((step) => !step.ready).map((step) => step.short)
  if (left.length === 0) return ''

  const named = left.slice(0, NAMED)
  const rest = left.length - named.length
  const parts = rest > 0 ? [...named, `${rest} more`] : named

  if (parts.length === 1) return parts[0]

  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
