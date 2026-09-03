// Milestone levelling (D35, `dm-run-suite/milestone-leveling`).
//
// Jamie's table levels by story, not by arithmetic: at the end of a session the
// DM says "you are level 4", and everyone is. The whole of that is **one number
// on the campaign** — `campaigns.milestone_level` — and three rules keep it one
// number rather than a bookkeeping system:
//
// - **One write, never a fan-out.** The DM's tap updates the campaign row and
//   nothing else. `neon-http` has no transactions (D17), so a loop writing six
//   characters can half-apply — three levelled, three not, and nothing to undo
//   it with. The campaign column cannot be half-written.
// - **"A level is waiting" is derived, never stored.** It is the comparison
//   `character.level < milestoneLevel`, asked at render time. There is no
//   pending-level column, no flag to clear, and nothing that can drift from the
//   sheet it describes — the register's "nothing derived is stored" rule,
//   applied to the one place a fan-out was tempting.
// - **Nothing here writes `characters.level`.** The milestone is a *nudge* to
//   the planner, exactly as an XP threshold was (DND-055): levelling up in 5e
//   is a page of choices — hit points, spells, resources, a subclass at 3 — and
//   the app does not get to make them. Each player walks the DND-032 planner at
//   their own pace, and a character three levels behind is offered one step,
//   not three.
//
// Pure, like `gates.ts` beside it: no fetch, no clock, no React.
import { clampCharacterLevel, MAX_CHARACTER_LEVEL, MIN_CHARACTER_LEVEL } from '../characters/rules'

/**
 * Read an unknown value as a milestone level.
 *
 * `null` for anything that is not a whole level in range — including `null`
 * itself, which is how the DM's control says "we do not use milestones". A
 * clamp would be wrong here: a body carrying `50` is a broken client, and
 * silently storing 20th level for it would hand five phones a level-up prompt
 * nobody asked for. Refusing is the route's job; this just says what the value
 * is.
 */
export function parseMilestoneLevel(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < MIN_CHARACTER_LEVEL || value > MAX_CHARACTER_LEVEL) return null

  return value
}

/**
 * The milestone across every campaign one character is on — the highest, or
 * `null` when no table has set one.
 *
 * The union, for `resolveGates`' reason: one character has one sheet. A player
 * whose Thursday DM has called level 4 and whose Sunday DM has said nothing is
 * owed the level their Thursday table gave them, and the cost of being wrong
 * this way is a prompt they can ignore — the cost of the other way is a level
 * they have earned going unmentioned.
 *
 * Values the column should not hold (a hand-run `UPDATE` past the CHECK, an
 * older release) are dropped rather than clamped, the same way `parseGates`
 * drops a key it does not know.
 */
export function resolveMilestoneLevel(stored: readonly (number | null)[]): number | null {
  let highest: number | null = null

  for (const value of stored) {
    const level = parseMilestoneLevel(value)
    if (level !== null && (highest === null || level > highest)) highest = level
  }

  return highest
}

/**
 * Does this character have a level waiting? The derived comparison itself, in
 * one place so the sheet, the band and the DM's card cannot disagree about it.
 *
 * A character *above* the milestone is not a problem to report: a DM who moved
 * the number back down has corrected a mistake, and the app does not un-level
 * anybody (D35 writes one column; `characters.level` moves only through the
 * planner).
 */
export function isLevelUpWaiting(level: number, milestoneLevel: number | null): boolean {
  return milestoneLevel !== null && level < milestoneLevel
}

/** How many levels a character is behind, floored at 0 — for the band's words. */
export function levelsBehind(level: number, milestoneLevel: number | null): number {
  if (!isLevelUpWaiting(level, milestoneLevel)) return 0

  return (milestoneLevel as number) - level
}

/** One character, as the DM's milestone card reads the party. */
export interface MilestoneMember {
  level: number
}

/** What the DM's card says about the party under the milestone it is showing. */
export interface PartyMilestoneStanding {
  /** Characters on the roster at all — the denominator. */
  party: number
  /** How many have reached the milestone (or gone past it). */
  levelled: number
  /** How many still have a level waiting. */
  waiting: number
}

/**
 * The party's standing against a milestone.
 *
 * The DM's only feedback that the tap did anything: the write is instant and
 * invisible, and what happens next is six players opening their sheets over the
 * following week. "4 of 6 have levelled up" is that week, on one line.
 */
export function partyMilestoneStanding(
  party: readonly MilestoneMember[],
  milestoneLevel: number | null,
): PartyMilestoneStanding {
  const waiting = party.filter((member) => isLevelUpWaiting(member.level, milestoneLevel)).length

  return { party: party.length, levelled: party.length - waiting, waiting }
}

/**
 * The level to offer next — what the card's one button is labelled with.
 *
 * From the milestone when there is one, and otherwise from the party itself: a
 * DM setting this for the first time mid-campaign has characters at some level
 * already, and being offered "the party reaches level 2" for a party of 3rd
 * level characters would be an obviously wrong first impression. `null` at the
 * ceiling — 20th level is the top of the table and there is nothing to offer.
 */
export function nextMilestoneLevel(
  party: readonly MilestoneMember[],
  milestoneLevel: number | null,
): number | null {
  const from =
    milestoneLevel ??
    party.reduce(
      (highest, member) => Math.max(highest, clampCharacterLevel(member.level)),
      MIN_CHARACTER_LEVEL,
    )

  return from >= MAX_CHARACTER_LEVEL ? null : from + 1
}
