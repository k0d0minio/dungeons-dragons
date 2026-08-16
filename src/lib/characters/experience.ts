// Experience points and the levels they buy (DND-055).
//
// Pure, like `rules.ts` and `combat.ts` beside it — no fetch, no clock, no
// React — and static rather than fetched from `/api/dnd5e/classes/*/levels`.
// The table below has not changed since 2014, and "have I levelled?" is a
// question asked while five people are waiting, not one to spend a network
// round trip on.
//
// Nothing here writes a level. Crossing a threshold is a *nudge* — the
// character's `level` still only moves through the DND-032 planner, because a
// level-up in 5e is a set of choices (hit points, spells, resources) and not
// an increment.
import { clampCharacterLevel, MAX_CHARACTER_LEVEL, MIN_CHARACTER_LEVEL } from './rules'

/**
 * The XP total each character level begins at — SRD 5.1, the same table
 * printed in `docs/rules/03-character-creation.md`. Index 0 is 1st level, so
 * `EXPERIENCE_THRESHOLDS[level - 1]` is the cost of `level`.
 */
export const EXPERIENCE_THRESHOLDS: readonly number[] = [
  0, // 1
  300, // 2
  900, // 3
  2_700, // 4
  6_500, // 5
  14_000, // 6
  23_000, // 7
  34_000, // 8
  48_000, // 9
  64_000, // 10
  85_000, // 11
  100_000, // 12
  120_000, // 13
  140_000, // 14
  165_000, // 15
  195_000, // 16
  225_000, // 17
  265_000, // 18
  305_000, // 19
  355_000, // 20
]

/**
 * The most XP one character may hold. Well past 20th level's 355,000, because
 * a table that keeps awarding after the level ceiling is playing correctly —
 * the XP just stops buying anything. Far under `integer`'s real ceiling for the
 * same reason the currency columns are: "9,999,999" is a better error than an
 * int4 overflow.
 */
export const MAX_EXPERIENCE = 9_999_999

/** The XP total `level` begins at. Levels outside 1–20 clamp into range. */
export function experienceForLevel(level: number): number {
  return EXPERIENCE_THRESHOLDS[clampCharacterLevel(level) - 1]
}

/**
 * The level `experience` has earned: the highest whose threshold it has
 * reached. A negative total reads as 1st level rather than throwing — the same
 * call `clampCharacterLevel` makes, and for the same reason.
 */
export function levelForExperience(experience: number): number {
  const total = Math.floor(experience)

  for (let level = MAX_CHARACTER_LEVEL; level > MIN_CHARACTER_LEVEL; level -= 1) {
    if (total >= EXPERIENCE_THRESHOLDS[level - 1]) return level
  }

  return MIN_CHARACTER_LEVEL
}

/**
 * The XP total the *next* level costs, or `null` at 20th — where there is no
 * next level, so a progress bar has nothing to fill towards.
 */
export function nextLevelThreshold(level: number): number | null {
  const current = clampCharacterLevel(level)
  return current >= MAX_CHARACTER_LEVEL ? null : EXPERIENCE_THRESHOLDS[current]
}

/** Everything the sheet's XP row renders, from the two columns it has. */
export interface ExperienceProgress {
  /** The XP total, floored and held inside 0…{@link MAX_EXPERIENCE}. */
  experience: number
  /** The level the character actually is — their `level` column. */
  level: number
  /** The level that much XP has earned, which may be ahead of `level`. */
  earnedLevel: number
  /** True when XP has outrun the sheet: the nudge, never an auto-level. */
  levelAvailable: boolean
  /** What the next level costs, or `null` at 20th. */
  nextThreshold: number | null
  /** XP still to earn before the next level, or `null` at 20th. */
  remaining: number | null
  /** How far through the current level's XP band, 0–1. 1 at 20th. */
  fraction: number
}

/**
 * Read an XP total against the level the character is written down as.
 *
 * The two can disagree in both directions, and both are legitimate: XP ahead of
 * the level is a level-up nobody has sat down to do yet (the nudge), and a
 * level ahead of the XP is a table that levelled by story and started counting
 * afterwards. Neither is corrected here — this function reports, it does not
 * reconcile.
 *
 * The band a progress bar fills is measured against the *earned* level rather
 * than the written one, so a character sitting on an unspent level-up shows a
 * bar creeping towards the level after it instead of a full one that has been
 * full for three sessions.
 */
export function experienceProgress(experience: number, level: number): ExperienceProgress {
  const total = Math.min(MAX_EXPERIENCE, Math.max(0, Math.floor(experience)))
  const current = clampCharacterLevel(level)
  const earnedLevel = levelForExperience(total)
  const nextThreshold = nextLevelThreshold(earnedLevel)

  if (nextThreshold === null) {
    return {
      experience: total,
      level: current,
      earnedLevel,
      levelAvailable: earnedLevel > current,
      nextThreshold: null,
      remaining: null,
      fraction: 1,
    }
  }

  const floor = experienceForLevel(earnedLevel)
  const span = nextThreshold - floor

  return {
    experience: total,
    level: current,
    earnedLevel,
    levelAvailable: earnedLevel > current,
    nextThreshold,
    remaining: Math.max(0, nextThreshold - total),
    fraction: Math.min(1, Math.max(0, (total - floor) / span)),
  }
}

/**
 * Add an award to a total, as an absolute new total.
 *
 * Deltas are what a DM says out loud ("take 175 each") and absolutes are what
 * the wire carries — every write in this app sends the value it wants, never
 * the change (see `combat.ts`), so two awards landing out of order settle on a
 * number rather than compounding. This is the one place that turns one into
 * the other. A `null` total — a character nobody was counting XP for — starts
 * at zero, so the first award is what opts them in.
 *
 * Negative amounts are allowed: a mis-tapped award is corrected by awarding it
 * back, and the total floors at zero.
 */
export function experienceAfterAward(experience: number | null, amount: number): number {
  const from = experience === null ? 0 : Math.max(0, Math.floor(experience))
  return Math.min(MAX_EXPERIENCE, Math.max(0, from + Math.floor(amount)))
}

/** An XP total as a sheet prints it: grouped, so 14000 reads as 14,000. */
export function formatExperience(experience: number): string {
  return experience.toLocaleString('en-GB')
}
