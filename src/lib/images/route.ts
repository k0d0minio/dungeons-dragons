// The HTTP half of an image slot (`dm-prep-suite/locations-handouts`).
//
// Three entities carry an image — a handout, an NPC's portrait, and one day a
// character's — and each gets the same three verbs on its own path: `GET` the
// bytes, `POST` a replacement, `DELETE` the lot. The verbs differ only in which
// row they load and which column they write, so everything that is *not* that
// lives here and is written once.
//
// The upload is a multipart body rather than JSON with a base64 field, and the
// file never round-trips through the client as a URL or a token. A DM's browser
// posts the picked file to the entity's own endpoint and gets back the entity;
// it is never handed a store address to attach in a second request, because a
// client that can name the object to attach is a client that can name someone
// else's.
import { NextResponse } from 'next/server'

import {
  ACCEPTED_IMAGE_LABEL,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LABEL,
  sniffImage,
  type StoredImage,
} from './schema'

/** A rejected upload, already phrased as the answer the route should send. */
export interface UploadRejected {
  ok: false
  status: number
  error: string
}

/** An accepted upload: the bytes, and what the *header* says they are. */
export interface UploadAccepted {
  ok: true
  bytes: Uint8Array
  format: { contentType: string; extension: string }
}

/** The multipart field the client posts under. One name, said once. */
export const IMAGE_FIELD = 'image'

/** Anything with the two `Blob` members this module needs, however it got here. */
function isFileLike(value: unknown): value is Blob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Blob).arrayBuffer === 'function' &&
    typeof (value as Blob).size === 'number'
  )
}

/**
 * Pull the uploaded image out of a request, or say why it is not one.
 *
 * The order of the checks is the point. Size is refused from the declared
 * length **before** the body is read into memory, so a hostile 500 MB post is
 * a cheap 413 rather than a function that falls over. Only then are the bytes
 * read, and only then is the format decided — from the bytes, never from
 * `file.type`, which is client-supplied and on a phone is often empty.
 */
export async function readImageUpload(request: Request): Promise<UploadAccepted | UploadRejected> {
  let form: FormData

  try {
    form = await request.formData()
  } catch {
    return { ok: false, status: 400, error: 'Expected an uploaded image' }
  }

  const file = form.get(IMAGE_FIELD)

  if (!isFileLike(file)) {
    return { ok: false, status: 400, error: 'Choose an image to upload' }
  }

  if (file.size === 0) {
    return { ok: false, status: 400, error: 'That file is empty' }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      status: 413,
      error: `That image is over ${MAX_IMAGE_LABEL}. Share it at a smaller size and try again.`,
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const format = sniffImage(bytes)

  if (!format) {
    return {
      ok: false,
      status: 415,
      error: `That is not an image this app can show. Use ${ACCEPTED_IMAGE_LABEL}.`,
    }
  }

  return { ok: true, bytes, format }
}

/**
 * The bytes of a stored image, as the response to an authorised `GET`.
 *
 * Every header is set from what the app knows rather than from what came back
 * off the store:
 *
 * - **`Content-Type` is the sniffed type**, recorded at upload. The store is
 *   told the same value, but trusting the column keeps the served type tied to
 *   the bytes that were actually inspected.
 * - **`nosniff`** so a browser cannot decide the file is something more
 *   interesting than a JPEG. The global header sets this too; an image
 *   response is the one place it is load-bearing, so it says so locally.
 * - **`Content-Disposition: inline`** with no filename: this is rendered in an
 *   `<img>`, and a name taken from an upload is a name a user chose.
 * - **`Cache-Control: private`** — a browser may keep it, a shared cache may
 *   not. An unrevealed handout must not sit in a CDN.
 */
export function imageResponse(
  image: StoredImage,
  stream: ReadableStream<Uint8Array>,
  size: number,
): Response {
  return new NextResponse(stream, {
    headers: {
      'Content-Type': image.contentType,
      'Content-Length': String(size),
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

/** 503, phrased for the one person who can fix it. */
export function imageStoreUnconfigured() {
  return NextResponse.json(
    {
      error:
        'Image uploads are not switched on. Create a Blob store on the Vercel project and ' +
        'set BLOB_READ_WRITE_TOKEN.',
    },
    { status: 503 },
  )
}
