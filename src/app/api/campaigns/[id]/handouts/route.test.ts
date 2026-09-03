import { GET, POST } from './route'

// A campaign's handouts (`dm-prep-suite/locations-handouts`). The status matrix
// as on the other prep routes, plus the property the image column adds: this
// endpoint takes text and nothing else, so no JSON body can attach a picture.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/handouts', () => ({
  createCampaignHandout: jest.fn(),
  listCampaignHandouts: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createCampaignHandout, listCampaignHandouts, type HandoutForDm } from '@/lib/db/handouts'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockCreate = createCampaignHandout as jest.MockedFunction<typeof createCampaignHandout>
const mockList = listCampaignHandouts as jest.MockedFunction<typeof listCampaignHandouts>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const HANDOUT: HandoutForDm = {
  id: '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'The pressed-flower letter',
  body: 'Dearest Mira — do not come back for me.',
  image: { contentType: 'image/jpeg', bytes: 120_000, uploadedAt: '2026-09-03T10:00:00.000Z' },
  provenance: null,
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

    expect((await GET(jsonRequest(null), { params })).status).toBe(401)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await GET(jsonRequest(null), { params })).status).toBe(503)
  })

  it('answers the list, scoped to the session user', async () => {
    signedIn()
    mockList.mockResolvedValue([HANDOUT])

    const response = await GET(jsonRequest(null), { params })

    expect(mockList).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    expect(await response.json()).toEqual({ handouts: [HANDOUT] })
  })

  // The redaction happens in the data layer; this is the assertion that the
  // route does not undo it by reaching for a column of its own.
  it('sends no store address with a handout that has a picture', async () => {
    signedIn()
    mockList.mockResolvedValue([HANDOUT])

    const body = await (await GET(jsonRequest(null), { params })).json()

    expect(JSON.stringify(body)).not.toContain('pathname')
  })

  it('404s a campaign this DM does not run — never 403', async () => {
    signedIn()
    mockList.mockResolvedValue(null)

    expect((await GET(jsonRequest(null), { params })).status).toBe(404)
  })
})

describe('POST', () => {
  it('401s without a session, before anything is written', async () => {
    mockGetSessionUser.mockResolvedValue(null)

    expect((await POST(jsonRequest({ title: 'A letter' }), { params })).status).toBe(401)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('503s when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await POST(jsonRequest({ title: 'A letter' }), { params })).status).toBe(503)
  })

  it('400s a body that is not JSON', async () => {
    signedIn()

    const broken = {
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input')
      },
    } as unknown as Request

    expect((await POST(broken, { params })).status).toBe(400)
  })

  it('400s a handout with no title, saying what is missing', async () => {
    signedIn()

    const response = await POST(jsonRequest({ body: 'Dearest Mira,' }), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Give the handout a title' })
  })

  it('creates and answers 201 with the row', async () => {
    signedIn()
    mockCreate.mockResolvedValue(HANDOUT)

    const response = await POST(jsonRequest({ title: 'The pressed-flower letter' }), { params })

    expect(mockCreate).toHaveBeenCalledWith(
      DM,
      CAMPAIGN_ID,
      expect.objectContaining({ title: 'The pressed-flower letter' }),
    )
    expect(response.status).toBe(201)
  })

  // Bytes go to the image endpoint. A body that names an object is not a way in.
  it('drops an image a hand-rolled request tried to attach', async () => {
    signedIn()
    mockCreate.mockResolvedValue(HANDOUT)

    await POST(
      jsonRequest({
        title: 'A letter',
        image: { pathname: 'campaigns/someone-elses/handouts/secret.jpg' },
        revealedAt: new Date().toISOString(),
      }),
      { params },
    )

    expect(mockCreate.mock.calls[0]?.[2]).not.toHaveProperty('image')
    expect(mockCreate.mock.calls[0]?.[2]).not.toHaveProperty('revealedAt')
  })

  it('404s a campaign this DM does not run', async () => {
    signedIn()
    mockCreate.mockResolvedValue(null)

    expect((await POST(jsonRequest({ title: 'A letter' }), { params })).status).toBe(404)
  })
})
