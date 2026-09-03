// What a handout may contain, and which layer each field belongs to
// (`dm-prep-suite/locations-handouts`).
//
// Same shape as the NPC roster's and the location list's, inherited from
// `src/lib/prep/fields.ts`. The one thing worth reading twice is where the
// divider falls, because a handout is the entity where it falls differently:
//
// **A handout's public layer is the artefact itself.** `title` is the DM's
// label for it and `body` is the thing the party actually reads — the letter,
// the inscription, the riddle. What stays behind the screen is what it *is*:
// who really wrote it, what it is a forgery of, and when to produce it.
//
// **The image is not in either list, and that is the enforcement.** It is not
// text a DM types; it arrives as bytes on `/handouts/[handoutId]/image`, and
// because it is absent from both schemas below, no JSON patch — through the
// editor or hand-rolled at the endpoint — can point a handout at a stored
// object. The only way a row gets an image is an upload this app validated.
import { z } from 'zod'

import type { CampaignHandout } from '@/lib/db/schema'
import {
  layerShape,
  MAX_PREP_NAME_LENGTH,
  MAX_PREP_TEXT_LENGTH,
  requiredName,
  type PrepField,
} from '@/lib/prep/fields'

export { MAX_PREP_NAME_LENGTH as MAX_HANDOUT_TITLE_LENGTH } from '@/lib/prep/fields'

/**
 * Columns these lists are not about: identity, ownership, reveal, clocks, the
 * required title, and `image` — see the header.
 */
type NonFieldColumn =
  'id' | 'campaignId' | 'revealedAt' | 'createdAt' | 'updatedAt' | 'title' | 'image'

/** One editable field on a handout, as the editor renders it. */
export type HandoutField = PrepField<Exclude<keyof CampaignHandout, NonFieldColumn>>

/**
 * The public layer: the artefact, as the party will read it.
 *
 * One field, and it is the handout. A picture is the other half and lives in
 * its own column with its own control — a handout may be either, both, or for
 * now neither, because prep arrives in the order the DM thinks of it and a
 * title with nothing under it is a legitimate placeholder for next week's scan.
 */
export const HANDOUT_PUBLIC_FIELDS: readonly HandoutField[] = [
  {
    key: 'body',
    label: 'What it says',
    hint: 'The words on the thing — the letter, the inscription, the riddle.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
]

/**
 * The DM-only layer: never leaves the DM, revealed or not.
 *
 * Handing over a letter does not hand over who forged it — see
 * `handoutPublicColumns` in `src/lib/db/handouts.ts`, the selection a
 * player-facing read may name.
 */
export const HANDOUT_SECRET_FIELDS: readonly HandoutField[] = [
  {
    key: 'provenance',
    label: 'What it really is',
    hint: 'Who wrote it, what it is a forgery of, the detail that gives it away.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
  {
    key: 'dmNotes',
    label: 'Notes',
    hint: 'When to produce it, and what it should cost them to get it.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
]

/** Every editable field, public layer first — the order the editor renders in. */
export const HANDOUT_FIELDS: readonly HandoutField[] = [
  ...HANDOUT_PUBLIC_FIELDS,
  ...HANDOUT_SECRET_FIELDS,
]

const handoutTitle = requiredName('Give the handout a title', MAX_PREP_NAME_LENGTH)

/** Built from the field lists, so a new field cannot be validated by accident. */
const handoutShape = layerShape(HANDOUT_FIELDS)

/** A new handout. A title on its own is enough — the scan can come later. */
export const createHandoutSchema = z.object({ ...handoutShape, title: handoutTitle })

/**
 * An edit. Every field optional, but not *all* of them: an empty patch is a
 * write that changes nothing and still bumps `updated_at`.
 */
export const patchHandoutSchema = z
  .object({ ...handoutShape, title: handoutTitle.optional() })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change')

export type CreateHandoutInput = z.infer<typeof createHandoutSchema>
export type PatchHandoutInput = z.infer<typeof patchHandoutSchema>
