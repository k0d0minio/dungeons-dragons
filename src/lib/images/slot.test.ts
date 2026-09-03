// An image slot's three verbs (`dm-prep-suite/locations-handouts`).
//
// The tests that matter here are about *order*, because the order is the
// safety property: the object is in the store before the column names it, and
// the old object is forgotten only after the column has stopped naming it. A
// crash anywhere in between leaves bytes nobody references — never a handout
// whose picture 404s at the table.
jest.mock('./store', () => ({
  isImageStoreConfigured: jest.fn(),
  putImage: jest.fn(),
  readImage: jest.fn(),
  deleteImage: jest.fn(),
}))

import { attachSlotImage, clearSlotImage, serveSlotImage, type ImageSlot } from './slot'
import { type StoredImage } from './schema'
import { deleteImage, isImageStoreConfigured, putImage, readImage } from './store'

const mockConfigured = isImageStoreConfigured as jest.MockedFunction<typeof isImageStoreConfigured>
const mockPut = putImage as jest.MockedFunction<typeof putImage>
const mockRead = readImage as jest.MockedFunction<typeof readImage>
const mockDelete = deleteImage as jest.MockedFunction<typeof deleteImage>

const OLD: StoredImage = {
  pathname: 'campaigns/c1/handouts/h1-old.jpg',
  contentType: 'image/jpeg',
  bytes: 1_000,
  uploadedAt: '2026-09-01T10:00:00.000Z',
}

const NEW: StoredImage = {
  pathname: 'campaigns/c1/handouts/h1-new.png',
  contentType: 'image/png',
  bytes: 2_000,
  uploadedAt: '2026-09-03T10:00:00.000Z',
}

type Entity = { id: string; image: unknown }

const ENTITY: Entity = { id: 'h1', image: null }

/** A slot over stubs, recording the order its two sides were called in. */
function slot(
  order: string[],
  {
    row = { image: null } as { image: StoredImage | null } | null,
    saved = ENTITY as Entity | null,
  } = {},
): ImageSlot<Entity> {
  return {
    noun: 'handout',
    campaignId: 'c1',
    key: 'handouts/h1',
    load: jest.fn(async () => {
      order.push('load')
      return row
    }),
    set: jest.fn(async () => {
      order.push('set')
      return saved
    }),
  }
}

/** A request carrying one PNG under the field the client posts to. */
function pngUpload(): Request {
  const bytes = new Uint8Array(16)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const file = { size: bytes.byteLength, type: 'image/png', arrayBuffer: async () => bytes.buffer }

  return { formData: async () => ({ get: () => file }) } as unknown as Request
}

beforeEach(() => {
  mockConfigured.mockReturnValue(true)
  mockPut.mockImplementation(async () => {
    order.push('put')
    return NEW
  })
  mockDelete.mockImplementation(async (image) => {
    order.push(`delete:${image.pathname}`)
  })
})

let order: string[]

beforeEach(() => {
  order = []
})

describe('attachSlotImage', () => {
  it('writes the object before the column, every time', async () => {
    const target = slot(order)

    const result = await attachSlotImage(pngUpload(), target)

    expect(result).toEqual({ entity: ENTITY })
    expect(order).toEqual(['load', 'put', 'set'])
    expect(target.set).toHaveBeenCalledWith(NEW)
  })

  it('forgets the replaced object last, after the column stopped naming it', async () => {
    await attachSlotImage(pngUpload(), slot(order, { row: { image: OLD } }))

    expect(order).toEqual(['load', 'put', 'set', `delete:${OLD.pathname}`])
  })

  it('takes its own upload back out when the row vanished mid-write', async () => {
    const result = await attachSlotImage(pngUpload(), slot(order, { saved: null }))

    expect('response' in result && result.response.status).toBe(404)
    expect(mockDelete).toHaveBeenCalledWith(NEW)
  })

  it('404s a row this DM cannot reach, before anything is uploaded', async () => {
    const result = await attachSlotImage(pngUpload(), slot(order, { row: null }))

    expect('response' in result && result.response.status).toBe(404)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('refuses a bad file without writing anything to the store', async () => {
    const notAnImage = {
      formData: async () => ({
        get: () => ({ size: 16, type: 'image/png', arrayBuffer: async () => new ArrayBuffer(16) }),
      }),
    } as unknown as Request

    const result = await attachSlotImage(notAnImage, slot(order))

    expect('response' in result && result.response.status).toBe(415)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('503s rather than throwing when no blob store is configured', async () => {
    mockConfigured.mockReturnValue(false)

    const target = slot(order)
    const result = await attachSlotImage(pngUpload(), target)

    expect('response' in result && result.response.status).toBe(503)
    expect(target.load).not.toHaveBeenCalled()
  })
})

describe('clearSlotImage', () => {
  it('clears the column first and forgets the object after', async () => {
    const result = await clearSlotImage(slot(order, { row: { image: OLD } }))

    expect(result).toEqual({ entity: ENTITY })
    expect(order).toEqual(['load', 'set', `delete:${OLD.pathname}`])
  })

  it('succeeds on a row that had no image — the intent is already satisfied', async () => {
    const result = await clearSlotImage(slot(order))

    expect(result).toEqual({ entity: ENTITY })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('404s a row this DM cannot reach', async () => {
    const result = await clearSlotImage(slot(order, { row: null }))

    expect('response' in result && result.response.status).toBe(404)
  })
})

describe('serveSlotImage', () => {
  it('answers with the bytes for a row the caller is allowed to read', async () => {
    const stream = {} as ReadableStream<Uint8Array>
    mockRead.mockResolvedValue({ stream, size: 1_000 })

    const response = (await serveSlotImage(slot(order, { row: { image: OLD } }))) as unknown as {
      body: unknown
      headers: { get: (name: string) => string | null }
    }

    expect(response.body).toBe(stream)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('404s a row with no image, and a row that is not this DM’s, alike', async () => {
    expect((await serveSlotImage(slot(order))).status).toBe(404)
    expect((await serveSlotImage(slot(order, { row: null }))).status).toBe(404)
    expect(mockRead).not.toHaveBeenCalled()
  })

  it('404s when the column names an object the store no longer has', async () => {
    mockRead.mockResolvedValue(null)

    expect((await serveSlotImage(slot(order, { row: { image: OLD } }))).status).toBe(404)
  })
})
