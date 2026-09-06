// Validation and formatting shared by every notes surface (DND-058).
//
// One definition of what a note may contain, so the three routes that accept
// one and the three components that send one cannot drift apart — the same job
// `src/lib/characters/schema.ts` does for the creation form. It lives here
// rather than as an extra export from a `route.ts` because a route module is
// allowed to export handlers and segment config, and nothing else.
import { z } from 'zod'

/** Long enough for a whole session written up, short enough to be a text field. */
export const MAX_NOTE_LENGTH = 20_000

/** A thumb-typed line, not an essay — the campaign page takes the long form. */
export const MAX_QUICK_NOTE_LENGTH = 500

/** `YYYY-MM-DD`, the only shape a session date is ever handed as a string. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * True when `value` is a calendar date Postgres will accept without argument.
 *
 * The pattern alone is not enough: `2026-02-30` matches it and is not a day.
 * Round-tripping through `Date` catches every such case without a table of
 * month lengths, and `Date` normalises rather than rejects, so the comparison
 * back to `value` is what does the rejecting.
 */
export function isSessionDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Today as `YYYY-MM-DD`, for the "new note" form's default.
 *
 * UTC, deliberately: the database decides which night a quick capture belongs
 * to with `current_date`, and that is UTC too. One clock, so a note typed by
 * hand and a line captured a minute later land on the same date.
 */
export function todaySessionDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** A session date as a human reads it at a table — "Sat 15 Aug 2026". */
export function formatSessionDate(value: string): string {
  if (!isSessionDate(value)) return value

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * A session date as it is announced — "Thursday 10 September"
 * (`first-table/announce-the-night`).
 *
 * The long form of {@link formatSessionDate}, for the one place a date is the
 * whole message rather than a label on a list: the next night, at the top of a
 * player's campaign page. No year, because the night being announced is by
 * construction within a few weeks and "2026" on it reads as a form field.
 * `en-GB` and UTC for the same reason the short form is — one table, one date,
 * and a server-rendered string the client hydrates identically.
 */
export function formatSessionDateLong(value: string): string {
  if (!isSessionDate(value)) return value

  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

const noteBody = z
  .string()
  .trim()
  .min(1, 'Write something first')
  .max(MAX_NOTE_LENGTH, `Keep a note under ${MAX_NOTE_LENGTH.toLocaleString()} characters`)

const sessionDate = z.string().refine(isSessionDate, 'That is not a date')

/** A new session note. `sessionDate` omitted means "today", decided by the database. */
export const createNoteSchema = z.object({
  body: noteBody,
  sessionDate: sessionDate.optional(),
  sharedWithPlayers: z.boolean().optional(),
})

/**
 * An edit to an existing note. Every field optional, but not *all* of them —
 * an empty patch would be a no-op write that still bumps `updated_at`, so say
 * so rather than pretending something was saved.
 */
export const patchNoteSchema = z
  .object({
    body: noteBody.optional(),
    sessionDate: sessionDate.optional(),
    sharedWithPlayers: z.boolean().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change')

/**
 * The recap the DM publishes when a session closes
 * (`dm-run-suite/session-log-recap`).
 *
 * A note's body and nothing else: the date is `current_date` like every other
 * note's, and "closed" is not a field the client gets to send — closing is
 * what this endpoint *is*, so there is no shape of request to it that publishes
 * without closing or closes without publishing.
 */
export const publishRecapSchema = z.object({ body: noteBody })

/** The cap on one answer — a line the DM types while the table is packing up. */
export const MAX_SESSION_ANSWER_LENGTH = 500

const answerLine = z.string().trim().max(MAX_SESSION_ANSWER_LENGTH).optional()

/**
 * One character's end-of-night answers (`first-table/between-sessions-questions`):
 * the two questions the research recommends asking at the end of every
 * session, and a highlight. All optional — the DM asks whoever is still at
 * the table.
 */
export const sessionAnswerSchema = z.object({
  characterId: z.uuid(),
  favouriteMoment: answerLine,
  wantsNext: answerLine,
  highlight: answerLine,
})

export type SessionAnswer = z.infer<typeof sessionAnswerSchema>

/**
 * What the close-session step sends: the recap, and the night's answers per
 * character. The recap is still required and closing is still not a field —
 * `answers` is orthogonal to both halves, and lands in each character's DM
 * note rather than in the recap.
 */
export const closeSessionSchema = publishRecapSchema.extend({
  answers: z.array(sessionAnswerSchema).max(20).optional(),
})

/** One quick-captured line, bound for tonight's note. */
export const appendNoteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Write something first')
    .max(MAX_QUICK_NOTE_LENGTH, `Keep a quick note under ${MAX_QUICK_NOTE_LENGTH} characters`),
})

/** A player's private notes for one character. Empty is a legitimate save — it clears them. */
export const characterNotesSchema = z.object({
  body: z
    .string()
    .max(MAX_NOTE_LENGTH, `Keep your notes under ${MAX_NOTE_LENGTH.toLocaleString()} characters`),
})
