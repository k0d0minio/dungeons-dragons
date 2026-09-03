// Presentation helpers for the player's campaign view
// (`dm-run-suite/player-campaign-view`).
//
// Two small functions, both shared by more than one of the page's cards, and
// both pure so the cards themselves stay server components with nothing to
// test but their markup.

/**
 * "3 Sep 2026" — when the party learned something.
 *
 * `revealed_at` is a `timestamptz` rather than a boolean precisely so this line
 * can exist (see the column's note in `schema.ts`), so the page spends it. The
 * time of day is dropped: what a player wants is which session this was, and
 * "at 20:47" is noise on a list of twelve NPCs.
 *
 * Fixed to `en-GB` and UTC rather than the reader's locale, matching
 * `formatSessionDate` — a party sharing one table should read one date, and a
 * server-rendered string that disagreed with the client's would hydrate
 * mismatched.
 */
export function formatDiscoveredOn(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The one or two letters that stand in for a face until there is one.
 *
 * Initials of the first two words, so "Vess Ondrel" is VO and "Grud" is G. A
 * name that is entirely punctuation or whitespace yields an empty string, and
 * the caller renders an empty circle rather than a broken one — the character
 * name check in the database makes that unreachable, but a fallback that
 * throws on the one row that slipped through is a worse bug than a blank.
 */
export function characterInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('')
    .toUpperCase()
}
