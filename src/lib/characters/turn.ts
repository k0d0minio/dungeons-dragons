// What one turn is made of, per character (`first-table/your-turn-card`).
//
// Every source the research found wants the same artefact in front of a
// beginner, and it is per-character rather than generic: how far they move,
// the attack written the way the DM says it out loud, *the* bonus action their
// class or a prepared spell gives them, *the* reaction, and whether their
// spells are cantrips or slots. The attack line is the walkthrough module's;
// this file answers the two questions the data layer already holds the
// answer to but nothing on the sheet asks — which of this character's
// features and spells are a bonus action, and which are a reaction.
//
// Both are read from the SRD text rather than from a hand-kept table: a class
// feature's description says "As a Bonus Action" when it is one, and a spell
// row carries its casting time as one of six exact phrases. `turn.test.ts`
// pins the level-1 answer for every class against the real data, so a
// regeneration that re-words a feature fails CI instead of quietly dropping
// Second Wind off the fighter's card.
import type { SpellSlotState } from '@/lib/db/schema'
import { classFeaturesUpTo } from '@/lib/srd/classes'
import { SPELLS } from '@/lib/srd/spells'

/** One thing a character can do with a bonus action or a reaction. */
export interface TurnOption {
  name: string
  /** A class feature, a prepared spell, or the rule everyone has. */
  source: 'feature' | 'spell' | 'rule'
  /** The spell's SRD index, for a tap through to its text. */
  spellIndex?: string
  /** When it happens, for a reaction — the spell's own condition, or the rule's. */
  when?: string
}

/** The one reaction every character has, whatever else they carry. */
export const OPPORTUNITY_ATTACK: TurnOption = {
  name: 'Opportunity Attack',
  source: 'rule',
  when: 'when an enemy you can reach walks away from you',
}

const BONUS_ACTION = /\bBonus Action\b/

function classBonusActions(classIndex: string, level: number): TurnOption[] {
  return classFeaturesUpTo(classIndex, level)
    .filter((feature) => BONUS_ACTION.test(feature.description))
    .map((feature) => ({ name: feature.name, source: 'feature' as const }))
}

function spellsWithCastingTime(
  spellIndexes: readonly string[],
  castingTime: 'Bonus Action' | 'Reaction',
): TurnOption[] {
  const seen = new Set<string>()
  const options: TurnOption[] = []

  for (const index of spellIndexes) {
    if (seen.has(index)) continue
    seen.add(index)
    const spell = SPELLS.get(index)
    if (!spell || spell.castingTime !== castingTime) continue
    options.push({
      name: spell.name,
      source: 'spell',
      spellIndex: spell.index,
      ...(spell.reactionCondition ? { when: spell.reactionCondition } : {}),
    })
  }

  return options
}

/**
 * The spells a character can actually cast tonight: what they have prepared,
 * or — for a row with nothing prepared yet, which is every character made
 * before the wizard wrote the day-one list — what they know.
 *
 * Cantrips are never prepared (D22): the wizard writes them to the known list
 * alone, so a row with a day's spells prepared keeps its known cantrips here —
 * otherwise a druid with Cure Wounds prepared would lose Produce Flame and
 * Shillelagh, the SRD's two bonus-action cantrips, from the card while the
 * Spells segment still offered them.
 */
export function castableSpellIndexes(character: {
  preparedSpellIndexes: readonly string[]
  knownSpellIndexes: readonly string[]
}): readonly string[] {
  if (character.preparedSpellIndexes.length === 0) return character.knownSpellIndexes

  const cantrips = character.knownSpellIndexes.filter((index) => SPELLS.get(index)?.level === 0)
  return Array.from(new Set([...cantrips, ...character.preparedSpellIndexes]))
}

/**
 * The bonus actions this character has: class features first (Rage, Second
 * Wind, Bardic Inspiration, Lay On Hands…), then the spells they can cast
 * with one (Healing Word, Hex, Hunter's Mark…). Empty for a character with
 * none yet — most of them, at level 1.
 */
export function bonusActions(character: {
  classIndex: string
  level: number
  preparedSpellIndexes: readonly string[]
  knownSpellIndexes: readonly string[]
}): TurnOption[] {
  return [
    ...classBonusActions(character.classIndex, character.level),
    ...spellsWithCastingTime(castableSpellIndexes(character), 'Bonus Action'),
  ]
}

/**
 * The reactions this character has: the Opportunity Attack everyone gets,
 * then the spells they can cast as one (Shield, Hellish Rebuke, Feather
 * Fall). Never empty.
 */
export function reactions(character: {
  preparedSpellIndexes: readonly string[]
  knownSpellIndexes: readonly string[]
}): TurnOption[] {
  return [OPPORTUNITY_ATTACK, ...spellsWithCastingTime(castableSpellIndexes(character), 'Reaction')]
}

/** True when the character knows at least one cantrip — the "always" half of the spells line. */
export function hasCantrips(knownSpellIndexes: readonly string[]): boolean {
  return knownSpellIndexes.some((index) => SPELLS.get(index)?.level === 0)
}

/**
 * How many spell slots are left across every level, or `null` for a character
 * whose sheet has no slots at all — the card prints no slot line for them,
 * rather than a zero that reads as "you spent them".
 */
export function slotsLeft(spellSlots: SpellSlotState): number | null {
  const pools = Object.values(spellSlots).filter((pool) => pool.max > 0)
  if (pools.length === 0) return null
  return pools.reduce((left, pool) => left + Math.max(0, pool.max - pool.used), 0)
}
