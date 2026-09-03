// What a session plan contains, and what may be written to one
// (`dm-prep-suite/session-plans`).
//
// The shape is `src/lib/npcs/schema.ts`' and `src/lib/locations/schema.ts`',
// inherited rather than copied: the descriptor, the lengths and the zod
// builders come from `src/lib/prep/fields.ts`. What this module decides is the
// same two things every prep entity decides — which fields exist, and which
// side of the divider each one is on — plus the three small schemas the plan's
// *children* need, which no previous prep entity had.
//
// The property the two field lists carry is worth restating: the editor renders
// from them, so a field is marked secret on screen because it *is* in the
// DM-only layer. Add a column to `campaign_session_plans` and forget to
// classify it and it gets no editor at all — a visibly missing field, which a
// DM will report — rather than being quietly drawn in the half that is
// announced to the party.
import { z } from 'zod'

import type { CampaignSessionPlan } from '@/lib/db/schema'
import { SESSION_PLAN_ITEM_KINDS, SESSION_PLAN_LINK_KINDS } from '@/lib/db/schema'
import {
  layerShape,
  MAX_PREP_NAME_LENGTH,
  MAX_PREP_TEXT_LENGTH,
  requiredName,
  type PrepField,
} from '@/lib/prep/fields'

export { MAX_PREP_NAME_LENGTH as MAX_SESSION_PLAN_TITLE_LENGTH } from '@/lib/prep/fields'

/**
 * One checkable line, as typed. Short on purpose: the Lazy DM steps ask for
 * *one-sentence* secrets, and a phone at a table reads a sentence, not an
 * essay. Long enough for a generous sentence, short enough to stay one line.
 */
export const MAX_SESSION_PLAN_ITEM_LENGTH = 300

/**
 * The most lines one reorder may name.
 *
 * A guard against an unbounded array arriving, not a limit on how many scenes a
 * night may have — the data layer already refuses any set that is not exactly
 * the plan's current one for that kind, so the real constraint is the plan
 * itself. Set well above anything a session has (the Lazy DM steps ask for
 * three to five scenes and about ten secrets) so it can never be the thing a
 * DM hits.
 */
export const MAX_SESSION_PLAN_ITEMS = 200

/** Columns that are not prep the DM types: identity, ownership, reveal, clocks. */
type NonFieldColumn = 'id' | 'campaignId' | 'revealedAt' | 'createdAt' | 'updatedAt'

/** One editable field on a session plan, as the editor renders it. */
export type SessionPlanField = PrepField<
  Exclude<keyof CampaignSessionPlan, NonFieldColumn | 'title'>
>

/**
 * The public layer: the night as it would be announced to the party.
 *
 * `title` is not in this list because it is not optional and the editor gives
 * it its own required field above both layers. That leaves the date, and that
 * is the honest extent of a session plan's public half — the write-up the party
 * reads afterwards is a shared `campaign_note`, which already exists.
 */
export const SESSION_PLAN_PUBLIC_FIELDS: readonly SessionPlanField[] = [
  {
    key: 'sessionDate',
    label: 'Which night',
    hint: 'The date you are prepping for. Leave it blank until it is fixed.',
    kind: 'date',
    max: 10,
  },
]

/**
 * The DM-only layer: never leaves the DM, revealed or not.
 *
 * A strong start is *heard* at the table and never read off a plan, so it does
 * not travel with the night's title — see `sessionPlanPublicColumns` in
 * `src/lib/db/session-plans.ts`, the selection a player-facing read may name.
 * The scenes and the secrets are not here at all: they are rows in
 * `session_plan_items`, because they are ticked off one at a time during play
 * rather than saved as part of a form.
 */
export const SESSION_PLAN_SECRET_FIELDS: readonly SessionPlanField[] = [
  {
    key: 'strongStart',
    label: 'Strong start',
    hint: 'One paragraph: where they are as the session opens, and what is already wrong.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
  {
    key: 'treasure',
    label: 'Treasure',
    hint: 'What there is to find tonight, and roughly what it is worth.',
    kind: 'text',
    max: MAX_PREP_TEXT_LENGTH,
  },
]

/** Every editable field, public layer first — the order the editor renders in. */
export const SESSION_PLAN_FIELDS: readonly SessionPlanField[] = [
  ...SESSION_PLAN_PUBLIC_FIELDS,
  ...SESSION_PLAN_SECRET_FIELDS,
]

const planTitle = requiredName('Give the session a title', MAX_PREP_NAME_LENGTH)

/** Built from the field lists, so a new field cannot be validated by accident. */
const planShape = layerShape(SESSION_PLAN_FIELDS)

/** A new plan. A title is enough — the five sections fill in over the week. */
export const createSessionPlanSchema = z.object({ ...planShape, title: planTitle })

/**
 * An edit. Every field optional, but not *all* of them: an empty patch is a
 * write that changes nothing and still bumps `updated_at`.
 */
export const patchSessionPlanSchema = z
  .object({ ...planShape, title: planTitle.optional() })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change')

const itemBody = z
  .string()
  .trim()
  .min(1, 'Write the line first')
  .max(
    MAX_SESSION_PLAN_ITEM_LENGTH,
    `Keep it under ${MAX_SESSION_PLAN_ITEM_LENGTH} characters — one sentence`,
  )

const itemKind = z.enum(SESSION_PLAN_ITEM_KINDS, { error: 'That is not a kind of line' })

/** A new scene or secret. Both arrive unticked; ticking is its own request. */
export const createSessionPlanItemSchema = z.object({ kind: itemKind, body: itemBody })

/**
 * An edit to one line: reword it, tick it, or untick it.
 *
 * `checked` is a boolean here and a timestamp in the table — the tap says
 * "done", and `checkStamp` in the data layer is the one place that decides
 * *when* that was. `kind` is absent on purpose: a secret does not become a
 * scene, and moving a line between the two lists would silently drop it out of
 * its order.
 */
export const patchSessionPlanItemSchema = z
  .object({ body: itemBody.optional(), checked: z.boolean().optional() })
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change')

/**
 * A whole list, in its new order.
 *
 * The client sends every id of that kind rather than "move this one up",
 * because the full order is idempotent: replay it and nothing moves, send it
 * after a tie and the ties are gone. The data layer refuses anything that is
 * not exactly the plan's current set for that kind, so a stale tab cannot
 * renumber half a list.
 */
export const reorderSessionPlanItemsSchema = z.object({
  kind: itemKind,
  ids: z
    .array(z.string())
    .min(1, 'Nothing to reorder')
    .max(MAX_SESSION_PLAN_ITEMS, 'That is more lines than a session has')
    .refine((ids) => new Set(ids).size === ids.length, 'That order repeats a line'),
})

/** A new link to something already prepped. */
export const createSessionPlanLinkSchema = z.object({
  kind: z.enum(SESSION_PLAN_LINK_KINDS, { error: 'That is not something a plan can link to' }),
  targetId: z.string().min(1, 'Pick something to link'),
})

export type CreateSessionPlanInput = z.infer<typeof createSessionPlanSchema>
export type PatchSessionPlanInput = z.infer<typeof patchSessionPlanSchema>
export type CreateSessionPlanItemInput = z.infer<typeof createSessionPlanItemSchema>
export type PatchSessionPlanItemInput = z.infer<typeof patchSessionPlanItemSchema>
export type ReorderSessionPlanItemsInput = z.infer<typeof reorderSessionPlanItemsSchema>
export type CreateSessionPlanLinkInput = z.infer<typeof createSessionPlanLinkSchema>
