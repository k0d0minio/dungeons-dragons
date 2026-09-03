// What an uploaded image is, and what makes one acceptable
// (`dm-prep-suite/locations-handouts`).
//
// The app had never taken a file from a user before this ticket. Handouts are
// what forced it — a handout is often a photographed letter or a slice of the
// box's map — and the rails below are the ones the epic's data lens set, each
// answering a specific way user-supplied files go wrong:
//
// - **The declared type is ignored.** A browser's `file.type` is whatever the
//   client says it is, and on a phone it is frequently blank. {@link sniffImage}
//   reads the first bytes and decides from those; a file whose header does not
//   match one of three raster formats does not get stored at all.
// - **No SVG, at any size.** An SVG is a script host, and one served from our
//   own origin would be stored XSS with a DM's session behind it. It is not in
//   the table below and there is no flag to put it there.
// - **Upload only.** There is no import-from-URL anywhere in this feature: a
//   server that fetches an address a user typed is an SSRF, and the way to not
//   have one is to never write the fetch.
// - **A size a phone can actually send.** See {@link MAX_IMAGE_BYTES}.
//
// The type is deliberately small. Nothing here knows about Vercel Blob — that
// is `store.ts` — so the validation half is pure, and the tests for it need no
// network, no token and no mock.

/**
 * The largest upload the app accepts, in bytes.
 *
 * Four megabytes, and the ceiling is not ours: a Vercel serverless function
 * gets a **4.5 MB request body**, and the upload arrives as a multipart body
 * on a route handler. Anything above this is refused with a sentence a DM can
 * act on rather than a platform-level 413 with no explanation.
 *
 * It is also the right size for the job. A phone photo of a letter is well
 * under it; a 12-megapixel camera original is not, and the honest answer to
 * that is "share it smaller" rather than a minute of upload on table wifi.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

/** The same number said the way an error message should say it. */
export const MAX_IMAGE_LABEL = '4 MB'

/** How many leading bytes {@link sniffImage} needs to decide. */
const SNIFF_BYTES = 16

/** One accepted format, and the bytes that prove a file is one. */
interface ImageFormat {
  /** The content type this app will serve the file back as. */
  contentType: string
  /** The extension the stored object carries, for the sake of readable keys. */
  extension: string
  /** What a DM sees in the "we take these" line. */
  label: string
  matches: (header: Uint8Array) => boolean
}

/** ASCII at a fixed offset — the two container formats identify themselves. */
function ascii(header: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...header.subarray(start, end))
}

function startsWith(header: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => header[index] === byte)
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

/**
 * Every format the app stores. Three raster formats, and the list is the
 * allowlist — a file that matches nothing here is rejected, rather than stored
 * under a fallback type.
 */
const IMAGE_FORMATS: readonly ImageFormat[] = [
  {
    contentType: 'image/jpeg',
    extension: 'jpg',
    label: 'JPEG',
    // SOI marker followed by the first segment's marker byte.
    matches: (header) => startsWith(header, [0xff, 0xd8, 0xff]),
  },
  {
    contentType: 'image/png',
    extension: 'png',
    label: 'PNG',
    matches: (header) => startsWith(header, PNG_SIGNATURE),
  },
  {
    contentType: 'image/webp',
    extension: 'webp',
    label: 'WebP',
    // A RIFF container whose form type is WEBP — the bytes between are the
    // file length, which says nothing about the format.
    matches: (header) => ascii(header, 0, 4) === 'RIFF' && ascii(header, 8, 12) === 'WEBP',
  },
]

/** "JPEG, PNG or WebP" — built from the table so it cannot fall out of step. */
export const ACCEPTED_IMAGE_LABEL = IMAGE_FORMATS.map((format) => format.label)
  .join(', ')
  .replace(/, ([^,]*)$/, ' or $1')

/**
 * The `accept` attribute for a file input, from the same table.
 *
 * A hint to the phone's picker and nothing more — it filters the gallery and
 * is trivially bypassed, which is why {@link sniffImage} exists on the server.
 */
export const ACCEPTED_IMAGE_TYPES = IMAGE_FORMATS.map((format) => format.contentType).join(',')

/** What the header bytes say a file is, or `null` for "not one of ours". */
export function sniffImage(bytes: Uint8Array): { contentType: string; extension: string } | null {
  if (bytes.length < SNIFF_BYTES) return null

  const header = bytes.subarray(0, SNIFF_BYTES)
  const format = IMAGE_FORMATS.find((candidate) => candidate.matches(header))

  return format ? { contentType: format.contentType, extension: format.extension } : null
}

/**
 * An image in the store, as a row records it.
 *
 * The `pathname` is the whole address, and it is only ever an address *inside
 * the store* — the blob is written with `access: 'private'`, so there is no
 * URL anyone could fetch even holding this value. That is the point: an
 * unrevealed handout is a secret, and a secret must not be one guessed URL
 * away from the party.
 *
 * Stored as one JSONB column rather than four scalar ones because it is one
 * fact: a pathname without a content type is a file the app cannot serve, and
 * a content type without a pathname is nothing at all. `NULL` is "no image",
 * said once.
 */
export interface StoredImage {
  /** The key inside the blob store. Never leaves the server. */
  pathname: string
  /** Sniffed, not declared — what the serving route sets as `Content-Type`. */
  contentType: string
  bytes: number
  /** ISO 8601, so the column round-trips through JSON unchanged. */
  uploadedAt: string
}

/**
 * What a browser is told about a stored image: that there is one, and how big.
 *
 * The `pathname` is deliberately absent. Rows reach the DM's browser as JSON
 * and reach client components through the RSC payload, and either would carry
 * the store key with them — so the data layer redacts on the way out and the
 * only way to see the bytes is the authed route that checks who is asking.
 */
export interface ImageMeta {
  contentType: string
  bytes: number
  uploadedAt: string
}

/** The redaction, in one place. `null` in, `null` out — no image is no image. */
export function imageMeta(image: StoredImage | null | undefined): ImageMeta | null {
  if (!image) return null

  return { contentType: image.contentType, bytes: image.bytes, uploadedAt: image.uploadedAt }
}

/** "1.2 MB" — for the line under a thumbnail. Bytes are not a DM's unit. */
export function formatImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
