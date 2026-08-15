import { DELETE, PATCH } from './route'

jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/items', () => ({
  deleteItem: jest.fn(),
  updateItem: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { deleteItem, updateItem, type CharacterItem } from '@/lib/db/items'
import { isDatabaseConfigured } from '@/lib/db/client'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>
const mockDeleteItem = deleteItem as jest.MockedFunction<typeof deleteItem>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const OWNER = 'user_2mFq8xKpLd'
const ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const ITEM_ID = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'

const ITEM: CharacterItem = {
  id: ITEM_ID,
  characterId: ID,
  equipmentIndex: 'longsword',
  customName: null,
  quantity: 1,
  equipped: false,
  attuned: false,
  notes: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const params = Promise.resolve({ id: ID, itemId: ITEM_ID })

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
  mockUpdateItem.mockImplementation(async (_viewer, _id, _itemId, patch) => ({
    outcome: 'written',
    item: { ...ITEM, ...patch },
  }))
  mockDeleteItem.mockResolvedValue(true)
})

describe('PATCH /api/characters/[id]/items/[itemId]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await PATCH(jsonRequest({ equipped: true }), { params })

    expect(response.status).toBe(401)
    expect(mockUpdateItem).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PATCH(jsonRequest({ equipped: true }), { params })).status).toBe(503)
  })

  it('writes the change against the session viewer', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ equipped: true, quantity: 2 }), { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdateItem).toHaveBeenCalledWith(OWNER, ID, ITEM_ID, {
      equipped: true,
      quantity: 2,
    })
    expect(body.item.equipped).toBe(true)
  })

  it('lets notes be cleared with null but not customName', async () => {
    signedIn()

    expect((await PATCH(jsonRequest({ notes: null }), { params })).status).toBe(200)
    // A homebrew item with a nulled name would violate the "named" CHECK.
    expect((await PATCH(jsonRequest({ customName: null }), { params })).status).toBe(400)
  })

  it('refuses an empty patch, unknown fields, and what an item is', async () => {
    signedIn()

    expect((await PATCH(jsonRequest({}), { params })).status).toBe(400)
    expect((await PATCH(jsonRequest({ characterId: 'other' }), { params })).status).toBe(400)
    // Changing the reference index is delete-and-re-add, not an edit.
    expect((await PATCH(jsonRequest({ equipmentIndex: 'dagger' }), { params })).status).toBe(400)
    expect(mockUpdateItem).not.toHaveBeenCalled()
  })

  it('is a 404 for an item this viewer may not see', async () => {
    signedIn()
    mockUpdateItem.mockResolvedValue({ outcome: 'missing' })

    expect((await PATCH(jsonRequest({ equipped: true }), { params })).status).toBe(404)
  })

  it('answers the attunement cap with 409', async () => {
    signedIn()
    mockUpdateItem.mockResolvedValue({ outcome: 'attunement-limit' })

    const response = await PATCH(jsonRequest({ attuned: true }), { params })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toMatch(/3 items/i)
  })
})

describe('DELETE /api/characters/[id]/items/[itemId]', () => {
  it('answers 401 rather than redirecting when signed out', async () => {
    const response = await DELETE(jsonRequest(null), { params })

    expect(response.status).toBe(401)
    expect(mockDeleteItem).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(503)
  })

  it('deletes against the session viewer', async () => {
    signedIn()

    const response = await DELETE(jsonRequest(null), { params })

    expect(response.status).toBe(200)
    expect(mockDeleteItem).toHaveBeenCalledWith(OWNER, ID, ITEM_ID)
  })

  it('is a 404 when nothing this viewer could see matched', async () => {
    signedIn()
    mockDeleteItem.mockResolvedValue(false)

    expect((await DELETE(jsonRequest(null), { params })).status).toBe(404)
  })
})
