import { PUT } from './route'

// The handout reveal switch's endpoint (`dm-run-suite/reveal-controls`) — the
// one reveal that publishes a file. The picture is not touched here and never
// crosses this route: it is served by the member-scoped image route, which asks
// `revealed_at is not null` for itself.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/handouts', () => ({
  setHandoutRevealed: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setHandoutRevealed, type HandoutForDm } from '@/lib/db/handouts'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockSetRevealed = setHandoutRevealed as jest.MockedFunction<typeof setHandoutRevealed>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'

const REVEALED: HandoutForDm = {
  id: HANDOUT_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: new Date('2026-09-03T19:00:00.000Z'),
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T19:00:00.000Z'),
  title: 'The pressed-flower letter',
  body: 'Dearest Mira — do not come back for me.',
  image: { contentType: 'image/jpeg', bytes: 120_000, uploadedAt: '2026-09-03T10:00:00.000Z' },
  provenance: 'Written by the harbourmaster, in a hand that is not his.',
  dmNotes: null,
}

const params = Promise.resolve({ id: CAMPAIGN_ID, handoutId: HANDOUT_ID })

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

describe('PUT /api/campaigns/[id]/handouts/[handoutId]/reveal', () => {
  it('401s without a session, before anything is handed out', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await PUT(jsonRequest({ revealed: true }), { params })).status).toBe(401)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('400s a body that does not say which way the switch went', async () => {
    signedIn()

    expect((await PUT(jsonRequest({}), { params })).status).toBe(400)
    expect(mockSetRevealed).not.toHaveBeenCalled()
  })

  it('hands the handout out, and answers with the row minus the store key', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(REVEALED)

    const response = await PUT(jsonRequest({ revealed: true }), { params })
    const body = await response.json()

    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, HANDOUT_ID, true)

    // The data layer redacted the image to metadata on the way out, and this
    // route hands on what it was given — there is no address here to leak.
    expect(body.handout.image).toEqual(REVEALED.image)
    expect(JSON.stringify(body)).not.toContain('pathname')
  })

  it('takes it back on the same endpoint, which is what withdraws the picture', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue({ ...REVEALED, revealedAt: null })

    expect((await PUT(jsonRequest({ revealed: false }), { params })).status).toBe(200)
    expect(mockSetRevealed).toHaveBeenCalledWith(DM, CAMPAIGN_ID, HANDOUT_ID, false)
  })

  it('404s a handout in someone else’s campaign — never 403', async () => {
    signedIn()
    mockSetRevealed.mockResolvedValue(null)

    const response = await PUT(jsonRequest({ revealed: true }), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'No such handout' })
  })
})
