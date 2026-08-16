import { GET, POST } from './route'

// Authority lives in the query, not in this route — these tests exist to
// prove the session user is what reaches the data layer, and that the body is
// bounded.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/items', () => ({
  addItem: jest.fn(),
  listItems: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { addItem, listItems, type CharacterItem } from '@/lib/db/items'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockListItems = listItems as jest.MockedFunction<typeof listItems>
const mockAddItem = addItem as jest.MockedFunction<typeof addItem>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const OWNER = 'user_2mFq8xKpLd'
const ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const ITEM: CharacterItem = {
  id: '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  characterId: ID,
  equipmentIndex: 'longsword',
  customName: null,
  quantity: 1,
  equipped: true,
  attuned: false,
  notes: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: OWNER } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockListItems.mockResolvedValue([ITEM])
  mockAddItem.mockResolvedValue({ outcome: 'written', item: ITEM })
})

describe('GET /api/characters/[id]/items', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await GET(jsonRequest(null), { params })

    expect(response.status).toBe(401)
    expect(mockListItems).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(jsonRequest(null), { params })).status).toBe(503)
  })

  it('lists the character’s items for the session viewer', async () => {
    signedIn()

    const response = await GET(jsonRequest(null), { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListItems).toHaveBeenCalledWith(OWNER, ID)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].equipmentIndex).toBe('longsword')
  })

  it('is a 404 for a character this viewer may not see', async () => {
    signedIn()
    mockListItems.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('POST /api/characters/[id]/items', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await POST(jsonRequest({ equipmentIndex: 'longsword' }), { params })

    expect(response.status).toBe(401)
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ equipmentIndex: 'longsword' }), { params })

    expect(response.status).toBe(503)
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('stores a reference item against the session viewer', async () => {
    signedIn()

    const response = await POST(jsonRequest({ equipmentIndex: 'longsword', equipped: true }), {
      params,
    })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockAddItem).toHaveBeenCalledWith(OWNER, ID, {
      equipmentIndex: 'longsword',
      equipped: true,
    })
    expect(body.item.id).toBe(ITEM.id)
  })

  it('accepts a homebrew item named only by customName', async () => {
    signedIn()

    const response = await POST(jsonRequest({ customName: 'Lucky Pebble' }), { params })

    expect(response.status).toBe(201)
  })

  it('refuses an item that is neither reference nor named', async () => {
    signedIn()

    const response = await POST(jsonRequest({ quantity: 2 }), { params })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/reference index or a name/i)
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('refuses unknown fields, bad indexes and impossible quantities', async () => {
    signedIn()

    expect(
      (await POST(jsonRequest({ equipmentIndex: 'longsword', ownerId: 'x' }), { params })).status,
    ).toBe(400)
    expect((await POST(jsonRequest({ equipmentIndex: 'Long Sword!' }), { params })).status).toBe(
      400,
    )
    expect(
      (await POST(jsonRequest({ equipmentIndex: 'longsword', quantity: 0 }), { params })).status,
    ).toBe(400)
    expect(mockAddItem).not.toHaveBeenCalled()
  })

  it('rejects a body that is not JSON', async () => {
    signedIn()

    const unparseable = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await POST(unparseable, { params })).status).toBe(400)
  })

  it('is a 404 for a character this viewer may not see', async () => {
    signedIn()
    mockAddItem.mockResolvedValue({ outcome: 'missing' })

    expect((await POST(jsonRequest({ equipmentIndex: 'longsword' }), { params })).status).toBe(404)
  })

  it('answers the attunement cap with 409 and a message a player can act on', async () => {
    signedIn()
    mockAddItem.mockResolvedValue({ outcome: 'attunement-limit' })

    const response = await POST(jsonRequest({ customName: 'Fourth Ring', attuned: true }), {
      params,
    })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toMatch(/3 items/i)
  })
})
