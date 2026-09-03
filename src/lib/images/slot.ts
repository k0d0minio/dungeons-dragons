// An image slot on a prep entity, as three verbs
// (`dm-prep-suite/locations-handouts`).
//
// A handout's picture and an NPC's portrait are the same feature twice, and one
// day a character's portrait will be it a third time. What differs between them
// is two functions — which row to read, which column to write — so those are
// the parameters, and everything that carries a safety property is written once
// here:
//
// - **Blob first, row second.** The object is in the store before the column
//   points at it. The failure this ordering leaves is an orphaned object nobody
//   references; the other ordering leaves a handout whose image 404s at the
//   table, which is the one that costs a scene.
// - **The old object is forgotten last**, after the column has stopped naming
//   it, and best effort — see `deleteImage`.
// - **Nothing is trusted from the client but the bytes.** The store key is
//   built here from ids the route already authorised; the content type is
//   sniffed from the file's own header. There is no request in this app that
//   names an object to attach.
import { NextResponse } from 'next/server'

import { imageResponse, imageStoreUnconfigured, readImageUpload } from './route'
import { type StoredImage } from './schema'
import { deleteImage, isImageStoreConfigured, putImage, readImage } from './store'

/**
 * One entity's image column, as the verbs below need it.
 *
 * `load` returning the outer `null` is "no such row for this user" — the
 * authority check and the existence check at once, and the only one these
 * functions do. An inner `image: null` is a row with no picture.
 */
export interface ImageSlot<Entity> {
  /** The word that completes "No such …" in a 404. */
  noun: string
  /** The campaign the object is filed under, for the store key. */
  campaignId: string
  /** The rest of the store key — `handouts/<id>`, `npcs/<id>`. */
  key: string
  load: () => Promise<{ image: StoredImage | null } | null>
  set: (image: StoredImage | null) => Promise<Entity | null>
}

/** Either the entity as it now stands, or the response to send instead. */
export type SlotResult<Entity> = { entity: Entity } | { response: Response }

function missing(noun: string): { response: Response } {
  return { response: NextResponse.json({ error: `No such ${noun}` }, { status: 404 }) }
}

/**
 * The bytes, for a requester the caller has already authorised.
 *
 * 404 for both "no such row" and "that row has no picture": to anything asking
 * for an image at this URL, the two are the same absence.
 */
export async function serveSlotImage<Entity>(slot: ImageSlot<Entity>): Promise<Response> {
  const row = await slot.load()
  if (!row?.image) return missing(slot.noun).response

  const object = await readImage(row.image)

  // The column says there is an object and the store disagrees — an interrupted
  // delete, or a store that was emptied. Nothing to serve, and nothing the DM
  // can do about it from here except upload again.
  if (!object) return missing(slot.noun).response

  return imageResponse(row.image, object.stream, object.size)
}

/**
 * Take an uploaded image and make it this entity's, replacing whatever was
 * there.
 *
 * The order is the point — read the row (which is also the authority check),
 * write the object, point the column at it, forget the old object. A failure at
 * any step leaves the entity carrying an image that exists.
 */
export async function attachSlotImage<Entity>(
  request: Request,
  slot: ImageSlot<Entity>,
): Promise<SlotResult<Entity>> {
  if (!isImageStoreConfigured()) return { response: imageStoreUnconfigured() }

  const row = await slot.load()
  if (!row) return missing(slot.noun)

  const upload = await readImageUpload(request)

  if (!upload.ok) {
    return { response: NextResponse.json({ error: upload.error }, { status: upload.status }) }
  }

  const stored = await putImage(slot.campaignId, slot.key, upload.bytes, upload.format)
  const entity = await slot.set(stored)

  if (!entity) {
    // The row went away between the read and the write — a DM deleting the
    // handout on another tab. The object we just wrote belongs to nothing, so
    // take it back out rather than leaving it in the store forever.
    await deleteImage(stored)
    return missing(slot.noun)
  }

  if (row.image) await deleteImage(row.image)

  return { entity }
}

/**
 * Take the image off this entity and forget the object.
 *
 * Idempotent on purpose: removing a picture from a row that has none is a
 * success, because the caller's intent — "there should be no image here" — is
 * satisfied. Only a missing row is a 404.
 */
export async function clearSlotImage<Entity>(slot: ImageSlot<Entity>): Promise<SlotResult<Entity>> {
  const row = await slot.load()
  if (!row) return missing(slot.noun)

  const entity = await slot.set(null)
  if (!entity) return missing(slot.noun)

  if (row.image) await deleteImage(row.image)

  return { entity }
}
