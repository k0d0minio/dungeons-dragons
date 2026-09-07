import CampaignPage from './page'

// D48: the campaign hub stopped being a page and became a door
// (`dm-chronology/retire-the-hub`). Nothing is drawn here any more, so what is
// on trial is where an old link lands — and that a campaign this DM does not
// run still 404s before it lands anywhere.
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

let campaign: Record<string, unknown> | null = null

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'jamie' })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => true),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignForDm: jest.fn(async () => campaign),
}))

import { redirect } from 'next/navigation'

const OPEN = {
  id: CAMPAIGN_ID,
  dmUserId: 'jamie',
  name: 'The Tutorial',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID })

beforeEach(() => {
  campaign = OPEN
  jest.clearAllMocks()
})

describe('the old campaign hub', () => {
  it('sends a running campaign to Play — an old link mid-session means the table', async () => {
    await expect(CampaignPage({ params })).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/dm/play')
  })

  it('sends a closed campaign to its own timeline, where finished tables live', async () => {
    campaign = { ...OPEN, closedAt: new Date('2026-08-20T22:30:00.000Z') }

    await expect(CampaignPage({ params })).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith(`/dm/campaigns/${CAMPAIGN_ID}/sessions`)
  })

  it('404s a campaign this DM does not run, rather than redirecting', async () => {
    campaign = null

    await expect(CampaignPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')

    expect(redirect).not.toHaveBeenCalled()
  })
})
