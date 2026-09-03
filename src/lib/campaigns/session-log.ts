// The session log and the recap draft, as words (`dm-run-suite/session-log-recap`).
//
// Pure, and separate from `src/lib/db/session-log.ts` on purpose: that file
// decides *what happened*, this one decides *how it reads*, and the second is
// the half worth testing without a database in the room.
//
// The stub's sentence is the design brief — **automatic capture, human words:
// the DM writes the story, the app remembers the facts.** So nothing here
// writes prose. A draft is a list of the evening's facts in the order they
// happened, in the plainest phrasing that survives being edited: the DM opens
// it, deletes two thirds, joins the rest into three sentences, and publishes.
// A draft that tried to be the recap would be a draft the DM has to unwrite
// first.
import type { SessionLogEntry, SessionLogKind } from '@/lib/db/session-log'

/**
 * The word each kind of act gets in a draft line.
 *
 * Verbs in the party's voice, not the app's: a DM trimming this into a recap
 * is writing for players, and "Met Bram" is already half of a sentence they
 * would read. "Revealed the drowned shrine" is the app describing its own
 * mechanism, which is the thing that would have to be rewritten.
 */
const DRAFT_VERBS: Record<SessionLogKind, string> = {
  encounter: 'Fought',
  npc: 'Met',
  location: 'Reached',
  handout: 'Were given',
  scene: 'Played',
  secret: 'Learned',
}

/** The one-word label a log line carries on the DM's screen. */
const LOG_LABELS: Record<SessionLogKind, string> = {
  encounter: 'Fight',
  npc: 'Person',
  location: 'Place',
  handout: 'Handout',
  scene: 'Scene',
  secret: 'Secret',
}

/** What kind of thing this line is, for the badge beside it. */
export function sessionLogLabel(kind: SessionLogKind): string {
  return LOG_LABELS[kind]
}

/** "Fought Ambush at the ford" — one act, as a line of a draft recap. */
export function describeLogEntry(entry: SessionLogEntry): string {
  return `${DRAFT_VERBS[entry.kind]} ${entry.title}`
}

/**
 * "20:47" — when a log line happened, on the DM's screen only.
 *
 * A clock time rather than a date, because every line in a log is from the
 * same evening and the useful question is what order the night went in. Fixed
 * to `en-GB` and UTC like `formatDiscoveredOn`, so a server-rendered string
 * and the client's agree rather than hydrating mismatched.
 */
export function formatLogTime(value: Date | string): string {
  const at = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(at.getTime())) return ''

  return at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

/**
 * "3 Sept 2026, 20:47" — one moment, spelled in full.
 *
 * Used once, for the line saying when the last session closed, where the date
 * is the part that matters and the time is what tells a DM closing a second
 * session in one day which of the two it means.
 */
export function formatLogMoment(value: Date | string): string {
  const at = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(at.getTime())) return ''

  return `${at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })}, ${formatLogTime(at)}`
}

/**
 * The recap draft: what the app remembered, then what the DM typed.
 *
 * Two blocks separated by a blank line, and the derived facts come first
 * because they are the scaffolding — names spelled right, fights in the order
 * they happened — while the captured lines are already the DM's own words and
 * are what the finished recap will mostly be made of. Editing top-down then
 * means deleting the scaffolding as it gets used, which is how the trimming
 * actually goes.
 *
 * Empty when there is nothing at all: the close-session form starts blank
 * rather than with an apology in it, and the DM types the recap themselves.
 */
export function composeRecapDraft(input: {
  entries: SessionLogEntry[]
  capturedNotes: string | null
}): string {
  const facts = input.entries.map(describeLogEntry)
  const captured = input.capturedNotes?.trim() ?? ''

  const blocks = [facts.join('\n'), captured].filter((block) => block.length > 0)

  return blocks.join('\n\n')
}
