import { POST } from './route'

// Quick capture (DND-058) — the one-thumb path, used mid-session. Which note
// the line lands in is the data layer's rule; what this route owes is a short
// validated line, a session user, and a 404 for someone else's campaign.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/notes', () => ({
  appendToSessionNote: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { appendToSessionNote, type CampaignNote } from '@/lib/db/notes'
import { MAX_QUICK_NOTE_LENGTH } from '@/lib/notes/schema'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockAppend = appendToSessionNote as jest.MockedFunction<typeof appendToSessionNote>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const NOTE: CampaignNote = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-15',
  body: 'The party bribed the harbourmaster.\nInnkeeper is called Bram',
  sharedWithPlayers: false,
  sessionClosedAt: null,
  createdAt: new Date('2026-08-15T20:00:00.000Z'),
  updatedAt: new Date('2026-08-15T21:12:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID })

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

it('401s without a session', async () => {
  mockGetSessionUser.mockResolvedValue(null)

  expect((await POST(jsonRequest({ text: 'x' }), { params })).status).toBe(401)
  expect(mockAppend).not.toHaveBeenCalled()
})

it('503s when the database is not configured', async () => {
  signedIn()
  mockIsDatabaseConfigured.mockReturnValue(false)

  expect((await POST(jsonRequest({ text: 'x' }), { params })).status).toBe(503)
})

it('400s on a blank line', async () => {
  signedIn()

  expect((await POST(jsonRequest({ text: '   ' }), { params })).status).toBe(400)
  expect(mockAppend).not.toHaveBeenCalled()
})

it('400s on a line longer than a thumb types', async () => {
  signedIn()

  const response = await POST(jsonRequest({ text: 'x'.repeat(MAX_QUICK_NOTE_LENGTH + 1) }), {
    params,
  })

  expect(response.status).toBe(400)
  expect(mockAppend).not.toHaveBeenCalled()
})

it('appends the trimmed line and answers with the note as it now stands', async () => {
  signedIn()
  mockAppend.mockResolvedValue(NOTE)

  const response = await POST(jsonRequest({ text: '  Innkeeper is called Bram  ' }), { params })

  expect(mockAppend).toHaveBeenCalledWith(DM, CAMPAIGN_ID, 'Innkeeper is called Bram')
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toMatchObject({
    note: { body: expect.stringContaining('Innkeeper is called Bram') },
  })
})

it('404s for a campaign the session user does not run', async () => {
  signedIn()
  mockAppend.mockResolvedValue(null)

  expect((await POST(jsonRequest({ text: 'sneaky' }), { params })).status).toBe(404)
})
