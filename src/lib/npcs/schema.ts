// What an NPC may contain, and which layer each field belongs to
// (`dm-prep-suite/npc-roster`).
//
// One definition, for the same reason `src/lib/notes/schema.ts` is one
// definition: the two routes that accept an NPC and the editor that sends one
// cannot drift apart. This module carries something extra, though, and it is
// the point of the ticket —
//
// **The public/DM-only split is data here, not a layout choice in the editor.**
// `NPC_PUBLIC_FIELDS` and `NPC_SECRET_FIELDS` are the same lists the editor
// renders from, so a field is marked secret on screen because it *is* in the
// DM-only layer, not because someone remembered to put it below the divider.
// Adding a column to `campaign_npcs` and forgetting to classify it means it has
// no editor at all — a visibly missing field, rather than a secret quietly
// rendered in the public half.
//
// `locations-handouts` got its own pair of lists in its own module, and lifted
// the shape they share into `src/lib/prep/fields.ts` — the field descriptor,
// the three lengths and the zod builders. What stays here is the only thing
// this ticket decided: which fields an NPC has, and which layer each is in.
import { z } from 'zod'

import type { CampaignNpc } from '@/lib/db/schema'
import {
  layerShape,
  MAX_PREP_NAME_LENGTH,
  MAX_PREP_SUMMARY_LENGTH,
  MAX_PREP_TEXT_LENGTH,
  requiredName,
  type PrepField,
} from '@/lib/prep/fields'

/** A name is a tap target in a list, not a paragraph. */
export const MAX_NPC_NAME_LENGTH = MAX_PREP_NAME_LENGTH

/** One line, and the roster truncates it if a DM insists otherwise. */
export const MAX_NPC_SUMMARY_LENGTH = MAX_PREP_SUMMARY_LENGTH

/** Long enough for a page of prep, short enough to stay a text field. */
export const MAX_NPC_TEXT_LENGTH = MAX_PREP_TEXT_LENGTH

/**
 * The columns these lists are *not* about.
 *
 * `portrait` is here because it is not text a DM types: it arrives as bytes on
 * its own endpoint (`/npcs/[npcId]/portrait`), it is rendered by its own
 * control, and it is absent from both zod schemas below — so no JSON patch,
 * hand-rolled or otherwise, can point an NPC at a stored object.
 */
type NonFieldColumn = 'id' | 'campaignId' | 'revealedAt' | 'createdAt' | 'updatedAt' | 'portrait'

/** One editable field on an NPC, as the editor renders it. */
export type NpcField = PrepField<Exclude<keyof CampaignNpc, NonFieldColumn>>

/**
 * The public layer: what the party reads once this NPC is revealed.
 *
 * `name` is not in this list because it is not optional and the editor gives it
 * its own required field above both layers — every other public column is here.
 */
export const NPC_PUBLIC_FIELDS: readonly NpcField[] = [
  {
    key: 'summary',
    label: 'One line',
    hint: 'How they read at a glance. Shows in the roster.',
    kind: 'line',
    max: MAX_NPC_SUMMARY_LENGTH,
  },
  {
    key: 'description',
    label: 'Description',
    hint: 'What the party sees and hears: look, voice, how they behave in a scene.',
    kind: 'text',
    max: MAX_NPC_TEXT_LENGTH,
  },
]

/**
 * The DM-only layer: never leaves the DM, revealed or not.
 *
 * Revealing an NPC shows the party its face. None of this goes with it — see
 * `npcPublicColumns` in `src/lib/db/npcs.ts`, which is the selection a
 * player-facing read is allowed to name.
 */
export const NPC_SECRET_FIELDS: readonly NpcField[] = [
  {
    key: 'motivation',
    label: 'What they want',
    hint: 'The thing that makes them act. Usually one sentence.',
    kind: 'text',
    max: MAX_NPC_TEXT_LENGTH,
  },
  {
    key: 'secrets',
    label: 'What they are hiding',
    hint: 'What the party would have to work for.',
    kind: 'text',
    max: MAX_NPC_TEXT_LENGTH,
  },
  {
    key: 'twist',
    label: 'The turn',
    hint: 'What they do when the party finds out.',
    kind: 'text',
    max: MAX_NPC_TEXT_LENGTH,
  },
  {
    key: 'statReference',
    label: 'Run them as',
    hint: 'A stat block to reach for if it comes to it — “Bandit Captain, SRD”.',
    kind: 'line',
    max: MAX_NPC_SUMMARY_LENGTH,
  },
  {
    key: 'dmNotes',
    label: 'Notes',
    hint: 'Anything else. Voice, a line to use, what they owe whom.',
    kind: 'text',
    max: MAX_NPC_TEXT_LENGTH,
  },
]

/** Every editable field, public layer first — the order the editor renders in. */
export const NPC_FIELDS: readonly NpcField[] = [...NPC_PUBLIC_FIELDS, ...NPC_SECRET_FIELDS]

const npcName = requiredName('Give them a name', MAX_NPC_NAME_LENGTH)

/** Built from the field lists, so a new field cannot be validated by accident. */
const npcShape = layerShape(NPC_FIELDS)

/** A new NPC. Everything but the name is optional — a name and a line is prep. */
export const createNpcSchema = z.object({ ...npcShape, name: npcName })

/**
 * An edit. Every field optional, but not *all* of them: an empty patch is a
 * write that changes nothing and still bumps `updated_at`, so say so rather
 * than reporting a save that saved nothing.
 */
export const patchNpcSchema = z
  .object({ ...npcShape, name: npcName.optional() })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change')

export type CreateNpcInput = z.infer<typeof createNpcSchema>
export type PatchNpcInput = z.infer<typeof patchNpcSchema>
