import { render, screen } from '@testing-library/react'

import CampaignPage from './page'

// The DM's campaign page, as `first-table/session-zero-one-pager` and
// `first-table/one-night-campaign` left it: the one page's editor above the
// prep, and the close-campaign card at the foot with the session log's draft
// in its box. The cards are their own tests' — this pins the wiring and the
// two reads that feed it.
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

let campaign: Record<string, unknown> | null = null

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'jamie' })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => true),
}))

// The two polling cards poll; the page is what is on trial.
jest.mock('@/components/campaigns/party-glance', () => ({
  PartyGlance: () => <div data-testid="party-glance" />,
}))

jest.mock('@/components/campaigns/campaign-milestone-card', () => ({
  CampaignMilestoneCard: () => <div data-testid="milestone-card" />,
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(async () =>
    campaign ? { campaign, members: [], characters: [] } : null,
  ),
}))

jest.mock('@/lib/db/encounters', () => ({
  listEncounters: jest.fn(async () => []),
}))

jest.mock('@/lib/db/notes', () => ({
  listCampaignNotes: jest.fn(async () => []),
}))

jest.mock('@/lib/db/session-log', () => ({
  getSessionLog: jest.fn(async () => ({
    since: null,
    entries: [],
    note: {
      id: 'note-1',
      campaignId: CAMPAIGN_ID,
      sessionDate: '2026-09-10',
      body: 'Halda lied about the lighthouse.',
      sharedWithPlayers: false,
      sessionClosedAt: null,
      createdAt: new Date('2026-09-10T20:00:00.000Z'),
      updatedAt: new Date('2026-09-10T20:00:00.000Z'),
    },
  })),
}))

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

/** A card's title — a `div`, not a heading, in the shadcn card. */
function cardTitle(text: string): HTMLElement {
  return screen.getByText(text, { selector: '[data-slot="card-title"]' })
}

/** True when `first` comes before `second` on the page. */
function precedes(first: HTMLElement, second: HTMLElement): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

beforeEach(() => {
  campaign = OPEN
})

describe('the DM campaign page', () => {
  it('carries the one page editor above the prep, seeded when nothing is written', async () => {
    render(await CampaignPage({ params }))

    expect(precedes(cardTitle('The one page'), cardTitle('Prep'))).toBe(true)
    expect(screen.getByLabelText('The one page')).toHaveDisplayValue(/The pitch —/)
  })

  it('shows the page as written once there is one', async () => {
    campaign = { ...OPEN, sessionZero: 'Phones — face down.' }

    render(await CampaignPage({ params }))

    expect(screen.getByLabelText('The one page')).toHaveValue('Phones — face down.')
  })

  it('puts the close card last, with the session log’s draft in the box', async () => {
    render(await CampaignPage({ params }))

    expect(screen.getByLabelText('Recap')).toHaveValue('Halda lied about the lighthouse.')
    expect(precedes(cardTitle('Invite your players'), cardTitle('Close this campaign'))).toBe(true)
  })

  it('says a closed campaign is closed and offers no close', async () => {
    campaign = { ...OPEN, closedAt: new Date('2026-08-20T22:30:00.000Z') }

    render(await CampaignPage({ params }))

    expect(screen.getByText(/Closed on 20 Aug 2026/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Recap')).not.toBeInTheDocument()
    expect(screen.getByText(/· Closed$/)).toBeInTheDocument()
    // The join link died with the campaign, so nothing offers to copy it.
    expect(screen.queryByText('Invite your players')).not.toBeInTheDocument()
  })

  it('404s a campaign this DM does not run', async () => {
    campaign = null

    await expect(CampaignPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
