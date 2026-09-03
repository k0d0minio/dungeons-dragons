import { GET, POST } from './route'

// A campaign's NPC roster (`dm-prep-suite/npc-roster`). Authority lives in the
// data layer's queries; these tests pin the status matrix, that the session
// user is who reaches the scoped calls, and that a foreign campaign stays 404.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/npcs', () => ({
  createCampaignNpc: jest.fn(),
  listCampaignNpcs: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignNpc, listCampaignNpcs, type CampaignNpc } from '@/lib/db/npcs'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreate = createCampaignNpc as jest.MockedFunction<typeof createCampaignNpc>
const mockList = listCampaignNpcs as jest.MockedFunction<typeof listCampaignNpcs>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const NPC: CampaignNpc = {
  portrait: null,
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
  name: 'Harbourmaster Vane',
  summary: 'Runs the docks, and is bought',
  description: null,
  motivation: null,
  secrets: 'He signed the manifest.',
  twist: null,
  statReference: null,
  dmNotes: null,
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

describe('GET', () => {
  it('401s without a session, before any query runs', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const response = await GET(jsonRequest(null), { params })

    expect(response.status).toBe(401)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(jsonRequest(null), { params })).status).toBe(503)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('answers the roster, scoped to the session user', async () => {
    signedIn()
    mockList.mockResolvedValue([NPC])

    const response = await GET(jsonRequest(null), { params })

    expect(mockList).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    expect(await response.json()).toEqual({ npcs: [NPC] })
  })

  it('404s a campaign this DM does not run', async () => {
    signedIn()
    mockList.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('POST', () => {
  it('401s without a session, before any write', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await POST(jsonRequest({ name: 'Vane' }), { params })).status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s a body that is not JSON', async () => {
    signedIn()

    const request = {
      json: async () => {
        throw new SyntaxError('nope')
      },
    } as unknown as Request

    expect((await POST(request, { params })).status).toBe(400)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('400s a nameless NPC with the schema’s own message', async () => {
    signedIn()

    const response = await POST(jsonRequest({ summary: 'Runs the docks' }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Give them a name' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates the NPC with the parsed body and answers 201', async () => {
    signedIn()
    mockCreate.mockResolvedValue(NPC)

    const response = await POST(
      jsonRequest({ name: '  Harbourmaster Vane  ', summary: '', secrets: 'He signed it.' }),
      { params },
    )

    expect(response.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith(DM, CAMPAIGN_ID, {
      name: 'Harbourmaster Vane',
      // Blank collapses to null on the way in, not to an empty string.
      summary: null,
      secrets: 'He signed it.',
    })
    expect(await response.json()).toEqual({ npc: NPC })
  })

  it('404s a campaign this DM does not run', async () => {
    signedIn()
    mockCreate.mockResolvedValue(null)

    expect((await POST(jsonRequest({ name: 'Vane' }), { params })).status).toBe(404)
  })
})
