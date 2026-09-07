// The Sessions timeline, as words (`dm-chronology/sessions-tab`).
//
// Pure, and separate from `src/lib/db/session-log.ts` for the reason
// `src/lib/campaigns/session-log.ts` is separate from it: that file decides
// *what a night is*, this one decides *how a night reads* — the label above
// its row, the title on it, the line under that, and the chips that say what
// to do about it next. The half worth testing without a database in the room.
//
// The order is time, newest first, and the row's own words carry the state:
// "Upcoming", "Tonight", "Played". Colour is never the only signal here — the
// primary border on tonight's row is the second one, and the label is the
// first.
import type { CampaignNote } from '@/lib/db/schema'
import type { SessionLogEntry, SessionNight } from '@/lib/db/session-log'
import type { PlanTally } from '@/lib/db/session-plans'
import { isSessionDate } from '@/lib/notes/schema'

/**
 * "Wed 3 Sep" — a night's date on a timeline row.
 *
 * Shorter than `formatSessionDate`, which carries the year: a timeline is
 * already in order, so the year is noise on every row but the one where it
 * changes, and a phone-width row has three words of space. `en-GB` and UTC,
 * like every other date in this app, so a server-rendered label and the one
 * the client hydrates are the same string.
 */
export function formatNightDate(value: string, options?: { weekday?: boolean }): string {
  if (!isSessionDate(value)) return value

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    ...(options?.weekday === false ? {} : { weekday: 'short' }),
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

/**
 * The uppercase label above a night's row — what state it is in, and when.
 *
 * Tonight's drops the weekday: "Tonight" has already said which day it is, and
 * what the DM wants beside it is the date they will type into a recap. It also
 * says "open", because the one thing that distinguishes tonight from a played
 * night is that nothing has been closed yet.
 */
export function nightLabel(night: SessionNight): string {
  const when = night.date === null ? 'no date yet' : formatNightDate(night.date)

  switch (night.kind) {
    case 'upcoming':
      return `Upcoming · ${when}`
    case 'tonight':
      return `Tonight · ${night.date === null ? when : formatNightDate(night.date, { weekday: false })} · open`
    case 'played':
      return `Played · ${when}`
  }
}

/** The label on the row that is not a night: what happened before the first one. */
export function beforeLabel(date: string): string {
  return `Before · ${formatNightDate(date)}`
}

/** How much of a recap fits on one line of a phone before it is a paragraph. */
const TITLE_LENGTH = 64

/**
 * The name on a night's row.
 *
 * The plan's title when there is one, because that is what the DM called the
 * night while writing it. Failing that, the recap's first line — a night that
 * ran without a plan still has words the DM chose. Failing both, the honest
 * noun.
 */
export function nightTitle(night: SessionNight): string {
  if (night.plan) return night.plan.title

  const first = (night.recap?.body ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  if (!first) return night.kind === 'tonight' ? 'Tonight' : 'A night with no plan'

  return first.length > TITLE_LENGTH ? `${first.slice(0, TITLE_LENGTH).trimEnd()}…` : first
}

/** "1 fight", "2 fights" — a count and the word for it. */
function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * "1 fight ended · 2 scenes ran · 3 revealed · 2 secrets found · 1 note" —
 * what a night amounted to.
 *
 * Only the parts that happened: a night of pure conversation says "1 note"
 * rather than four zeroes. Reveals are counted together — an NPC, a place and
 * a handout are all "the party found out about something" and three separate
 * tallies would be the app's schema on a DM's screen.
 */
export function actsLine(entries: readonly SessionLogEntry[], noteCount: number): string {
  const of = (...kinds: SessionLogEntry['kind'][]) =>
    entries.filter((entry) => kinds.includes(entry.kind)).length

  const fights = of('encounter')
  const scenes = of('scene')
  const revealed = of('npc', 'location', 'handout')
  const secrets = of('secret')

  const parts = [
    fights > 0 ? `${plural(fights, 'fight')} ended` : '',
    scenes > 0 ? `${plural(scenes, 'scene')} ran` : '',
    revealed > 0 ? `${revealed} revealed` : '',
    secrets > 0 ? `${plural(secrets, 'secret')} found` : '',
    noteCount > 0 ? plural(noteCount, 'note') : '',
  ].filter((part) => part.length > 0)

  return parts.join(' · ')
}

/**
 * The line under a night's title — and it is a different sentence per state,
 * because the question a DM has about each is different.
 *
 * An upcoming night is prep, so it says how far through the eight steps it is.
 * Tonight is in progress, so it says what has piled up so far. A played night
 * is history the party can already read, so it says that, and how much of the
 * DM's own writing is filed under it.
 */
export function nightDetail(night: SessionNight, tally: PlanTally | null): string {
  if (night.kind === 'upcoming') {
    return tally
      ? `Plan ${tally.ready} of ${tally.total} steps ready`
      : 'Nothing written for it yet'
  }

  if (night.kind === 'tonight') {
    return actsLine(night.entries, night.notes.length) || 'Nothing recorded yet'
  }

  const notes = night.notes.length
  const shared = night.recap?.sharedWithPlayers ? 'Recap shared with players' : 'Recap written'

  return notes > 0 ? `${shared} · ${plural(notes, 'note')}` : shared
}

/** One thing to do about a night, as the chip under its row says it. */
export interface NightChip {
  label: string
  href: string
  /** The one chip per row that is the obvious next act. */
  primary?: boolean
}

/**
 * The chips under a night's row: the next act, never every act.
 *
 * An upcoming night is prepped, tonight is played or closed, a played night is
 * read. A read-only timeline — a campaign the DM has closed — gets none of
 * them: history is not a thing you press.
 */
export function nightChips(
  night: SessionNight,
  campaignId: string,
  options: { readOnly?: boolean } = {},
): NightChip[] {
  if (options.readOnly) return []

  const base = `/dm/campaigns/${campaignId}`

  switch (night.kind) {
    case 'upcoming':
      return night.plan ? [{ label: 'Prep ›', href: `${base}/session-plans/${night.plan.id}` }] : []
    case 'tonight':
      return [
        { label: 'Close the session → recap', href: `${base}/session-log`, primary: true },
        { label: 'Play ›', href: '/dm/play' },
      ]
    case 'played':
      return [{ label: 'Recap ✓', href: `${base}/sessions/${night.id}` }]
  }
}

/** Where a night's row itself goes — its own page, or the plan it is still. */
export function nightHref(night: SessionNight, campaignId: string): string {
  const base = `/dm/campaigns/${campaignId}`

  if (night.kind === 'tonight') return `${base}/session-log`

  return `${base}/sessions/${night.id}`
}

/**
 * "4 of 5 scenes ran · 3 of 8 secrets found" — how much of a plan the night
 * actually used, for the row that leads from a played night into its plan.
 */
export function planRanLine(tally: PlanTally): string {
  const parts = [
    tally.scenes.total > 0
      ? `${tally.scenes.ran} of ${plural(tally.scenes.total, 'scene')} ran`
      : '',
    tally.secrets.total > 0
      ? `${tally.secrets.found} of ${plural(tally.secrets.total, 'secret')} found`
      : '',
  ].filter((part) => part.length > 0)

  return parts.length > 0 ? parts.join(' · ') : 'Nothing written on it'
}

/**
 * The notes that belong to no night on the timeline
 * (`dm-chronology/sessions-tab`).
 *
 * Every note belongs to a night (Jamie, 2026-09-07, answer 7) — but a note can
 * be *dated* a day nothing was ever run on, either because the DM typed the
 * date by hand or because the night it was written for was never closed and
 * then the plan was deleted. The rule this file keeps is that such a note is
 * **shown**, under its own group at the bottom, rather than quietly ceasing to
 * exist: a notebook that silently drops pages is worse than one with an
 * untidy section at the back.
 *
 * Recaps are never orphans: a recap *is* a night, so one that somehow did not
 * land in `nights` would be a bug in `listNights` rather than a note to file.
 */
export function notesWithoutANight(
  nights: readonly SessionNight[],
  notes: readonly CampaignNote[],
): CampaignNote[] {
  const claimed = new Set<string>()

  for (const night of nights) {
    if (night.recap) claimed.add(night.recap.id)
    for (const note of night.notes) claimed.add(note.id)
  }

  return notes
    .filter((note) => note.sessionClosedAt === null && !claimed.has(note.id))
    .sort((a, b) =>
      a.sessionDate === b.sessionDate
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : b.sessionDate.localeCompare(a.sessionDate),
    )
}
