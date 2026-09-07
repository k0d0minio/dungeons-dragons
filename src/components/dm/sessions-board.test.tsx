import { render, screen, within } from '@testing-library/react'

import { SessionsBoard } from './sessions-board'

// What the Sessions tab reads (`dm-chronology/sessions-tab`). The timeline's
// own tests cover what a row says; what is on trial here is the wiring — the
// orphan group is worked out from the notes the timeline did not claim, the
// tables behind you are the closed campaigns and only them, and a campaign
// with a `closed_at` is read rather than run.

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/lib/db/session-log', () => ({ listNights: jest.fn() }))
jest.mock('@/lib/db/notes', () => ({
  listCampaignNotes: jest.fn(),
  countRecapsByCampaign: jest.fn(),
}))
jest.mock('@/lib/db/prep', () => ({ countPartyReadiness: jest.fn() }))
jest.mock('@/lib/db/session-plans', () => ({ listPlanTallies: jest.fn() }))
jest.mock('@/lib/db/campaigns', () => ({ listCampaignsForDm: jest.fn() }))

import { listCampaignsForDm } from '@/lib/db/campaigns'
import { countRecapsByCampaign, listCampaignNotes } from '@/lib/db/notes'
import { countPartyReadiness } from '@/lib/db/prep'
import type { Campaign, CampaignNote } from '@/lib/db/schema'
import { listNights, type SessionNight } from '@/lib/db/session-log'
import { listPlanTallies } from '@/lib/db/session-plans'

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CLOSED_ID = '11111111-2222-4333-8444-555555555555'
const RECAP_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'

const CAMPAIGN = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: 'We play on Thursdays.',
  tableToken: null,
  tableSpotlight: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
} satisfies Campaign

function note(overrides: Partial<CampaignNote> = {}): CampaignNote {
  return {
    id: 'note-1',
    campaignId: CAMPAIGN_ID,
    sessionDate: '2026-09-03',
    body: 'The harbourmaster wants a favour.',
    sharedWithPlayers: false,
    sessionClosedAt: null,
    planId: null,
    createdAt: new Date('2026-09-03T20:00:00.000Z'),
    updatedAt: new Date('2026-09-03T20:00:00.000Z'),
    ...overrides,
  }
}

const PLAYED: SessionNight = {
  kind: 'played',
  id: RECAP_ID,
  date: '2026-09-03',
  since: null,
  until: new Date('2026-09-03T23:00:00.000Z'),
  recap: note({
    id: RECAP_ID,
    sharedWithPlayers: true,
    sessionClosedAt: new Date('2026-09-03T23:00:00.000Z'),
    body: 'They talked the harbourmaster round.',
  }),
  plan: null,
  entries: [],
  notes: [note()],
}

beforeEach(() => {
  ;(listNights as jest.Mock).mockResolvedValue([PLAYED])
  ;(listCampaignNotes as jest.Mock).mockResolvedValue([PLAYED.recap, note()])
  ;(countPartyReadiness as jest.Mock).mockResolvedValue({ total: 4, notReady: 0 })
  ;(listPlanTallies as jest.Mock).mockResolvedValue({})
  ;(listCampaignsForDm as jest.Mock).mockResolvedValue([CAMPAIGN])
  ;(countRecapsByCampaign as jest.Mock).mockResolvedValue({})
})

describe('the Sessions tab', () => {
  it('draws the campaign’s nights and the page that came before them', async () => {
    render(await SessionsBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByText('Played · Thu 3 Sept')).toBeInTheDocument()
    expect(screen.getByText('Before · Fri 14 Aug')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Session zero/ })).toBeInTheDocument()
  })

  it('shows a note the timeline did not claim rather than losing it', async () => {
    const orphan = note({ id: 'orphan', sessionDate: '2026-07-01', body: 'A stray thought.' })
    ;(listCampaignNotes as jest.Mock).mockResolvedValue([PLAYED.recap, note(), orphan])

    render(await SessionsBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByText('Notes without a night')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /A stray thought/ })).toBeInTheDocument()
  })

  it('has no orphan group when every note is filed under a night', async () => {
    render(await SessionsBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.queryByText('Notes without a night')).not.toBeInTheDocument()
  })

  it('lists the tables behind you — closed campaigns, never the one you are running', async () => {
    ;(listCampaignsForDm as jest.Mock).mockResolvedValue([
      CAMPAIGN,
      {
        ...CAMPAIGN,
        id: CLOSED_ID,
        name: 'The tutorial night',
        closedAt: new Date('2026-08-30T18:00:00.000Z'),
      },
    ])
    ;(countRecapsByCampaign as jest.Mock).mockResolvedValue({ [CLOSED_ID]: 1 })

    render(await SessionsBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    const row = screen.getByRole('link', { name: /The tutorial night/ })
    expect(row).toHaveAttribute('href', `/dm/campaigns/${CLOSED_ID}/sessions`)
    expect(within(row).getByText('1 night')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /The Rime of the Frostmaiden/ }),
    ).not.toBeInTheDocument()
  })

  it('does not list the tables behind you on one campaign’s own timeline', async () => {
    ;(listCampaignsForDm as jest.Mock).mockResolvedValue([
      { ...CAMPAIGN, id: CLOSED_ID, name: 'The tutorial night', closedAt: new Date() },
    ])

    render(await SessionsBoard({ campaign: CAMPAIGN, dmUserId: DM, withEarlier: false }))

    expect(screen.queryByText('Earlier tables')).not.toBeInTheDocument()
    expect(listCampaignsForDm).not.toHaveBeenCalled()
  })

  it('reads a closed campaign rather than running it — no chips, nothing to press', async () => {
    const closed = { ...CAMPAIGN, closedAt: new Date('2026-08-30T18:00:00.000Z') }

    render(await SessionsBoard({ campaign: closed, dmUserId: DM, withEarlier: false }))

    expect(screen.getByText('Played · Thu 3 Sept')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Recap ✓' })).not.toBeInTheDocument()
  })

  it('draws an empty timeline rather than throwing when the campaign is not this DM’s', async () => {
    // A cookie switched between the scope read and this one: `listNights` and
    // `listCampaignNotes` both answer null, which is no nights, not an error.
    ;(listNights as jest.Mock).mockResolvedValue(null)
    ;(listCampaignNotes as jest.Mock).mockResolvedValue(null)

    render(await SessionsBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByText('Before · Fri 14 Aug')).toBeInTheDocument()
    expect(screen.queryByText('Played · Thu 3 Sept')).not.toBeInTheDocument()
  })
})
