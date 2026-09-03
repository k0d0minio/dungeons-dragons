// What a location may contain, and which layer each field belongs to
// (`dm-prep-suite/locations-handouts`).
//
// The shape is `src/lib/npcs/schema.ts`', inherited rather than copied: the
// descriptor, the lengths and the zod builders come from
// `src/lib/prep/fields.ts`, and what is written out below is the only thing
// this entity decides — which fields a place has, and which side of the
// divider each one is on.
//
// The property those two lists carry is the same one, and it is worth
// restating because it is the reason the file exists: **the editor renders
// from these lists**, so a field is marked secret on screen because it *is* in
// the DM-only layer. Add a column to `campaign_locations` and forget to
// classify it, and it gets no editor at all — a visibly missing field, which a
// DM will report — rather than being quietly drawn in the half the party will
// eventually read.
import { z } from 'zod'

import type { CampaignLocation } from '@/lib/db/schema'
import {
  layerShape,
  MAX_PREP_NAME_LENGTH,
  MAX_PREP_SUMMARY_LENGTH,
  MAX_PREP_TEXT_LENGTH,
  requiredName,
  type PrepField,
} from '@/lib/prep/fields'

export { MAX_PREP_NAME_LENGTH as MAX_LOCATION_NAME_LENGTH } from '@/lib/prep/fields'

/** Columns that are not prep the DM types: identity, ownership, reveal, clocks. */
type NonFieldColumn = 'id' | 'campaignId' | 'revealedAt' | 'createdAt' | 'updatedAt'

/** One editable field on a location, as the editor renders it. */
export type LocationField = PrepField<Exclude<keyof CampaignLocation, NonFieldColumn | 'name'>>

/**
 * The public layer: what the party reads once this place is revealed.
 *
 * `name` is not in this list because it is not optional and the editor gives it
 * its own required field above both layers — every other public column is here.
 */
export const LOCATION_PUBLIC_FIELDS: readonly LocationField[] = [
  {
    key: 'summary',
    label: 'One line',
    hint: 'How it reads at a glance. Shows in the list.',
    kind: 'line',
    max: MAX_PREP_SUMMARY_LENGTH,
  },
  {
    key: 'description',
    label: 'What they see',
    hint: 'Read-aloud, or close to it: the look of the place, the sound, the smell.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
]

/**
 * The DM-only layer: never leaves the DM, revealed or not.
 *
 * Revealing a location tells the party the place exists and what it looks like.
 * None of this goes with it — see `locationPublicColumns` in
 * `src/lib/db/locations.ts`, the selection a player-facing read may name.
 */
export const LOCATION_SECRET_FIELDS: readonly LocationField[] = [
  {
    key: 'secrets',
    label: 'What is really here',
    hint: 'Who is watching, what is under the floor, what the door is hiding.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
  {
    key: 'dmNotes',
    label: 'Notes',
    hint: 'Ways in and out, what happens if they burn it down, who turns up.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
]

/** Every editable field, public layer first — the order the editor renders in. */
export const LOCATION_FIELDS: readonly LocationField[] = [
  ...LOCATION_PUBLIC_FIELDS,
  ...LOCATION_SECRET_FIELDS,
]

const locationName = requiredName('Give the place a name', MAX_PREP_NAME_LENGTH)

/** Built from the field lists, so a new field cannot be validated by accident. */
const locationShape = layerShape(LOCATION_FIELDS)

/** A new location. A name and a line is prep; the rest can wait for the week. */
export const createLocationSchema = z.object({ ...locationShape, name: locationName })

/**
 * An edit. Every field optional, but not *all* of them: an empty patch is a
 * write that changes nothing and still bumps `updated_at`, so say so rather
 * than reporting a save that saved nothing.
 */
export const patchLocationSchema = z
  .object({ ...locationShape, name: locationName.optional() })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change')

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type PatchLocationInput = z.infer<typeof patchLocationSchema>
