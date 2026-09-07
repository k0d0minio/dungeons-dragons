import { PUT } from './route'

// Casting something onto the table screen (`dm-run-suite/table-screen-cast`).
//
// The route's own job is small and each part of it matters: a body that names
// nothing is refused before a statement runs, `null` is a deliberate clear
// rather than a forgotten field, and a target this campaign does not hold gets
// the same 404 as a campaign this DM does not run — because the data layer
// answers `null` to both and neither may be confirmed.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/table', () => ({
  setCampaignSpotlight: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setCampaignSpotlight } from '@/lib/db/table'
import type { Campaign } from '@/lib/db/schema'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetSpotlight = setCampaignSpotlight as jest.MockedFunction<typeof setCampaignSpotlight>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const CAMPAIGN: Campaign = {
  id: ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: null,
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  tableToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  tableSpotlight: { kind: 'npc', id: NPC_ID, at: '2026-09-07T19:00:00.000Z' },
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-09-07T19:00:00.000Z'),
}

const params = Promise.resolve({ id: ID })

function request(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue({ id: DM } as Awaited<ReturnType<typeof getSessionUser>>)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockSetSpotlight.mockResolvedValue(CAMPAIGN)
})

describe('PUT /api/campaigns/[id]/spotlight', () => {
  it('casts what the body names, stripped of anything else on it', async () => {
    const response = await PUT(
      request({ spotlight: { kind: 'npc', id: NPC_ID, at: 'whenever' } }),
      {
        params,
      },
    )

    expect(response.status).toBe(200)
    // The stamp is the server's to write; nothing a client sends becomes it.
    expect(mockSetSpotlight).toHaveBeenCalledWith(DM, ID, { kind: 'npc', id: NPC_ID })
    expect((await response.json()).campaign.tableSpotlight.kind).toBe('npc')
  })

  it('clears the screen on an explicit null', async () => {
    await PUT(request({ spotlight: null }), { params })

    expect(mockSetSpotlight).toHaveBeenCalledWith(DM, ID, null)
  })

  it('refuses a body that forgot the field rather than clearing the screen', async () => {
    // Clearing mid-scene is a deliberate act; a typo must not do it silently.
    const response = await PUT(request({}), { params })

    expect(response.status).toBe(400)
    expect(mockSetSpotlight).not.toHaveBeenCalled()
  })

  it.each([
    ['an unknown kind', { kind: 'secrets', id: NPC_ID }],
    ['an id that is not a uuid', { kind: 'npc', id: '../../etc' }],
    ['an index with a path in it', { kind: 'monster', index: '../spells/fireball' }],
  ])('answers 400 for %s', async (_case, spotlight) => {
    const response = await PUT(request({ spotlight }), { params })

    expect(response.status).toBe(400)
    expect(mockSetSpotlight).not.toHaveBeenCalled()
  })

  it('answers 400 on a body that is not JSON', async () => {
    const broken = {
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Request

    expect((await PUT(broken, { params })).status).toBe(400)
  })

  it('answers 401 with no session', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PUT(request({ spotlight: null }), { params })).status).toBe(401)
    expect(mockSetSpotlight).not.toHaveBeenCalled()
  })

  it('answers 404 for a campaign this DM does not run and for a target it does not hold', async () => {
    mockSetSpotlight.mockResolvedValue(null)

    const response = await PUT(request({ spotlight: { kind: 'npc', id: NPC_ID } }), { params })

    expect(response.status).toBe(404)
  })

  it('answers 503 when the database is not configured', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PUT(request({ spotlight: null }), { params })).status).toBe(503)
  })
})
