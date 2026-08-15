// The wire contract for a character's inventory (DND-035).
//
// Imported by both sides like `combat.ts`: the sheet posts an item and the
// items routes validate the same shape. Kept apart from `src/lib/db/items.ts`
// so client code can import the schemas and the attunement constant without
// pulling the Drizzle client into the bundle.
import { z } from 'zod'

/**
 * 5e's attunement cap. Enforced as **app logic in `src/lib/db/items.ts`, not
 * a database CHECK** — an artifact or a homebrew ruling can break it, and a
 * constraint would make that state unstorable rather than merely flagged.
 */
export const ATTUNEMENT_LIMIT = 3

/** Same shape the reference proxy accepts: lowercase dnd5eapi slugs. */
const equipmentIndex = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'That is not a reference equipment index')
  .max(100)

const customName = z
  .string()
  .trim()
  .min(1, 'Give the item a name')
  .max(80, 'Item names are capped at 80 characters')

const quantity = z
  .number()
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(999, 'Quantity is capped at 999')

const notes = z.string().max(2000, 'Notes are capped at 2000 characters')

/**
 * What `POST /api/characters/[id]/items` accepts. An item is a reference item
 * (`equipmentIndex`), homebrew (`customName`), or a renamed reference item
 * (both) — never neither, mirroring the `character_items_named` CHECK.
 */
export const itemInputSchema = z
  .strictObject({
    equipmentIndex: equipmentIndex.optional(),
    customName: customName.optional(),
    quantity: quantity.optional(),
    equipped: z.boolean().optional(),
    attuned: z.boolean().optional(),
    notes: notes.optional(),
  })
  .refine((item) => item.equipmentIndex !== undefined || item.customName !== undefined, {
    message: 'An item needs a reference index or a name',
  })

export type ItemInput = z.infer<typeof itemInputSchema>

/**
 * What `PATCH /api/characters/[id]/items/[itemId]` accepts. `equipmentIndex`
 * is deliberately absent — changing what an item *is* is delete-and-re-add,
 * not an edit — and `customName` cannot be nulled, so a homebrew item cannot
 * be patched into violating the named CHECK. `notes: null` clears the notes.
 */
export const itemPatchSchema = z
  .strictObject({
    customName: customName.optional(),
    quantity: quantity.optional(),
    equipped: z.boolean().optional(),
    attuned: z.boolean().optional(),
    notes: notes.nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Nothing to change' })

export type ItemPatch = z.infer<typeof itemPatchSchema>
