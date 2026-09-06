// Presentation helpers for the player's campaign view
// (`dm-run-suite/player-campaign-view`).
//
// Small functions shared by more than one of the page's cards, all pure so the
// cards themselves stay server components with nothing to test but their
// markup.
import { formatSessionDateLong } from '@/lib/notes/schema'

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

/**
 * "Thursday 10 September — Session 1 - Intro", or the title alone for a night
 * announced without a date (`first-table/announce-the-night`). One line, the
 * same on the campaign page and on the sheet's campaign card.
 */
export function formatAnnouncedNight(night: { title: string; sessionDate: string | null }): string {
  return night.sessionDate
    ? `${formatSessionDateLong(night.sessionDate)} — ${night.title}`
    : night.title
}

/**
 * Which announced night a player should be told about
 * (`first-table/announce-the-night`).
 *
 * The soonest dated night that is today or later; failing that, the night the
 * DM announced most recently — so a night announced without a date, or last
 * night's plan the morning after, still shows rather than the card going
 * blank the moment the date passes. `plans` is the public layer only (the
 * data layer selects nothing else), and `today` is `YYYY-MM-DD` in UTC, the
 * one clock every session date in this app is on.
 *
 * Pure and given the day, so the sheet and the campaign page pick the same
 * night for the same list, and a test can ask about a Thursday.
 */
export function nextNight<
  Plan extends { sessionDate: string | null; revealedAt: Date | string | null },
>(plans: readonly Plan[], today: string): Plan | null {
  const upcoming = plans
    .filter((plan): plan is Plan & { sessionDate: string } => plan.sessionDate !== null)
    .filter((plan) => plan.sessionDate >= today)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

  if (upcoming.length > 0) return upcoming[0]

  const stamp = (plan: Plan) =>
    plan.revealedAt === null ? Number.NEGATIVE_INFINITY : new Date(plan.revealedAt).getTime()

  return [...plans].sort((a, b) => stamp(b) - stamp(a))[0] ?? null
}
