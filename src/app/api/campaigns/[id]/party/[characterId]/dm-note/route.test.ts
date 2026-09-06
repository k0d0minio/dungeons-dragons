import { PUT } from './route'

// The DM's note on a character (first-table/dm-character-notes): 401 → 503 →
// 400 → 404 → 200, and authority is the data layer's — a miss is a 404, never
// a 403, and the owner has no way in.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/dm-notes', () => ({
  saveCharacterDmNote: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { saveCharacterDmNote } from '@/lib/db/dm-notes'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSave = saveCharacterDmNote as jest.MockedFunction<typeof saveCharacterDmNote>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const params = Promise.resolve({ id: CAMPAIGN_ID, characterId: CHARACTER_ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
})

describe('PUT /api/campaigns/[id]/party/[characterId]/dm-note', () => {
  it('answers 401 signed out', async () => {
    const response = await PUT(jsonRequest({ body: 'x' }), { params })

    expect(response.status).toBe(401)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('answers 503 without a database', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PUT(jsonRequest({ body: 'x' }), { params })).status).toBe(503)
  })

  it('answers 400 for a body that is not a note', async () => {
    signedIn()

    expect((await PUT(jsonRequest({ body: 42 }), { params })).status).toBe(400)
    expect((await PUT(jsonRequest({}), { params })).status).toBe(400)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('saves through the campaign in the URL and answers the note', async () => {
    signedIn()
    mockSave.mockResolvedValue({
      characterId: CHARACTER_ID,
      body: 'Sam. Nervous.',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await PUT(jsonRequest({ body: 'Sam. Nervous.' }), { params })

    expect(response.status).toBe(200)
    expect(mockSave).toHaveBeenCalledWith(DM, CAMPAIGN_ID, CHARACTER_ID, 'Sam. Nervous.')
    expect((await response.json()).note.body).toBe('Sam. Nervous.')
  })

  it('is a 404, never a 403, for a table this user does not run', async () => {
    signedIn()
    mockSave.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ body: 'x' }), { params })

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('No such character')
  })
})
