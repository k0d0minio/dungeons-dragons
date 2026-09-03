// The 2024 encounter XP budget (`dm-prep-suite/encounter-builder`).
//
// Pure, like `tracker.ts` and `experience.ts` beside it, and for the same
// reason: this is the number a new DM trusts when deciding whether tonight's
// fight can kill somebody, and it has to be testable without a browser.
//
// The whole 2024 method, from `docs/rules/10-dm-guide.md` § Encounter building:
// look up the XP budget **per character** at each character's level, add those
// up, and compare the monsters' listed XP to the total. There is no multiplier
// table any more — no ×1.5 for four monsters, no ×2 for eight. Summing and
// comparing is the entire calculation, which is why this module is a table and
// four small functions rather than a rules engine.
//
// It reads nothing and writes nothing. `budget.ts` prices a fight the DM is
// still assembling; `experience.ts` prices one that has been fought. They stay
// separate because a builder's monster lines ("four goblins") and a tracker's
// combatant rows (four goblin rows) are different shapes, and folding them into
// one function would mean one of the two callers converting to the other's.

/** The three budgets the 2024 rules name, per character, at one level. */
export interface XpBudget {
  low: number
  moderate: number
  high: number
}

/**
 * SRD 5.2.1 / 2024 DMG "Encounter XP Budgets", indexed by character level.
 *
 * Transcribed from `docs/rules/10-dm-guide.md`, which is this repo's copy of
 * the table — not from a monster's CR, and not derived from anything. A budget
 * is a flat lookup, so this is a flat array; index 0 is a placeholder so that
 * `BUDGET_BY_LEVEL[3]` is the level-3 row and nobody has to remember an offset.
 */
const BUDGET_BY_LEVEL: readonly XpBudget[] = [
  { low: 0, moderate: 0, high: 0 }, // level 0 — not a level; see LEVEL_RANGE.
  { low: 50, moderate: 75, high: 100 },
  { low: 100, moderate: 150, high: 200 },
  { low: 150, moderate: 225, high: 400 },
  { low: 250, moderate: 375, high: 500 },
  { low: 500, moderate: 750, high: 1100 },
  { low: 600, moderate: 1000, high: 1400 },
  { low: 750, moderate: 1300, high: 1700 },
  { low: 1000, moderate: 1700, high: 2100 },
  { low: 1300, moderate: 2000, high: 2600 },
  { low: 1600, moderate: 2300, high: 3100 },
  { low: 1900, moderate: 2900, high: 4100 },
  { low: 2200, moderate: 3700, high: 4700 },
  { low: 2600, moderate: 4200, high: 5400 },
  { low: 2900, moderate: 4900, high: 6200 },
  { low: 3300, moderate: 5400, high: 7800 },
  { low: 3800, moderate: 6100, high: 9800 },
  { low: 4500, moderate: 7200, high: 11700 },
  { low: 5000, moderate: 8700, high: 14200 },
  { low: 5500, moderate: 10700, high: 17200 },
  { low: 6400, moderate: 13200, high: 22000 },
]

/** The levels the table defines, and the levels this app's characters have. */
export const LEVEL_RANGE = { min: 1, max: 20 } as const

/**
 * One character's budget at `level`.
 *
 * Out-of-range levels clamp rather than throwing or returning zero. A level
 * this build has never heard of is a data problem, and the two wrong answers
 * available are "the hardest fight you can imagine is free" (zero) and "a
 * blank readout" (throw) — clamping gives the level-20 row for a level-25 row,
 * which is wrong by a knowable amount and still warns the DM about a big fight.
 */
export function budgetForLevel(level: number): XpBudget {
  const clamped = Math.min(
    LEVEL_RANGE.max,
    Math.max(LEVEL_RANGE.min, Math.floor(Number.isFinite(level) ? level : LEVEL_RANGE.min)),
  )
  return BUDGET_BY_LEVEL[clamped]
}

/**
 * The party's three budgets: each attending character's own row, added up.
 *
 * The rules say "multiply by the number of characters", which assumes one
 * level for the whole party. Summing per character is the same arithmetic for
 * an even party and the honest generalisation for an uneven one — a level-5
 * character in a level-3 party brings their own 500/750/1100, not a fifth of
 * some average. No party is an empty budget, not a division by zero.
 */
