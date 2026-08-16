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
