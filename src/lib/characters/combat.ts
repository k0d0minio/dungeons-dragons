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

import type { Character, SpellSlotState } from '@/lib/db/schema'

import { isKnownCondition } from './rules'

/** The columns the sheet is allowed to change. Everything else is DND-008's. */
export interface CombatState {
  currentHitPoints: number
  temporaryHitPoints: number
  spellSlots: SpellSlotState
  conditions: string[]
  deathSaveSuccesses: number
  deathSaveFailures: number
}

/** Spell levels the sheet renders, lowest first. Cantrips have no slots. */
export const SPELL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** The upper bound on any one pool of slots — generous, so homebrew fits. */
export const MAX_SLOTS_PER_LEVEL = 9

/** 5e kills you on the third failed death save, and stabilises you on the third success. */
export const DEATH_SAVE_LIMIT = 3

/** The tracked subset of a stored character row. */
export function combatStateOf(character: Character): CombatState {
  return {
    currentHitPoints: character.currentHitPoints,
    temporaryHitPoints: character.temporaryHitPoints,
    spellSlots: character.spellSlots,
    conditions: character.conditions,
    deathSaveSuccesses: character.deathSaveSuccesses,
    deathSaveFailures: character.deathSaveFailures,
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

/** Slot levels the character actually has, ascending. */
export function slotLevelsOf(spellSlots: SpellSlotState): number[] {
  return Object.entries(spellSlots)
    .filter(([, slot]) => slot.max > 0)
    .map(([level]) => Number(level))
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= 9)
    .sort((a, b) => a - b)
}

// ---------------------------------------------------------------------------
// The wire contract
// ---------------------------------------------------------------------------

/** A character can hold every condition there is at once, and no more. */
const CONDITION_LIMIT = 20

const slotPool = z.object({
  max: z.number().int().min(0).max(MAX_SLOTS_PER_LEVEL),
  used: z.number().int().min(0).max(MAX_SLOTS_PER_LEVEL),
})

/**
 * What `PATCH /api/characters/[id]` accepts.
 *
 * Strict, and limited to the six tracked columns: this route exists so a phone
 * can change hit points mid-combat, and it must not become a way to rename a
 * character or rewrite their ability scores. Bounds here are never looser than
 * the CHECK constraints in `src/lib/db/schema.ts`; the sheet-specific rules
 * that need the stored row (current HP against *this* character's maximum) are
 * applied by {@link normaliseCombatPatch} instead.
 */
export const combatPatchSchema = z
  .strictObject({
    currentHitPoints: z.number().int().min(0).max(999).optional(),
    temporaryHitPoints: z.number().int().min(0).max(999).optional(),
    spellSlots: z
      .record(z.string().regex(/^[1-9]$/, 'Spell levels run from 1 to 9'), slotPool)
      .optional(),
    conditions: z.array(z.string().min(1)).max(CONDITION_LIMIT).optional(),
    deathSaveSuccesses: z.number().int().min(0).max(DEATH_SAVE_LIMIT).optional(),
    deathSaveFailures: z.number().int().min(0).max(DEATH_SAVE_LIMIT).optional(),
  })
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
