// The four SRD 5.2.1 backgrounds, local (`srd-2024-migration/srd-data-layer`).
//
// A 2024 background is the mechanical origin: it is where a character's ability
// score increases come from, and it grants an Origin feat, two skills and a
// tool. That is the single biggest data-model change in the migration — a
// creation flow that asks for a species first is asking the flavour question
// before the mechanical one.
import data from './data/backgrounds.json'
import { collection } from './lookup'
import type { AbilityKey } from '@/lib/characters/schema'
import type { SrdBackground } from './types'

export const BACKGROUNDS = collection(data as SrdBackground[])

/**
 * The two ways the SRD lets a background's ability score increases be spent:
 * +2 to one of its three abilities and +1 to another, or +1 to each of the
 * three. Both are always available; the player picks one.
 */
export const BACKGROUND_ABILITY_SPREADS = [
  { key: 'two-and-one', label: '+2 and +1', increases: [2, 1] },
  { key: 'one-each', label: '+1 to each', increases: [1, 1, 1] },
] as const

export type BackgroundAbilitySpread = (typeof BACKGROUND_ABILITY_SPREADS)[number]['key']

/**
 * True when `abilities` is a legal way to spend a background's increases: the
 * right number of abilities, all distinct, all drawn from the background's own
 * three. Returns false for an unknown background — a rule this build cannot
 * check is not a rule it should claim was satisfied.
 */
export function isValidBackgroundAbilityChoice(
  backgroundIndex: string,
  spread: BackgroundAbilitySpread,
  abilities: readonly AbilityKey[],
): boolean {
  const background = BACKGROUNDS.get(backgroundIndex)
  if (!background) return false
  const expected = BACKGROUND_ABILITY_SPREADS.find((option) => option.key === spread)
  if (!expected || abilities.length !== expected.increases.length) return false
  if (new Set(abilities).size !== abilities.length) return false
  return abilities.every((ability) => background.abilityScores.includes(ability))
}
