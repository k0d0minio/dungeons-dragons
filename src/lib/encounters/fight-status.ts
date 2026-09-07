// Where a fight has got to, in the two sentences the Play tab prints
// (`dm-chronology/play-tab`).
//
// The tracker knows this by rendering the whole initiative order; the Play tab
// has one row per fight and has to say the same thing in a line. Pure, and
// given the combatants already in initiative order, so the row and the tracker
// cannot disagree about whose turn it is — and so a test can ask.

/** The least a Play row needs of a combatant. Never hit points (D24's rule). */
export interface FightCombatant {
  label: string
  initiative: number | null
}

/** The stepper's state, straight off the encounter row. */
export interface FightProgress {
  round: number
  activeTurn: number
}

/**
 * True when this fight is **on the table** rather than merely built.
 *
 * Both states are `completed_at null`, so the column alone cannot separate a
 * fight that is being run from one assembled on a Tuesday for a Thursday. What
 * separates them is initiative: a fight starts when the DM goes round the table
 * asking for numbers. The round and turn counters are in the test as well
 * because a fight can be stepped past its first turn before anyone's initiative
 * is typed in, and a fight in round 3 is plainly not waiting to be started.
 */
export function fightHasStarted(
  progress: FightProgress,
  combatants: readonly FightCombatant[],
): boolean {
  if (progress.round > 1 || progress.activeTurn > 0) return true

  return combatants.some((combatant) => combatant.initiative !== null)
}

/**
 * Whose turn it is, by name, or `null` for a fight with nobody in it.
 *
 * `activeTurn` is a 0-based index into the order as sorted, and the tracker
 * clamps it rather than storing a corrected value, so this clamps it the same
 * way — a combatant removed mid-round must not blank the row.
 */
export function whoseTurn(
  progress: FightProgress,
  combatants: readonly FightCombatant[],
): string | null {
  if (combatants.length === 0) return null

  return combatants[Math.min(Math.max(progress.activeTurn, 0), combatants.length - 1)].label
}

/**
 * The line under a live fight's name — "Round 2 · Aldric’s turn".
 *
 * The round on its own for a fight with no combatants left in it, which is what
 * the tracker shows too: there is nobody to be up.
 */
export function fightLine(progress: FightProgress, combatants: readonly FightCombatant[]): string {
  const up = whoseTurn(progress, combatants)

  return up === null ? `Round ${progress.round}` : `Round ${progress.round} · ${up}’s turn`
}
