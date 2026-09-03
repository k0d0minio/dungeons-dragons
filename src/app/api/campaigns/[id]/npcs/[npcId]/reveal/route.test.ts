import { PUT } from './route'

// The NPC reveal switch's endpoint (`dm-run-suite/reveal-controls`).
//
// This suite is the thorough one of the three: the handler is shared
// (`src/lib/prep/reveal.ts`), so what the location and handout suites check is
// that they are wired to their own entity, and everything about the *shape* of
// a reveal request is settled here.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/npcs', () => ({
  setNpcRevealed: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setNpcRevealed, type NpcForDm } from '@/lib/db/npcs'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetRevealed = setNpcRevealed as jest.MockedFunction<typeof setNpcRevealed>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const REVEALED: NpcForDm = {
  portrait: null,
  id: NPC_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: new Date('2026-09-03T19:00:00.000Z'),
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T19:00:00.000Z'),
  name: 'Harbourmaster Vane',
  summary: 'Runs the docks, and is bought',
  description: null,
  motivation: 'Pay off the debt.',
  secrets: null,
  twist: null,
  statReference: null,
  dmNotes: null,
}

const params = Promise.resolve({ id: CAMPAIGN_ID, npcId: NPC_ID })

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

describe('PUT /api/campaigns/[id]/npcs/[npcId]/reveal', () => {
  it('401s without a session, before anything is revealed', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PUT(jsonRequest({ revealed: true }), { params })).status).toBe(401)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await PUT(jsonRequest({ revealed: true }), { params })).status).toBe(503)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('400s a body that is not JSON', async () => {
    signedIn()

    const request = {
      json: async () => {
        throw new SyntaxError('nope')
      },
    } as unknown as Request

    expect((await PUT(request, { params })).status).toBe(400)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it.each([
    ['nothing at all', {}],
    ['a string', { revealed: 'yes' }],
    ['null', { revealed: null }],
    ['a field it does not take', { revealedAt: '2026-09-03T19:00:00.000Z' }],
  ])('400s a body saying %s, revealing nothing', async (_label, body) => {
    signedIn()

    // The switch has two positions and a request must name one. Guessing on a
    // malformed body is how prep ends up on a screen the DM was not ready for.
    expect((await PUT(jsonRequest(body), { params })).status).toBe(400)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('reveals, scoped to the session user, and answers with the row', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(REVEALED)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID, true)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ npc: REVEALED })
  })

  it('un-reveals through the same endpoint, because a misclick is not a special case', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue({ ...REVEALED, revealedAt: null })

    const response = await PUT(jsonRequest({ revealed: false }), { params })

    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, NPC_ID, false)
    expect(response.status).toBe(200)
  })

  it('404s an NPC in someone else’s campaign — never 403', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    // A 403 would confirm the NPC exists, which is a fact about another DM's
    // table. Authority lives in the statement's WHERE clause, so the route
    // never learns the difference and cannot leak it.
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No such NPC' })
  })
})
