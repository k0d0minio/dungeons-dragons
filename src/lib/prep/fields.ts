// The shape every prep entity's field list has (`dm-prep-suite`).
//
// `npc-roster` established the idea: a prep entity's editable fields are
// **data**, in two lists — one per layer — and those lists both validate a
// field and render it, so a column that nobody classified gets no editor at
// all (a visibly missing field) rather than being quietly drawn in the public
// half. `locations-handouts` is the second and third entity to want that, which
// is the point at which the shape is worth stating once instead of copying.
//
// What lives here is only what is genuinely common: the field descriptor, the
// three lengths, and the two zod builders. The lists themselves stay in
// `src/lib/npcs/schema.ts`, `src/lib/locations/schema.ts` and
// `src/lib/handouts/schema.ts`, because *which* fields an entity has and which
// layer each belongs to is the thing each ticket is actually deciding.
import { z } from 'zod'

import { isSessionDate } from '@/lib/notes/schema'

/** A name or title is a tap target in a list, not a paragraph. */
export const MAX_PREP_NAME_LENGTH = 120

/** One line, and the list truncates it if a DM insists otherwise. */
export const MAX_PREP_SUMMARY_LENGTH = 200

/** Long enough for a page of prep, short enough to stay a text field. */
export const MAX_PREP_TEXT_LENGTH = 5_000

/**
 * How a field is edited: a single-line input, a growable textarea, or a date
 * picker.
 *
 * `date` arrived with `dm-prep-suite/session-plans`, whose plan carries the
 * night it is for. It is in this union rather than a special case in that one
 * editor because the kind is what decides both the control and the validator —
 * put a date outside the union and the session-plan editor becomes the second
 * place that knows how a prep field is rendered.
 */
export type PrepFieldKind = 'line' | 'text' | 'date'

/**
 * One editable field on a prep entity, as the editor renders it.
 *
 * Generic over the key so each entity's list is typed to its own columns — a
 * typo in a key is a compile error at the list, not a blank input at the table.
 */
export interface PrepField<Key extends string = string> {
  /** The column, and the JSON key. */
  key: Key
  label: string
  /** Said on screen under the label — what to actually write there. */
  hint: string
  kind: PrepFieldKind
  max: number
}

/**
 * An optional prep field.
 *
 * Blank collapses to `null` rather than `''`: a field a DM never filled in and
 * one they cleared mean the same thing — nothing written — and storing two
 * spellings of that would have every reader defend against both.
 */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Keep that under ${max.toLocaleString()} characters`)
    .nullable()
    .transform((value) => (value ? value : null))
    .optional()
}

/**
 * An optional calendar date, `YYYY-MM-DD`.
 *
 * Blank collapses to `null` for {@link optionalText}'s reason. The validity
 * check is `isSessionDate` from the notes module rather than a second pattern
 * here: `2026-02-30` matches every plausible regex and is not a day, and the
 * app already has one function that knows that.
 */
export function optionalDate() {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || isSessionDate(value), 'That is not a date')
    .nullable()
    .transform((value) => (value ? value : null))
    .optional()
}

/**
 * The required field every prep entity has — an NPC's name, a location's name,
 * a handout's title.
 *
 * `error` covers the missing-field case: without it, a body with no name at all
 * answers zod's "expected string, received undefined", which is a sentence
 * about JSON rather than about the thing the DM is trying to write down.
 */
export function requiredName(message: string, max: number = MAX_PREP_NAME_LENGTH) {
  return z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(max, `Keep that under ${max} characters`)
}

/** What one optional prep field validates to, whichever control edits it. */
export type PrepFieldSchema = ReturnType<typeof optionalText> | ReturnType<typeof optionalDate>

/**
 * The zod shape for a list of fields, built *from* the list.
 *
 * This is what makes the lists load-bearing rather than decorative: a field
 * cannot be validated unless it is classified into a layer first, so there is
 * no way to accept a value for a column the editor does not render.
 */
export function layerShape<Key extends string>(
  fields: readonly PrepField<Key>[],
): Record<Key, PrepFieldSchema> {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.kind === 'date' ? optionalDate() : optionalText(field.max),
    ]),
  ) as Record<Key, PrepFieldSchema>
}
