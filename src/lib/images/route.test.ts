import { imageResponse, readImageUpload } from './route'
import { MAX_IMAGE_BYTES, type StoredImage } from './schema'

// The HTTP half of an image slot (`dm-prep-suite/locations-handouts`).
//
// The order of the checks in `readImageUpload` is a property, not an
// implementation detail: an oversized post is refused from its declared length
// *before* the body is read, and the format is decided from the file's own
// bytes rather than the type the client attached to it.

function file(
  bytes: number[],
  { size, type = 'image/jpeg' }: { size?: number; type?: string } = {},
) {
  const body = new Uint8Array(16)
  body.set(bytes)

  return {
    type,
    size: size ?? body.byteLength,
    arrayBuffer: jest.fn(async () => body.buffer),
  }
}

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0]

/** A request whose `formData()` answers with `fields`. */
function upload(fields: Record<string, unknown>): Request {
  const form = { get: (key: string) => fields[key] ?? null }
  return { formData: async () => form } as unknown as Request
}

describe('readImageUpload', () => {
  it('takes a JPEG and reports what the bytes say it is', async () => {
    const result = await readImageUpload(upload({ image: file(JPEG_HEADER) }))

    expect(result).toMatchObject({
      ok: true,
      format: { contentType: 'image/jpeg', extension: 'jpg' },
    })
  })

  it('ignores the type the client declared and believes the header', async () => {
    // A phone often sends no type at all, and a hostile client sends a lie.
    const result = await readImageUpload(
      upload({ image: file(JPEG_HEADER, { type: 'image/svg+xml' }) }),
    )

    expect(result).toMatchObject({ ok: true, format: { contentType: 'image/jpeg' } })
  })

  it('415s a file whose bytes are not one of the three formats', async () => {
    const svg = [...'<svg xmlns='].map((character) => character.charCodeAt(0))

    expect(await readImageUpload(upload({ image: file(svg, { type: 'image/png' }) }))).toEqual({
      ok: false,
      status: 415,
      error: 'That is not an image this app can show. Use JPEG, PNG or WebP.',
    })
  })

  it('413s an oversized file without ever reading its body', async () => {
    const huge = file(JPEG_HEADER, { size: MAX_IMAGE_BYTES + 1 })

    const result = await readImageUpload(upload({ image: huge }))

    expect(result).toMatchObject({ ok: false, status: 413 })
    expect(huge.arrayBuffer).not.toHaveBeenCalled()
  })

  it('400s an empty file', async () => {
    expect(await readImageUpload(upload({ image: file(JPEG_HEADER, { size: 0 }) }))).toMatchObject({
      ok: false,
      status: 400,
      error: 'That file is empty',
    })
  })

  it('400s a body with no file under the field the client posts to', async () => {
    expect(await readImageUpload(upload({ image: 'a string' }))).toMatchObject({
      ok: false,
      status: 400,
      error: 'Choose an image to upload',
    })
    expect(await readImageUpload(upload({}))).toMatchObject({ ok: false, status: 400 })
  })

  it('400s a body that is not multipart at all', async () => {
    const request = {
      formData: async () => {
        throw new TypeError('Could not parse content as FormData')
      },
    } as unknown as Request

    expect(await readImageUpload(request)).toEqual({
      ok: false,
      status: 400,
      error: 'Expected an uploaded image',
    })
  })
})

describe('imageResponse', () => {
  const image: StoredImage = {
    pathname: 'campaigns/abc/handouts/def-x1y2.png',
    contentType: 'image/png',
    bytes: 2_048,
    uploadedAt: '2026-09-03T10:00:00.000Z',
  }

  it('serves the type recorded at upload, and forbids a browser guessing another', () => {
    const stream = {} as ReadableStream<Uint8Array>
    const response = imageResponse(image, stream, 2_048) as unknown as {
      body: unknown
      headers: { get: (name: string) => string | null }
    }

    expect(response.body).toBe(stream)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Length')).toBe('2048')
  })

  // An unrevealed handout is a secret; a shared cache must never hold one.
  it('lets the browser cache it and no one else', () => {
    const response = imageResponse(image, {} as ReadableStream<Uint8Array>, 1) as unknown as {
      headers: { get: (name: string) => string | null }
    }

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600')
  })

  // The filename would be one a user chose; there is nothing to gain by it.
  it('renders inline under no name of the uploader’s', () => {
    const response = imageResponse(image, {} as ReadableStream<Uint8Array>, 1) as unknown as {
      headers: { get: (name: string) => string | null }
    }

    expect(response.headers.get('Content-Disposition')).toBe('inline')
  })
})
