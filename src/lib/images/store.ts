// Where an uploaded image actually lives (`dm-prep-suite/locations-handouts`).
//
// **The choice: Vercel Blob, `access: 'private'`.** The app already deploys to
// Vercel, so a blob store is a checkbox and one environment variable rather
// than a second vendor, a second bill and a second set of credentials to keep
// out of git. The alternatives were weighed and lost for reasons that would
// not change on a re-run:
//
// - **Postgres `bytea`** — no new infrastructure at all, and wrong. Every read
//   would come down the Neon HTTP driver through a serverless function, a
//   megabyte of handout would sit in the same row store as the campaign it
//   belongs to, and `neon-http` cannot stream. Cheap to build, expensive
//   forever.
// - **S3 / Cloudflare R2** — the general answer, and more than this needs: an
//   account, a bucket policy, four env vars and a signing library, to hold the
//   dozen images one table will ever upload.
// - **An upload SaaS (UploadThing, Cloudinary)** — a third party in the path of
//   a DM's private prep, for a convenience the platform already provides.
//
// **Private, not public-with-a-random-suffix.** An unrevealed handout is a
// secret, and the epic's rail is that it must not be reachable by URL at all.
// A private blob has no fetchable address: reads carry the store token, which
// only the server has, so {@link readImage} is the *only* way to the bytes and
// the routes above it decide who may call it.
//
// **Blob first, row second.** Every caller writes the object before it writes
// the column, and never the other way round. The failure that ordering leaves
// behind is an orphaned blob nobody references — invisible and cheap. The
// other ordering leaves a handout row whose image 404s, which is a broken
// screen at the table.
import { del, get, put } from '@vercel/blob'

import { captureError } from '@/lib/observability/sentry'

import { type StoredImage } from './schema'

/**
 * The store token, set by the Vercel Blob integration.
 *
 * Read through a function rather than captured at module load, exactly like
 * `DATABASE_URL` and the Neon Auth pair: a fresh clone and a preview deploy
 * without the variable must still build and still serve everything that is not
 * an image.
 */
function storeToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN
}

/** True when the blob store is wired up, so uploads can actually run. */
export function isImageStoreConfigured(): boolean {
  return Boolean(storeToken())
}

/**
 * A month at the edge. Irrelevant to correctness — a private blob is only ever
 * read by this app's own routes — but a stored object's bytes never change, so
 * there is nothing to gain by asking for them fresh.
 */
const CACHE_SECONDS = 30 * 24 * 60 * 60

/**
 * Where a campaign's images sit in the store.
 *
 * Keyed by campaign so a store listing reads like the app's own structure, and
 * so deleting a campaign's images one day is a prefix rather than a join. The
 * random suffix is Blob's own: two DMs uploading `map.png` on the same evening
 * must not collide, and an overwrite would take out the other one's handout.
 */
function keyFor(campaignId: string, slot: string, extension: string): string {
  return `campaigns/${campaignId}/${slot}.${extension}`
}

/**
 * Write bytes to the store and describe what was written.
 *
 * Throws when the store is unconfigured rather than returning `null`: a route
 * that gets this far has already checked, so reaching here without a token is
 * a bug and should read like one.
 */
export async function putImage(
  campaignId: string,
  slot: string,
  bytes: Uint8Array,
  format: { contentType: string; extension: string },
): Promise<StoredImage> {
  const token = storeToken()

  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Create a Blob store on the Vercel project ' +
        '(Storage → Blob) and set the token in Vercel project settings, or in .env.local.',
    )
  }

  // A `Blob` rather than the raw `Uint8Array`: the SDK's body type takes web
  // and Node types but not a bare typed array, and `Blob` is the one both
  // runtimes have.
  const body = new Blob([bytes as BlobPart], { type: format.contentType })

  const result = await put(keyFor(campaignId, slot, format.extension), body, {
    // Private: there is no URL that serves this, only `readImage` holding the
    // store token. See the header — this is the property, not a default.
    access: 'private',
    addRandomSuffix: true,
    contentType: format.contentType,
    cacheControlMaxAge: CACHE_SECONDS,
    token,
  })

  return {
    pathname: result.pathname,
    contentType: format.contentType,
    bytes: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
  }
}

/**
 * The bytes of a stored image, as a stream, or `null` when the object is gone.
 *
 * Callers have already decided the requester may see this — authority is not
 * checked here, because this module has no idea who is asking.
 */
export async function readImage(
  image: StoredImage,
): Promise<{ stream: ReadableStream<Uint8Array>; size: number } | null> {
  const token = storeToken()
  if (!token) return null

  const result = await get(image.pathname, { access: 'private', token })

  // A 304 cannot happen — nothing here sends `ifNoneMatch` — but the result is
  // a discriminated union, and narrowing on it is cheaper than asserting.
  if (!result || result.statusCode !== 200) return null

  return { stream: result.stream, size: result.blob.size }
}

/**
 * Forget a stored image, best effort.
 *
 * Deliberately swallowing: this is always the *last* step of a replace or a
 * remove, after the row has already stopped pointing at the object. A failure
 * here costs a few kilobytes nobody references; turning it into a 500 would
 * tell a DM their image is still attached when it is not.
 */
export async function deleteImage(image: StoredImage): Promise<void> {
  const token = storeToken()
  if (!token) return

  try {
    await del(image.pathname, { token })
  } catch (error) {
    captureError(error, { at: 'images.deleteImage', pathname: image.pathname })
  }
}
