// The order the monster pickers show (`triage/encounter-builder-monster-order`).
//
// Both pickers — the builder's "Monsters" card and the tracker's mid-fight Add
// — filter 331 stat blocks by name and then show the first twenty. The filter
// was the only ordering, so the list arrived in the SRD's alphabetical order:
// Aboleth (CR 10), then every adult and ancient dragon, CR 10–24, twenty rows
// deep, to a DM whose party is level 1 and who has not typed anything yet.
//
// Cheapest honest fix, and the one this module is: order by challenge rating
// ascending, so the twenty rows a DM sees before typing are the twenty
// weakest things in the SRD. Goblins first.
//
// Pure and separate from the components for the same reason `budget.ts` is:
// the truncation is what makes order load-bearing — a row sorted below
// twentieth is not merely lower down, it is not on the screen — and that is
// worth a test that does not need a browser.

import { searchByName } from '@/lib/srd/hooks'

/** Enough rows to find any monster by typing; the SRD list has 331. */
export const MONSTER_RESULT_LIMIT = 20

/** What ordering needs off a monster list row, whatever else the row carries. */
export interface PickableMonster {
  name: string
  /** Numeric CR — 0.25 for a 1/4 stat block, not the `'1/4'` display text. */
  challengeRating: number
}

/**
 * Weakest first, then alphabetical.
 *
 * The tie-break matters more than the sort: whole bands of the SRD share a CR
 * (fourteen things sit at 1/4), and without a second key their order would be
 * whatever the source file happened to hold. A missing or non-numeric CR sorts
 * last rather than first — an unpriceable stat block is not a safe suggestion
 * for a level-1 table.
 */
function byThreatThenName(a: PickableMonster, b: PickableMonster): number {
  const crA = Number.isFinite(a.challengeRating) ? a.challengeRating : Number.POSITIVE_INFINITY
  const crB = Number.isFinite(b.challengeRating) ? b.challengeRating : Number.POSITIVE_INFINITY
  if (crA !== crB) return crA - crB
  return a.name.localeCompare(b.name, 'en-GB')
}

/**
 * The rows a picker should render: name filter, weakest first, then the cap.
 *
 * Filtering, sorting and slicing are one function rather than three steps at
 * each call site because the bug this fixes was a slice applied to an unsorted
 * list. A caller that can compose them in the wrong order eventually will, and
 * there are two callers.
 *
 * A typed query is ordered the same way. A search is truncated too, so "dragon"
 * with an alphabetical order is the original complaint in miniature — twenty
 * adults and ancients, no wyrmlings — and one rule is also one thing to
 * explain.
 */
export function monsterPickerRows<T extends PickableMonster>(
  monsters: readonly T[],
  query: string,
  limit: number = MONSTER_RESULT_LIMIT,
): T[] {
  return searchByName([...monsters], query)
    .sort(byThreatThenName)
    .slice(0, limit)
}
