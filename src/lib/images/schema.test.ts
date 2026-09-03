import {
  ACCEPTED_IMAGE_LABEL,
  ACCEPTED_IMAGE_TYPES,
  formatImageSize,
  imageMeta,
  MAX_IMAGE_BYTES,
  sniffImage,
  type StoredImage,
} from './schema'

// The validation half of image storage (`dm-prep-suite/locations-handouts`).
// Two properties are under test and neither is cosmetic: what the app will
// accept is decided by a file's own bytes, and what it tells a browser about a
// stored file never includes where the file is.

/** A header of `length` bytes starting with `signature`. */
function header(signature: number[], length = 16): Uint8Array {
  const bytes = new Uint8Array(length)
  bytes.set(signature)
  return bytes
}

function ascii(text: string): number[] {
  return [...text].map((character) => character.charCodeAt(0))
}

const JPEG = header([0xff, 0xd8, 0xff, 0xe0])
const PNG = header([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP = header([...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBP')])

describe('sniffImage', () => {
  it('recognises the three formats the app serves', () => {
    expect(sniffImage(JPEG)).toEqual({ contentType: 'image/jpeg', extension: 'jpg' })
    expect(sniffImage(PNG)).toEqual({ contentType: 'image/png', extension: 'png' })
    expect(sniffImage(WEBP)).toEqual({ contentType: 'image/webp', extension: 'webp' })
  })

  // The whole reason this function exists rather than a read of `file.type`.
  it('refuses an SVG however it is dressed up — the stored-XSS case', () => {
    expect(sniffImage(header(ascii('<svg xmlns=')))).toBeNull()
    expect(sniffImage(header(ascii('<?xml version')))).toBeNull()
  })

  it('refuses everything else, including files that merely claim to be images', () => {
    expect(sniffImage(header(ascii('GIF89a')))).toBeNull()
    expect(sniffImage(header(ascii('%PDF-1.7')))).toBeNull()
    expect(sniffImage(header([0x50, 0x4b, 0x03, 0x04]))).toBeNull() // a zip
    expect(sniffImage(header([0x00, 0x00, 0x00, 0x00]))).toBeNull()
  })

  it('refuses a file too short to have a header at all', () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull()
  })

  it('is not fooled by a RIFF container that is not a WebP', () => {
    expect(sniffImage(header([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')]))).toBeNull()
  })
})

describe('the accepted-format copy', () => {
  it('reads as a sentence and is built from the same table as the check', () => {
    expect(ACCEPTED_IMAGE_LABEL).toBe('JPEG, PNG or WebP')
  })

  it('gives a file input the same set of types, as MIME types', () => {
    expect(ACCEPTED_IMAGE_TYPES).toBe('image/jpeg,image/png,image/webp')
  })
})

describe('MAX_IMAGE_BYTES', () => {
  // Not a round number picked for looks: a Vercel serverless function gets a
  // 4.5 MB request body, and the upload arrives as a multipart body.
  it('stays under the platform request-body limit', () => {
    expect(MAX_IMAGE_BYTES).toBe(4 * 1024 * 1024)
    expect(MAX_IMAGE_BYTES).toBeLessThan(4.5 * 1024 * 1024)
  })
})

describe('imageMeta', () => {
  const stored: StoredImage = {
    pathname: 'campaigns/abc/handouts/def-x1y2.jpg',
    contentType: 'image/jpeg',
    bytes: 51_200,
    uploadedAt: '2026-09-03T10:00:00.000Z',
  }

  it('drops the store key — the one property this function exists for', () => {
    const meta = imageMeta(stored)

    expect(meta).toEqual({
      contentType: 'image/jpeg',
      bytes: 51_200,
      uploadedAt: '2026-09-03T10:00:00.000Z',
    })
    expect(meta).not.toHaveProperty('pathname')
    expect(JSON.stringify(meta)).not.toContain('campaigns/abc')
  })

  it('says nothing about an image that is not there', () => {
    expect(imageMeta(null)).toBeNull()
    expect(imageMeta(undefined)).toBeNull()
  })
})

describe('formatImageSize', () => {
  it('uses a unit a DM reads rather than a byte count', () => {
    expect(formatImageSize(512)).toBe('512 B')
    expect(formatImageSize(51_200)).toBe('50 KB')
    expect(formatImageSize(2_202_010)).toBe('2.1 MB')
  })
})
