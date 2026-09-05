import { POST } from './route'

// Closing a session (`dm-run-suite/session-log-recap`, D41).
//
// The one endpoint that writes a row with `session_closed_at` on it, so what
// this suite settles is that publishing and closing cannot come apart: there is
// no field in the body that turns either half off.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/notes', () => ({
  publishSessionRecap: jest.fn(),
}))

jest.mock('@/lib/db/dm-notes', () => ({
  appendToCharacterDmNote: jest.fn(async () => true),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { appendToCharacterDmNote } from '@/lib/db/dm-notes'
import { publishSessionRecap, type CampaignNote } from '@/lib/db/notes'
import { todaySessionDate } from '@/lib/notes/schema'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockPublish = publishSessionRecap as jest.MockedFunction<typeof publishSessionRecap>
const mockAppend = appendToCharacterDmNote as jest.MockedFunction<typeof appendToCharacterDmNote>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const RECAP: CampaignNote = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-09-03',
  body: 'They burned the shrine and let the cultist go.',
  sharedWithPlayers: true,
  sessionClosedAt: new Date('2026-09-03T22:40:00.000Z'),
  createdAt: new Date('2026-09-03T22:40:00.000Z'),
  updatedAt: new Date('2026-09-03T22:40:00.000Z'),
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

describe('POST /api/campaigns/[id]/session-log/close', () => {
  it('401s without a session, before anything is published', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const response = await POST(jsonRequest({ body: 'Previously…' }), { params })

    expect(response.status).toBe(401)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await POST(jsonRequest({ body: 'Previously…' }), { params })

    expect(response.status).toBe(503)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('publishes the DM’s edited recap and answers 201', async () => {
    signedIn()
    mockPublish.mockResolvedValue(RECAP)

    const response = await POST(
      jsonRequest({ body: '  They burned the shrine and let the cultist go.  ' }),
      { params },
    )

    // Trimmed by the schema, so a stray newline off a textarea is not the
    // first line of what the party reads.
    expect(mockPublish).toHaveBeenCalledWith(
      DM,
      CAMPAIGN_ID,
      'They burned the shrine and let the cultist go.',
    )
    expect(response.status).toBe(201)

    const payload = (await response.json()) as { recap: CampaignNote }
    expect(payload.recap.id).toBe(RECAP.id)
    expect(payload.recap.sharedWithPlayers).toBe(true)
    expect(payload.recap.sessionClosedAt).not.toBeNull()
  })

  it('400s on an empty recap — closing a session says something or nothing happens', async () => {
    signedIn()

    const response = await POST(jsonRequest({ body: '   ' }), { params })

    expect(response.status).toBe(400)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('400s on a body that is not JSON at all', async () => {
    signedIn()

    const response = await POST(
      {
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Request,
      { params },
    )

    expect(response.status).toBe(400)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  // `first-table/between-sessions-questions`: the night's answers land in each
  // character's DM note, dated, before the recap publishes.
  it('writes each character’s answers under Threads, notes first, then publishes', async () => {
    signedIn()
    mockPublish.mockResolvedValue(RECAP)
    mockAppend.mockResolvedValue(true)
    const order: string[] = []
    mockAppend.mockImplementation(async () => {
      order.push('note')
      return true
    })
    mockPublish.mockImplementation(async () => {
      order.push('recap')
      return RECAP
    })

    const ava = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
    const bo = '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e'
    const response = await POST(
      jsonRequest({
        body: 'Previously…',
        answers: [
          { characterId: ava, favouriteMoment: 'the shove', highlight: 'Talked the guard down' },
          { characterId: bo },
        ],
      }),
      { params },
    )

    expect(response.status).toBe(201)
    const today = todaySessionDate()
    expect(mockAppend).toHaveBeenCalledTimes(1)
    expect(mockAppend).toHaveBeenCalledWith(
      DM,
      CAMPAIGN_ID,
      ava,
      'Threads',
      `${today} — Highlight: Talked the guard down\n${today} — Favourite moment: the shove`,
    )
    expect(order).toEqual(['note', 'recap'])
  })

  it('refuses an answer that is not for a character id', async () => {
    signedIn()

    const response = await POST(
      jsonRequest({ body: 'Previously…', answers: [{ characterId: 'ava', highlight: 'x' }] }),
      { params },
    )

    expect(response.status).toBe(400)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('ignores anything else in the body — closing is not a field the client sets', async () => {
    signedIn()
    mockPublish.mockResolvedValue(RECAP)

    await POST(
      jsonRequest({ body: 'Previously…', sharedWithPlayers: false, sessionClosedAt: null }),
      { params },
    )

    expect(mockPublish).toHaveBeenCalledWith(DM, CAMPAIGN_ID, 'Previously…')
  })

  it('404s for a campaign this DM does not run — never 403', async () => {
    signedIn()
    mockPublish.mockResolvedValue(null)

    const response = await POST(jsonRequest({ body: 'Previously…' }), { params })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'No such campaign' })
  })
})
