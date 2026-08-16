// Rests and recovery (DND-033), as pure transitions over a character row.
//
// The rules are `docs/rules/09-adventuring.md` §Resting — the "what recovers
// on which rest" table — followed rather than remembered. Like `combat.ts`,
// everything here is pure and absolute: a rest computes the state the row
// should hold afterwards, the sheet applies it optimistically and PATCHes the
// result, and `normaliseCombatPatch` re-clamps it server-side.
//
// Multiclassing is out (D15): the hit dice pool is one die per character
// level, sized by the single class's hit die.
import type { Character, ClassResource, SpellSlotState } from '@/lib/db/schema'

import { abilityModifier } from './display'
import { clampCharacterLevel, hitDie, spellcastingKind } from './rules'

/**
 * The columns a rest reads. A `Character` row satisfies it; so does the
 * sheet's working copy.
 */
export type RestFields = Pick<
  Character,
  | 'classIndex'
  | 'level'
  | 'constitution'
  | 'maxHitPoints'
  | 'currentHitPoints'
  | 'hitDiceUsed'
  | 'exhaustion'
  | 'spellSlots'
  | 'classResources'
>

/** One hit die spent on a short rest: what the physical die showed. */
export interface SpentHitDie {
  rolled: number
}

/** Hit dice not yet spent: one per level, minus what rests have used. */
export function hitDiceRemaining(character: Pick<Character, 'level' | 'hitDiceUsed'>): number {
  return Math.max(0, clampCharacterLevel(character.level) - Math.max(0, character.hitDiceUsed))
}

/** Every pool with nothing spent — what a long rest leaves the slots as. */
function restoredSlots(spellSlots: SpellSlotState): SpellSlotState {
  const restored: SpellSlotState = {}

  for (const [level, slot] of Object.entries(spellSlots)) {
    restored[level] = { max: slot.max, used: 0 }
  }

  return restored
}

function restoredResources(
  resources: ClassResource[],
  recharges: readonly ClassResource['recharge'][],
): ClassResource[] {
  return resources.map((resource) =>
    recharges.includes(resource.recharge) ? { ...resource, used: 0 } : resource,
  )
}

/** What a long rest writes. Every field is sheet-owned live state. */
export interface LongRestPatch {
  currentHitPoints: number
  temporaryHitPoints: number
  hitDiceUsed: number
  exhaustion: number
  spellSlots: SpellSlotState
  classResources: ClassResource[]
  deathSaveSuccesses: number
  deathSaveFailures: number
}

/**
 * A long rest, per SRD 5.1 (`docs/rules/09-adventuring.md`):
 *
 * - all hit points back;
 * - temporary hit points gone — the SRD lists "after a long rest" among the
 *   ways temp HP end (`docs/rules/05-combat.md` §Temporary hit points), so
 *   zeroing them here is the rule, not a house ruling;
 * - spent hit dice regained up to half the total, minimum one;
 * - every spell slot back, pact magic included (the table's warlock row);
 * - class resources with any rest recharge refilled — a short-rest pool
 *   refills on a long rest too; `'manual'` pools are left alone (D23);
 * - exhaustion down one level, floor zero;
 * - death saves cleared — a character at full hit points has no track.
 */
export function longRest(character: RestFields): LongRestPatch {
  const level = clampCharacterLevel(character.level)
  const regained = Math.max(1, Math.floor(level / 2))

  return {
    currentHitPoints: character.maxHitPoints,
    temporaryHitPoints: 0,
    hitDiceUsed: Math.max(0, Math.min(level, character.hitDiceUsed) - regained),
    exhaustion: Math.max(0, Math.min(6, character.exhaustion) - 1),
    spellSlots: restoredSlots(character.spellSlots),
    classResources: restoredResources(character.classResources, ['short-rest', 'long-rest']),
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
  }
}

/** What a short rest writes. `spellSlots` only changes for a pact caster. */
export interface ShortRestPatch {
  currentHitPoints: number
  hitDiceUsed: number
  spellSlots: SpellSlotState
  classResources: ClassResource[]
}

/**
 * A short rest, per the same table: spend hit dice for healing, and refill
 * what an hour's breather refills.
 *
 * - each die spent heals what it rolled plus the Constitution modifier, never
 *   less than zero per die — a bad roll on a frail character wastes the die,
 *   it does not wound them;
 * - only as many dice apply as the character has left (`level - hitDiceUsed`);
 *   extras are ignored entirely, healing included;
 * - healing stops at the maximum;
 * - pact magic slots refill — the one slot pool that returns on a *short*
 *   rest, which is why the warlock's `spellcastingKind` is checked rather
 *   than a marker per pool: a warlock's stored slots are all pact slots (D15,
 *   single class);
 * - class resources with a `'short-rest'` recharge refill;
 * - exhaustion, temporary hit points and death saves do not move.
 *
 * Rolled values are clamped to what the class's hit die can actually show
 * (1..die); an unknown class's die accepts the roll as typed.
 */
export function shortRest(
  character: RestFields,
  spentDice: readonly SpentHitDie[],
): ShortRestPatch {
  const level = clampCharacterLevel(character.level)
  const alreadyUsed = Math.max(0, Math.min(level, character.hitDiceUsed))
  const spendable = spentDice.slice(0, level - alreadyUsed)

  const die = hitDie(character.classIndex)
  const constitution = abilityModifier(character.constitution)

  const healed = spendable.reduce((total, { rolled }) => {
    const shown = Math.max(1, Math.floor(rolled))
    const clamped = die === null ? shown : Math.min(die, shown)

    return total + Math.max(0, clamped + constitution)
  }, 0)

  const isPactCaster = spellcastingKind(character.classIndex) === 'pact'

  return {
    currentHitPoints: Math.min(character.maxHitPoints, character.currentHitPoints + healed),
    hitDiceUsed: alreadyUsed + spendable.length,
    spellSlots: isPactCaster ? restoredSlots(character.spellSlots) : character.spellSlots,
    classResources: restoredResources(character.classResources, ['short-rest']),
  }
}
