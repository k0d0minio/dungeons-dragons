// The live combat state of a character, and every legal way to change it
// (DND-009).
//
// Imported by both sides of the wire, like `schema.ts` is for DND-008: the
// sheet applies a transition optimistically and PATCHes the result, and
// `PATCH /api/characters/[id]` validates and re-normalises the same shape
// before it reaches the database. Transitions are pure — no fetch, no clock,
// no React — so the rules they encode are testable without a browser.
//
// Every change is sent as an absolute value rather than a delta ("current HP
// is now 14", not "take 3 damage"). Two taps in a dim room a tenth of a second
// apart must not compound into a lost hit point if one request overtakes the
// other, and last-write-wins on an absolute value cannot.
import { z } from 'zod'

import type { Character, ClassResource, Concentration, SpellSlotState } from '@/lib/db/schema'

import { experienceAfterAward, MAX_EXPERIENCE } from './experience'
import { isKnownCondition, MAX_CHARACTER_LEVEL, spellPreparationModel } from './rules'

/** The columns the sheet is allowed to change. Everything else is DND-008's. */
export interface CombatState {
  currentHitPoints: number
  temporaryHitPoints: number
  spellSlots: SpellSlotState
  conditions: string[]
  deathSaveSuccesses: number
  deathSaveFailures: number
  /** Exhaustion level, 0–6 (DND-038). Six is death. */
  exhaustion: number
  /** Hit dice spent since the last long rest (DND-033). */
  hitDiceUsed: number
  /** Class resource pools — rage, ki, Channel Divinity (D23). */
  classResources: ClassResource[]
  /** Prepared spells (DND-036). Meaningful only for prepared casters. */
  preparedSpellIndexes: string[]
  /** The one spell being concentrated on (DND-049), or `null` for none. */
  concentration: Concentration | null
  /**
   * Experience points, or `null` for a character nobody counts XP for
   * (DND-055). Live state rather than a build field: it is awarded during a
   * session, from the sheet or from the DM's encounter tracker, and so it
   * needs the same version guard every other in-play write has.
   */
  experience: number | null
  // Currency (DND-035): the most common between-sessions edit.
  cp: number
  sp: number
  ep: number
  gp: number
  pp: number
}

/** Spell levels the sheet renders, lowest first. Cantrips have no slots. */
export const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** The upper bound on any one pool of slots — generous, so homebrew fits. */
export const MAX_SLOTS_PER_LEVEL = 9

/** 5e kills you on the third failed death save, and stabilises you on the third success. */
export const DEATH_SAVE_LIMIT = 3

/** Exhaustion runs 0 (fine) to 6 (dead) — `docs/rules/09-adventuring.md`. */
export const MAX_EXHAUSTION = 6