export function partyBudget(levels: readonly number[]): XpBudget {
  return levels.reduce<XpBudget>(
    (total, level) => {
      const each = budgetForLevel(level)
      return {
        low: total.low + each.low,
        moderate: total.moderate + each.moderate,
        high: total.high + each.high,
      }
    },
    { low: 0, moderate: 0, high: 0 },
  )
}

/**
 * How many *distinct* stat blocks one encounter can be built from.
 *
 * Not a rules limit — a comfort one. Each line costs the create request one
 * round trip (`neon-http` has no transactions, so the seeding is a sequence of
 * inserts), and a fight of more than a dozen different creatures is not a fight
 * anyone runs off a phone. `MAX_MONSTER_INSTANCES` below caps how many of *one*
 * of them a line may hold.
 */
export const MAX_MONSTER_LINES = 12

/**
 * How many instances of *one* stat block a line may hold.
 *
 * Shared by the builder's stepper and the create route's schema so the two
 * cannot disagree about what is submittable. The data layer clamps to its own
 * `MAX_MONSTER_BATCH` on top of this, which is a backstop rather than a second
 * opinion: a mismatch there would mint fewer goblins than asked for, never a
 * failed insert.
 */
export const MAX_MONSTER_INSTANCES = 20

/** One monster line as the builder holds it: a stat block and how many of it. */
export interface MonsterLine {
  /** SRD monster index, e.g. `'goblin-warrior'`. */
  index: string
  name: string
  count: number
  /** The stat block's listed XP — what the budget is spent in. */
  experiencePoints: number
}

/**
 * What the lines cost: count × listed XP, added up.
 *
 * Per instance, exactly as `totalMonsterExperience` counts a fought encounter
 * — four goblins are four times fifty — because the budget and the award are
 * spent and earned in the same currency. Nonsense in a line (a negative count,
 * a NaN price) contributes nothing rather than poisoning the total: this is a
 * live readout under a DM's thumb, and a single bad row must not blank it.
 */
export function totalLineExperience(lines: readonly MonsterLine[]): number {
  return lines.reduce((total, line) => {
    const count = Math.floor(line.count)
    const xp = Math.floor(line.experiencePoints)
    if (!Number.isFinite(count) || !Number.isFinite(xp) || count <= 0 || xp < 0) return total
    return total + count * xp
  }, 0)
}

/**
 * Which band a total falls in.
 *
 * `empty` is no monsters at all and `under` is monsters that do not reach the
 * Low budget — two states the rules do not name but a builder must, because
 * "no fight yet" and "a fight the party will not notice" are different things
 * to tell a DM. The three named bands are half-open from below and closed at
 * the top: spending exactly the High budget is a High fight.
 */
export type DifficultyBand = 'empty' | 'under' | 'low' | 'moderate' | 'high'

/** The whole readout, as the builder's card renders it. */
export interface EncounterDifficulty {
  /** Every line's XP added up. */
  total: number
  /** The attending party's Low/Moderate/High budgets. */
  budget: XpBudget
  /** How many characters that budget was computed for. */
  partySize: number
  /**
   * The band `total` lands in, or `null` when nobody is attending — with no
   * party there is no budget, and a label would be a guess dressed as a number.
   */
  band: DifficultyBand | null
  /** XP spent above the High budget; 0 inside it. The warning's whole trigger. */
  overHighBy: number
}

/**
 * Price a fight against the party that will actually be at the table.
 *
 * `levels` is who is attending, not who is in the campaign — a 5–6 player
 * table rarely arrives whole, and a budget computed for six when four turn up
 * is exactly the reading that gets somebody killed. The builder's attendance
 * toggles are what fills this.
 */
export function encounterDifficulty(
  lines: readonly MonsterLine[],
  levels: readonly number[],
): EncounterDifficulty {
  const total = totalLineExperience(lines)
  const budget = partyBudget(levels)
  const partySize = levels.length

  if (partySize === 0) {
    return { total, budget, partySize, band: null, overHighBy: 0 }
  }

  const band: DifficultyBand =
    total === 0
      ? 'empty'
      : total >= budget.high
        ? 'high'
        : total >= budget.moderate
          ? 'moderate'
          : total >= budget.low
            ? 'low'
            : 'under'

  return { total, budget, partySize, band, overHighBy: Math.max(0, total - budget.high) }
}
