import { render, screen } from '@testing-library/react'

import { PlayBoard } from './play-board'

// What the Play tab is about (`dm-chronology/play-tab`). Two things are on
// trial here, and both are the board's rather than any one section's:
//
// 1. **The order.** The fight, the party, tonight's plan, reveal — the order a
//    hand reaches for things mid-session, not the order the data was written.
// 2. **What crosses to the client.** Every read is scoped to the DM, and the
//    one DM-only column the board hands a browser is the plan's strong start,
//    which is printed behind `SecretLayer`. The reveal sheet gets names, the
//    fights get labels, and the party gets the sheet's own numbers.
//
// The data functions are their own tests' and the sections are theirs.

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))

jest.mock('@/lib/db/campaigns', () => ({ getCampaignRoster: jest.fn() }))
jest.mock('@/lib/db/encounters', () => ({ listOpenFights: jest.fn() }))
jest.mock('@/lib/db/reveals', () => ({
  ...jest.requireActual('@/lib/db/reveals'),
  listHiddenReveals: jest.fn(),
}))
jest.mock('@/lib/db/session-plans', () => ({
  listSessionPlans: jest.fn(),
  getSessionPlan: jest.fn(),
}))
jest.mock('@/lib/db/users', () => ({ getUserNames: jest.fn(async () => ({})) }))
jest.mock('@/lib/notes/schema', () => ({
  ...jest.requireActual('@/lib/notes/schema'),
  todaySessionDate: () => '2026-09-10',
}))

import { getCampaignRoster } from '@/lib/db/campaigns'
import { listOpenFights } from '@/lib/db/encounters'
import { listHiddenReveals } from '@/lib/db/reveals'
import type { Campaign, CampaignSessionPlan } from '@/lib/db/schema'
import { getSessionPlan, listSessionPlans } from '@/lib/db/session-plans'

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a'
const TODAY = '2026-09-10'

const CAMPAIGN = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: 4,
  closedAt: null,
  sessionZero: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
} satisfies Campaign

const PLAN = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  title: 'Session 3 — the lighthouse',
  sessionDate: TODAY,
  strongStart: 'The lighthouse is dark, and the Marigold is already on the rocks.',
  treasure: 'A smuggler’s ledger worth 50 gp to the right person.',
  revealedAt: null,
  createdAt: new Date('2026-09-05T10:00:00.000Z'),
  updatedAt: new Date('2026-09-05T10:00:00.000Z'),
} satisfies CampaignSessionPlan

const FIGHT = {
  encounter: {
    id: 'live',
    campaignId: CAMPAIGN_ID,
    name: 'Ambush at the bridge',
    round: 2,
    activeTurn: 0,
    shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
    completedAt: null,
    createdAt: new Date('2026-09-10T18:00:00.000Z'),
    updatedAt: new Date('2026-09-10T18:00:00.000Z'),
  },
  combatants: [{ label: 'Aldric', initiative: 18 }],
}

beforeEach(() => {
  ;(getCampaignRoster as jest.Mock).mockResolvedValue({
    campaign: CAMPAIGN,
    members: [],
    characters: [],
    armor: {},
  })
  ;(listOpenFights as jest.Mock).mockResolvedValue([FIGHT])
  ;(listSessionPlans as jest.Mock).mockResolvedValue([PLAN])
  ;(getSessionPlan as jest.Mock).mockResolvedValue({ plan: PLAN, items: [], links: [] })
  ;(listHiddenReveals as jest.Mock).mockResolvedValue([
    { kind: 'npc', id: 'npc-1', name: 'Bram the innkeeper' },
  ])
})

async function renderBoard() {
  return render(await PlayBoard({ campaign: CAMPAIGN, dmUserId: DM }))
}

describe('PlayBoard', () => {
  it('is the sections in the order a hand reaches for them', async () => {
    await renderBoard()

    const sections = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)

    expect(sections).toEqual([
      'The fight',
      'Start a fight',
      'The party',
      'Tonight’s plan',
      'Reveal',
    ])
  })

  it('scopes every read to the DM asking, not to the campaign’s own column', async () => {
    await renderBoard()

    for (const read of [getCampaignRoster, listOpenFights, listSessionPlans, listHiddenReveals]) {
      expect(read).toHaveBeenCalledWith(DM, CAMPAIGN_ID)
    }
  })

  it('carries the toolbar’s four actions', async () => {
    await renderBoard()

    for (const label of ['Quick note', 'Reveal', 'Table screen']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Crib' })).toHaveAttribute('href', '/dm/crib')
  })

  it('shows the fight on the table, saying whose turn it is', async () => {
    await renderBoard()

    expect(screen.getByText('Round 2 · Aldric’s turn')).toBeInTheDocument()
  })

  it('prints the strong start once, and only behind the DM-only marking', async () => {
    const { container } = await renderBoard()

    const secret = screen.getByRole('heading', { name: 'Behind the screen' }).closest('section')!
    expect(secret).toHaveTextContent(PLAN.strongStart)
    expect(container.textContent?.split(PLAN.strongStart)).toHaveLength(2)
  })

  it('keeps the treasure off the screen the night is run from', async () => {
    const { container } = await renderBoard()

    // Treasure is prep, not a thing tapped mid-session; the whole plan is one
    // link away for it.
    expect(container.textContent).not.toContain(PLAN.treasure)
  })

  it('says there is no plan for tonight rather than showing last week’s', async () => {
    ;(listSessionPlans as jest.Mock).mockResolvedValue([{ ...PLAN, sessionDate: '2026-09-03' }])

    await renderBoard()

    expect(screen.getByText(/Nothing prepped for tonight/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan a night in Prep' })).toBeInTheDocument()
    expect(getSessionPlan).not.toHaveBeenCalled()
  })

  it('offers no table screen when nothing has been started', async () => {
    ;(listOpenFights as jest.Mock).mockResolvedValue([
      { ...FIGHT, encounter: { ...FIGHT.encounter, round: 1, activeTurn: 0 }, combatants: [] },
    ])

    await renderBoard()

    expect(screen.getByText(/No fight on the table/)).toBeInTheDocument()
  })
})
