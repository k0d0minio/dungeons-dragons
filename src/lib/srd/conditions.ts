// The fifteen SRD 5.2.1 conditions, local (`srd-2024-migration/srd-data-layer`).
//
// Exhaustion is one of the fifteen and behaves unlike the rest: it stacks, and
// in 2024 each level is a flat −2 to every D20 Test rather than the 2014
// ladder of distinct effects. The two constants below are that rule in the form
// a sheet needs, so nothing has to parse the condition's prose to apply it.
import data from './data/conditions.json'
import { collection } from './lookup'
import type { SrdCondition } from './types'

export const CONDITIONS = collection(data as SrdCondition[])

/** The Exhaustion level at which a character dies. */
export const MAX_EXHAUSTION_LEVEL = 6

/** Penalty applied to every D20 Test per Exhaustion level, and speed lost per level in feet. */
export const EXHAUSTION_D20_PENALTY_PER_LEVEL = -2
export const EXHAUSTION_SPEED_PENALTY_PER_LEVEL = 5

/**
 * The modifier Exhaustion applies to a D20 Test at `level` — `-2` per level,
 * clamped to the 0–6 the condition defines. A character at 6 is dead, but the
 * penalty is still well-defined there rather than unbounded.
 */
export function exhaustionD20Penalty(level: number): number {
  const levels = clampExhaustion(level)
  // Short-circuited at zero because `0 * -2` is `-0`, which a sheet that prints
  // a signed modifier renders as "-0".
  return levels === 0 ? 0 : levels * EXHAUSTION_D20_PENALTY_PER_LEVEL
}

/** The speed reduction in feet Exhaustion applies at `level`. */
export function exhaustionSpeedPenalty(level: number): number {
  return clampExhaustion(level) * EXHAUSTION_SPEED_PENALTY_PER_LEVEL
}

function clampExhaustion(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.min(MAX_EXHAUSTION_LEVEL, Math.max(0, Math.floor(level)))
}
