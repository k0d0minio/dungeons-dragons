// The blob store adapter (`dm-prep-suite/locations-handouts`).
//
// Three properties, and every one of them is a decision this ticket made rather
// than a default it inherited: objects are written **private**, so no URL
// serves them and the only way to the bytes is a token this app holds; keys are
// randomised, so two DMs uploading `map.png` cannot take out each other's
// handout; and a failed delete is swallowed, because it is always the last step
// of a write that already succeeded.
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}))

import { del, get, put } from '@vercel/blob'

import { captureError } from '@/lib/observability/sentry'

import { deleteImage, isImageStoreConfigured, putImage, readImage } from './store'
import { type StoredImage } from './schema'

const mockPut = put as jest.MockedFunction<typeof put>
const mockGet = get as jest.MockedFunction<typeof get>
const mockDel = del as jest.MockedFunction<typeof del>
const mockCaptureError = captureError as jest.MockedFunction<typeof captureError>

jest.mock('@/lib/observability/sentry', () => ({ captureError: jest.fn() }))

const TOKEN = 'vercel_blob_rw_TESTONLY_notarealtoken'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const IMAGE: StoredImage = {
  pathname: 'campaigns/7b2e4f1a/handouts/h1-x1y2.jpg',
  contentType: 'image/jpeg',
  bytes: 1_024,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

const original = process.env.BLOB_READ_WRITE_TOKEN

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = TOKEN
})

afterAll(() => {
  if (original === undefined) delete process.env.BLOB_READ_WRITE_TOKEN
  else process.env.BLOB_READ_WRITE_TOKEN = original
})

describe('isImageStoreConfigured', () => {
  it('is false until the Vercel Blob token is set, like every other env gate here', () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    expect(isImageStoreConfigured()).toBe(false)

    process.env.BLOB_READ_WRITE_TOKEN = TOKEN
    expect(isImageStoreConfigured()).toBe(true)
  })
})

describe('putImage', () => {
  beforeEach(() => {
    mockPut.mockResolvedValue({
      pathname: 'campaigns/7b2e4f1a/handouts/h1-x1y2.jpg',
    } as Awaited<ReturnType<typeof put>>)
  })

  it('writes a private object with a random suffix, under the campaign', async () => {
    const bytes = new Uint8Array(1_024)

    const stored = await putImage(CAMPAIGN_ID, 'handouts/h1', bytes, {
      contentType: 'image/jpeg',
      extension: 'jpg',
    })

    const [key, , options] = mockPut.mock.calls[0]

    expect(key).toBe(`campaigns/${CAMPAIGN_ID}/handouts/h1.jpg`)
    expect(options).toMatchObject({
      access: 'private',
      addRandomSuffix: true,
      contentType: 'image/jpeg',
      token: TOKEN,
    })

    // The recorded descriptor is the store's pathname, the *sniffed* type and
    // the size we actually wrote — not anything the client said.
    expect(stored).toMatchObject({
      pathname: 'campaigns/7b2e4f1a/handouts/h1-x1y2.jpg',
      contentType: 'image/jpeg',
      bytes: 1_024,
    })
    expect(Date.parse(stored.uploadedAt)).not.toBeNaN()
  })

  it('throws a pointed error rather than a driver-level one with no token', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN

    await expect(
      putImage(CAMPAIGN_ID, 'handouts/h1', new Uint8Array(4), {
        contentType: 'image/png',
        extension: 'png',
      }),
    ).rejects.toThrow(/BLOB_READ_WRITE_TOKEN/)

    expect(mockPut).not.toHaveBeenCalled()
  })
})

describe('readImage', () => {
  it('reads privately, with the token — there is no public URL to fetch', async () => {
    const stream = {} as ReadableStream<Uint8Array>
    mockGet.mockResolvedValue({
      statusCode: 200,
      stream,
      blob: { size: 1_024 },
    } as Awaited<ReturnType<typeof get>>)

    expect(await readImage(IMAGE)).toEqual({ stream, size: 1_024 })
    expect(mockGet).toHaveBeenCalledWith(IMAGE.pathname, { access: 'private', token: TOKEN })
  })

  it('is nothing when the object is gone, so the route can 404 rather than throw', async () => {
    mockGet.mockResolvedValue(null)

    expect(await readImage(IMAGE)).toBeNull()
  })

  it('is nothing without a token, rather than reaching for the store', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN

    expect(await readImage(IMAGE)).toBeNull()
    expect(mockGet).not.toHaveBeenCalled()
  })
})

describe('deleteImage', () => {
  it('forgets the object by its store key', async () => {
    await deleteImage(IMAGE)

    expect(mockDel).toHaveBeenCalledWith(IMAGE.pathname, { token: TOKEN })
  })

  // Always the last step of a write that already succeeded: a few orphaned
  // kilobytes must not turn a completed change into a 500.
  it('swallows a failure and reports it, rather than failing the request', async () => {
    mockDel.mockRejectedValueOnce(new Error('store unavailable'))

    await expect(deleteImage(IMAGE)).resolves.toBeUndefined()
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ at: 'images.deleteImage' }),
    )
  })

  it('does nothing at all without a token', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN

    await deleteImage(IMAGE)

    expect(mockDel).not.toHaveBeenCalled()
  })
})
