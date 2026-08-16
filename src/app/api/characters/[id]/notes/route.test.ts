import { PATCH } from './route'

// A player's private notes (DND-058). The property worth pinning here is the
// one that makes this route exist at all: it goes through `saveCharacterNotes`,
// which scopes on `characters.owner_id` — not through the character PATCH
// route, whose DND-027 viewer predicate would let a DM write here.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/notes', () => ({
  saveCharacterNotes: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { saveCharacterNotes, type CharacterNote } from '@/lib/db/notes'
import { MAX_NOTE_LENGTH } from '@/lib/notes/schema'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSave = saveCharacterNotes as jest.MockedFunction<typeof saveCharacterNotes>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const PLAYER = 'user_9zQw1nBvRt'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const NOTES: CharacterNote = {
  characterId: CHARACTER_ID,
  body: 'Owe 50gp to the smith.',
  createdAt: new Date('2026-08-15T20:00:00.000Z'),
  updatedAt: new Date('2026-08-15T20:00:00.000Z'),
}

const params = Promise.resolve({ id: CHARACTER_ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: PLAYER } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
})

it('401s without a session, before anything is written', async () => {
  mockGetSessionUser.mockResolvedValue(null)

  expect((await PATCH(jsonRequest({ body: 'x' }), { params })).status).toBe(401)
  expect(mockSave).not.toHaveBeenCalled()
})

it('503s when the database is not configured', async () => {
  signedIn()
  mockIsDatabaseConfigured.mockReturnValue(false)

  expect((await PATCH(jsonRequest({ body: 'x' }), { params })).status).toBe(503)
})

it('400s on a body that is not JSON', async () => {
  signedIn()

  const request = {
    json: async () => {
      throw new SyntaxError('bad json')
    },
  } as unknown as Request

  expect((await PATCH(request, { params })).status).toBe(400)
  expect(mockSave).not.toHaveBeenCalled()
})

it('saves the notes as the session user’s own', async () => {
  signedIn()
  mockSave.mockResolvedValue(NOTES)

  const response = await PATCH(jsonRequest({ body: 'Owe 50gp to the smith.' }), { params })

  // The session user, never an id off the request — this is the whole
  // owner-only guarantee at the route's edge.
  expect(mockSave).toHaveBeenCalledWith(PLAYER, CHARACTER_ID, 'Owe 50gp to the smith.')
  expect(response.status).toBe(200)
})

it('accepts an empty body — clearing your notes is a save, not a delete', async () => {
  signedIn()
  mockSave.mockResolvedValue({ ...NOTES, body: '' })

  const response = await PATCH(jsonRequest({ body: '' }), { params })

  expect(mockSave).toHaveBeenCalledWith(PLAYER, CHARACTER_ID, '')
  expect(response.status).toBe(200)
})

it('400s past the length cap', async () => {
  signedIn()

  expect(
    (await PATCH(jsonRequest({ body: 'x'.repeat(MAX_NOTE_LENGTH + 1) }), { params })).status,
  ).toBe(400)
  expect(mockSave).not.toHaveBeenCalled()
})

it('404s for a character the session user does not own — a DM included', async () => {
  signedIn()
  mockSave.mockResolvedValue(null)

  expect((await PATCH(jsonRequest({ body: 'the DM was here' }), { params })).status).toBe(404)
})