/** The tracked subset of a stored character row. */
export function combatStateOf(character: Character): CombatState {
  return {
    currentHitPoints: character.currentHitPoints,
    temporaryHitPoints: character.temporaryHitPoints,
    spellSlots: character.spellSlots,
    conditions: character.conditions,
    deathSaveSuccesses: character.deathSaveSuccesses,
    deathSaveFailures: character.deathSaveFailures,
    exhaustion: character.exhaustion,
    hitDiceUsed: character.hitDiceUsed,
    classResources: character.classResources,
    preparedSpellIndexes: character.preparedSpellIndexes,
    concentration: character.concentration,
    experience: character.experience,
    cp: character.cp,
    sp: character.sp,
    ep: character.ep,
    gp: character.gp,
    pp: character.pp,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Death saves only mean anything at 0 hit points. Anything that lifts a
 * character off the floor clears the track, which is 5e's own rule — "if you
 * regain any hit points… you stop being unconscious" — and also the thing a
 * player forgets to do at the table.
 */
function withDeathSavesForHitPoints(state: CombatState): CombatState {
  if (state.currentHitPoints <= 0) return state
  if (state.deathSaveSuccesses === 0 && state.deathSaveFailures === 0) return state

  return { ...state, deathSaveSuccesses: 0, deathSaveFailures: 0 }
}

/**
 * Take `amount` damage. Temporary hit points soak it first and are spent before
 * real ones, per the temp HP rules; anything left over comes off current HP,
 * which stops at 0 rather than going negative — the sheet tracks death saves,
 * not the exact size of the hole you are in.
 */
export function applyDamage(state: CombatState, maxHitPoints: number, amount: number): CombatState {
  const damage = Math.max(0, Math.floor(amount))
  const absorbed = Math.min(state.temporaryHitPoints, damage)

  return {
    ...state,
    temporaryHitPoints: state.temporaryHitPoints - absorbed,
    currentHitPoints: clamp(state.currentHitPoints - (damage - absorbed), 0, maxHitPoints),
  }
}

/** Heal `amount`, never above the character's maximum. */
export function applyHealing(
  state: CombatState,
  maxHitPoints: number,
  amount: number,
): CombatState {
  const healing = Math.max(0, Math.floor(amount))

  return withDeathSavesForHitPoints({
    ...state,
    currentHitPoints: clamp(state.currentHitPoints + healing, 0, maxHitPoints),
  })
}

/**
 * Set temporary hit points outright.
 *
 * Not additive on purpose: temp HP from two sources do not stack in 5e, you
 * choose which pool to keep. Typing the new number is that choice.
 */
export function setTemporaryHitPoints(state: CombatState, value: number): CombatState {
  return { ...state, temporaryHitPoints: clamp(Math.floor(value), 0, 999) }
}

/**
 * Tap the `position`-th death save marker (1-based) and get the resulting
 * count: tapping an unfilled marker fills up to it, tapping the last filled one
 * clears it. One tap forward, one tap to undo a mis-tap.
 */
export function toggleDeathSaveCount(current: number, position: number): number {
  return current === position ? position - 1 : clamp(position, 0, DEATH_SAVE_LIMIT)
}

export function setDeathSaveSuccesses(state: CombatState, position: number): CombatState {
  return { ...state, deathSaveSuccesses: toggleDeathSaveCount(state.deathSaveSuccesses, position) }
}

export function setDeathSaveFailures(state: CombatState, position: number): CombatState {
  return { ...state, deathSaveFailures: toggleDeathSaveCount(state.deathSaveFailures, position) }
}

/**
 * Set the exhaustion level outright, clamped to 0–6 (DND-038). Absolute like
 * every transition here: two taps must not compound.
 */
export function setExhaustion(state: CombatState, level: number): CombatState {
  return { ...state, exhaustion: clamp(Math.floor(level), 0, MAX_EXHAUSTION) }
}

/** Add or remove a condition, keeping the list duplicate-free. */
export function toggleCondition(state: CombatState, index: string): CombatState {
  const active = state.conditions.includes(index)

  return {
    ...state,
    conditions: active
      ? state.conditions.filter((condition) => condition !== index)
      : [...state.conditions, index],
  }
}

/** Spend one slot of `level`. A pool with none left is left alone. */
export function spendSlot(state: CombatState, level: number): CombatState {
  const slot = state.spellSlots[String(level)]
  if (!slot || slot.used >= slot.max) return state

  return {
    ...state,
    spellSlots: { ...state.spellSlots, [String(level)]: { ...slot, used: slot.used + 1 } },
  }
}

/** Give back one slot of `level` — a mis-tap, or the end of a rest. */
export function regainSlot(state: CombatState, level: number): CombatState {
  const slot = state.spellSlots[String(level)]
  if (!slot || slot.used <= 0) return state

  return {
    ...state,
    spellSlots: { ...state.spellSlots, [String(level)]: { ...slot, used: slot.used - 1 } },
  }
}

/**
 * Set how many slots of `level` the character has. Dropping the maximum below
 * what is already spent takes the spent count down with it, and a maximum of
 * zero removes the level from the sheet entirely.
 */
export function setSlotMax(state: CombatState, level: number, max: number): CombatState {
  const key = String(level)
  const bounded = clamp(Math.floor(max), 0, MAX_SLOTS_PER_LEVEL)
  const spellSlots = { ...state.spellSlots }

  if (bounded === 0) {
    delete spellSlots[key]
  } else {
    spellSlots[key] = { max: bounded, used: Math.min(spellSlots[key]?.used ?? 0, bounded) }
  }

  return { ...state, spellSlots }
}

/** Replace the whole slot layout — used when adopting the standard table. */
export function setSpellSlots(state: CombatState, spellSlots: SpellSlotState): CombatState {
  return { ...state, spellSlots }
}

// ---------------------------------------------------------------------------
// Class resources (D23, DND-033)
// ---------------------------------------------------------------------------

/** Spend one use of the `position`-th resource. An empty pool is left alone. */
export function spendResource(state: CombatState, position: number): CombatState {
  const resource = state.classResources[position]
  if (!resource || resource.used >= resource.max) return state

  const classResources = [...state.classResources]
  classResources[position] = { ...resource, used: resource.used + 1 }

  return { ...state, classResources }
}

/** Give back one use — a mis-tap, or a feature that refunds. */
export function regainResource(state: CombatState, position: number): CombatState {
  const resource = state.classResources[position]
  if (!resource || resource.used <= 0) return state

  const classResources = [...state.classResources]
  classResources[position] = { ...resource, used: resource.used - 1 }

  return { ...state, classResources }
}

/**
 * Replace the whole resource list — add, edit and remove all go through here,
 * absolute like every transition. Each pool is clamped to sane bounds and
 * `used` is held to `max`, mirroring what `normaliseCombatPatch` would do
 * server-side anyway.
 */
export function setResources(state: CombatState, resources: ClassResource[]): CombatState {
  return {
    ...state,
    classResources: resources.map((resource) => {
      const max = clamp(Math.floor(resource.max), 0, 99)

      return { ...resource, max, used: clamp(Math.floor(resource.used), 0, max) }
    }),
  }
}

// ---------------------------------------------------------------------------
// Currency (DND-035)
// ---------------------------------------------------------------------------

/** The five 5e coin denominations, in ascending value — sheet display order. */
export const CURRENCY_KEYS = ['cp', 'sp', 'ep', 'gp', 'pp'] as const

export type CurrencyKey = (typeof CURRENCY_KEYS)[number]

/** Set one denomination outright — typed on blur, not nudged. */
export function setCurrency(state: CombatState, coin: CurrencyKey, value: number): CombatState {
  const bounded = clamp(Math.floor(value), 0, 999_999_999)
  if (state[coin] === bounded) return state

  return { ...state, [coin]: bounded }
}

// ---------------------------------------------------------------------------
// Experience (DND-055)
// ---------------------------------------------------------------------------

/**
 * Award XP — or take it back, with a negative amount, when the award was
 * mis-tapped. A character who was not being counted starts from zero, so the
 * first award is what opts them in.
 *
 * Absolute on the wire like everything else here: the delta is turned into a
 * total by {@link experienceAfterAward} before it leaves.
 */
export function awardExperience(state: CombatState, amount: number): CombatState {
  // An award of nothing is not a decision to start counting: a character
  // nobody tracks stays untracked, and nobody spends a request on it.
  if (Math.floor(amount) === 0) return state

  const next = experienceAfterAward(state.experience, amount)
  if (next === state.experience) return state

  return { ...state, experience: next }
}

/**
 * Start counting XP for this character (a number), or stop (`null`).
 *
 * Stopping is not the same as awarding zero, which is why the column is
 * nullable: a milestone table's sheet should say nothing about XP at all
 * rather than show a total that has sat at 0 all campaign.
 */
export function setExperience(state: CombatState, experience: number | null): CombatState {
  const next = experience === null ? null : experienceAfterAward(0, experience)
  if (next === state.experience) return state

  return { ...state, experience: next }
}

// ---------------------------------------------------------------------------
// Spell preparation (DND-036)
// ---------------------------------------------------------------------------

/** Prepare a spell, or unprepare it — one tap each way, duplicate-free. */
export function togglePreparedSpell(state: CombatState, index: string): CombatState {
  const prepared = state.preparedSpellIndexes.includes(index)

  return {
    ...state,
    preparedSpellIndexes: prepared
      ? state.preparedSpellIndexes.filter((spell) => spell !== index)
      : [...state.preparedSpellIndexes, index],
  }
}

// ---------------------------------------------------------------------------
// Concentration (DND-049)
// ---------------------------------------------------------------------------

/**
 * The longest concentration label the sheet stores. Generous next to the
 * longest SRD spell name ("Nystul's Magic Aura", 19), because the free-text
 * half of the picker is where "the amulet the DM handed me" gets typed.
 */
export const CONCENTRATION_NAME_LIMIT = 80

/**
 * Start — or stop — concentrating (DND-049).
 *
 * One value in, absolute like every transition here: 5e allows exactly one
 * concentration effect at a time, so starting a second *is* dropping the first
 * and there is no add/remove pair to get out of step. `null` clears it, which
 * is the one-tap "I lost it" the sheet, the glance and the tracker all need.
 *
 * A blank or whitespace-only name is not a state worth storing — an empty chip
 * on the DM's glance says nothing — so it clears instead. Setting what is
 * already set returns the same state object, which is how `useCombatState`
 * knows a tap cost nothing and skips the request.
 */
export function setConcentration(
  state: CombatState,
  concentration: Concentration | null,
): CombatState {
  const name = concentration?.name.trim().slice(0, CONCENTRATION_NAME_LIMIT) ?? ''
  const next: Concentration | null = name ? { index: concentration?.index ?? null, name } : null

  const current = state.concentration
  const unchanged =
    next === null ? current === null : current?.index === next.index && current.name === next.name

  return unchanged ? state : { ...state, concentration: next }
}

/** Slot levels the character actually has, ascending. */
export function slotLevelsOf(spellSlots: SpellSlotState): number[] {
  return Object.entries(spellSlots)
    .filter(([, slot]) => slot.max > 0)
    .map(([level]) => Number(level))
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= 9)
    .sort((a, b) => a - b)
}

/**
 * The slot levels a spell of `spellLevel` could actually be cast with right
 * now, ascending (DND-050): at or above its own level, and with a slot still
 * left in that pool.
 *
 * Both halves matter. A 3rd-level spell never fits a 2nd-level slot, and a
 * 3rd-level pool that is spent does not stop *Fireball* — the 4th-level slot
 * beside it still casts it, upcast. That join is the whole reason the cast flow
 * picks a level rather than assuming one, and doing it here rather than in the
 * card keeps it testable and keeps a level with no slot left off the picker
 * instead of merely disabled.
 *
 * Cantrips (level 0) and anything non-integer answer `[]` — they spend nothing,
 * so there is no level to pick.
 */
export function castableSlotLevels(spellSlots: SpellSlotState, spellLevel: number): number[] {
  if (!Number.isInteger(spellLevel) || spellLevel < 1) return []

  return slotLevelsOf(spellSlots).filter((level) => {
    if (level < spellLevel) return false

    const slot = spellSlots[String(level)]
    return slot.used < slot.max
  })
}

// ---------------------------------------------------------------------------
// The wire contract
// ---------------------------------------------------------------------------

/** A character can hold every condition there is at once, and no more. */
const CONDITION_LIMIT = 20

/** Enough pools for any class's features with headroom for homebrew. */
const CLASS_RESOURCE_LIMIT = 20

/** One pool's ceiling — ki reaches 20, sorcery points 20; homebrew gets slack. */
const CLASS_RESOURCE_MAX = 99

/**
 * The most coins one column takes. Far under `integer`'s real ceiling, for the
 * same reason the form caps hit points at 999 — "999,999,999" is a better
 * error than an int4 overflow.
 */
const CURRENCY_MAX = 999_999_999

const slotPool = z.object({
  max: z.number().int().min(0).max(MAX_SLOTS_PER_LEVEL),
  used: z.number().int().min(0).max(MAX_SLOTS_PER_LEVEL),
})

const classResource = z.strictObject({
  name: z.string().trim().min(1).max(60),
  max: z.number().int().min(0).max(CLASS_RESOURCE_MAX),
  used: z.number().int().min(0).max(CLASS_RESOURCE_MAX),
  recharge: z.enum(['short-rest', 'long-rest', 'manual']),
})

const currencyAmount = z.number().int().min(0).max(CURRENCY_MAX)

/**
 * The concentration flag on the wire (DND-049). Nullable rather than optional:
 * `null` is the value that clears it, and `.partial()` below already makes
 * *omitting* the key mean "leave it alone". The two must stay distinguishable
 * — a conditions-only patch must not drop a running concentration.
 */
const concentration = z
  .strictObject({
    index: z.string().min(1).max(120).nullable(),
    name: z.string().trim().min(1).max(CONCENTRATION_NAME_LIMIT),
  })
  .nullable()

/**
 * What `PATCH /api/characters/[id]` accepts as live sheet state.
 *
 * Strict, and limited to the tracked columns: this route exists so a phone
 * can change hit points mid-combat, and it must not become a way to rename a
 * character or rewrite their ability scores. Bounds here are never looser than
 * the CHECK constraints in `src/lib/db/schema.ts`; the sheet-specific rules
 * that need the stored row (current HP against *this* character's maximum,
 * hit dice against their level) are applied by {@link normaliseCombatPatch}
 * instead.
 *
 * These keys and the build patch's (`characterFormSchema`) must stay disjoint
 * — `isBuildPatch` in the route tells the two shapes apart by key. That is
 * why `skillProficiencies`/`skillExpertise` are build fields and everything
 * here is not.
 */
export const combatPatchSchema = z
  .strictObject({
    currentHitPoints: z.number().int().min(0).max(999),
    temporaryHitPoints: z.number().int().min(0).max(999),
    spellSlots: z.record(z.string().regex(/^[1-9]$/, 'Spell levels run from 1 to 9'), slotPool),
    conditions: z.array(z.string().min(1)).max(CONDITION_LIMIT),
    deathSaveSuccesses: z.number().int().min(0).max(DEATH_SAVE_LIMIT),
    deathSaveFailures: z.number().int().min(0).max(DEATH_SAVE_LIMIT),
    exhaustion: z
      .number()
      .int()
      .min(0)
      .max(MAX_EXHAUSTION, `Exhaustion runs from 0 to ${MAX_EXHAUSTION}`),
    hitDiceUsed: z.number().int().min(0).max(MAX_CHARACTER_LEVEL),
    classResources: z.array(classResource).max(CLASS_RESOURCE_LIMIT),
    preparedSpellIndexes: z
      .array(z.string().min(1))
      .max(400, 'That is more spells than the reference data has'),
    concentration,
    // Nullable, not optional: `null` is a value this field carries — "stop
    // counting XP for this character" — and `.partial()` below already makes
    // *absent* mean "leave it alone". The two must stay distinguishable.
    experience: z.number().int().min(0).max(MAX_EXPERIENCE).nullable(),
    cp: currencyAmount,
    sp: currencyAmount,
    ep: currencyAmount,
    gp: currencyAmount,
    pp: currencyAmount,
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'Nothing to change',
  })

export type CombatPatch = z.infer<typeof combatPatchSchema>

/**
 * Bring a validated patch into line with the character it is being applied to.
 *
 * Zod can say "0 to 999 hit points"; only the stored row knows this wizard tops
 * out at 32, or that a condition index is one this app renders. The sheet
 * already enforces all of it — this is the copy that runs for a request the
 * sheet did not send.
 */
export function normaliseCombatPatch(patch: CombatPatch, character: Character): CombatPatch {
  const normalised: CombatPatch = { ...patch }

  if (normalised.currentHitPoints !== undefined) {
    normalised.currentHitPoints = clamp(normalised.currentHitPoints, 0, character.maxHitPoints)
  }

  if (normalised.spellSlots !== undefined) {
    const slots: SpellSlotState = {}

    for (const [level, slot] of Object.entries(normalised.spellSlots)) {
      if (slot.max > 0) slots[level] = { max: slot.max, used: Math.min(slot.used, slot.max) }
    }

    normalised.spellSlots = slots
  }

  if (normalised.conditions !== undefined) {
    normalised.conditions = Array.from(new Set(normalised.conditions)).filter(isKnownCondition)
  }

  // Zod caps hit dice at 20 (the level ceiling); only the row knows this
  // character is 5th level and has five dice to spend.
  if (normalised.hitDiceUsed !== undefined) {
    normalised.hitDiceUsed = clamp(normalised.hitDiceUsed, 0, character.level)
  }

  // A pool cannot have spent more than it holds.
  if (normalised.classResources !== undefined) {
    normalised.classResources = normalised.classResources.map((resource) => ({
      ...resource,
      used: Math.min(resource.used, resource.max),
    }))
  }

  // Prepared spells are deduplicated, and a wizard's are held to the
  // spellbook: `prepared` ⊆ `known` is D22's two-list model, and the sheet's
  // prepare screen only offers the book. Class-list preparers (cleric, druid,
  // paladin) pass through — validating against the full class list would be a
  // reference-API round trip on every save, the same trade `POST` makes for
  // known spells.
  if (normalised.preparedSpellIndexes !== undefined) {
    const deduplicated = Array.from(new Set(normalised.preparedSpellIndexes))

    normalised.preparedSpellIndexes =
      spellPreparationModel(character.classIndex) === 'spellbook'
        ? deduplicated.filter((index) => character.knownSpellIndexes.includes(index))
        : deduplicated
  }

  // Death saves cannot outlive the state that produced them. `currentHitPoints`
  // may be absent from the patch — a conditions-only change — in which case the
  // stored value is what counts.
  const resultingHitPoints = normalised.currentHitPoints ?? character.currentHitPoints

  if (resultingHitPoints > 0) {
    if (normalised.deathSaveSuccesses !== undefined) normalised.deathSaveSuccesses = 0
    if (normalised.deathSaveFailures !== undefined) normalised.deathSaveFailures = 0
  }

  return normalised
}
