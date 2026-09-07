import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'

import { DmTab } from '@/components/dm/dm-tab'

import DmPlayPage from './page'

// The Play tab (`dm-chronology/play-tab`). Two things are on trial here, and
// both are the page's rather than any one section's:
//
// 1. **The order.** The fight, the party, tonight's plan, reveal — the order a
//    hand reaches for things mid-session, not the order the data was written.
// 2. **What crosses to the client.** Every read below is scoped to the DM, and
//    the one DM-only column the page hands a browser is the plan's strong
//    start, which is printed behind `SecretLayer`. The reveal sheet gets names,
//    the fights get labels, and the party gets the sheet's own numbers.
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a'
const TODAY = '2026-09-10'

const CAMPAIGN = {
  id: CAMPAIGN_ID,
  name: 'The Rime of the Frostmaiden',
  dmUserId: 'jamie',
  milestoneLevel: 4,
  closedAt: null,
}

const PLAN = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  title: 'Session 3 — the lighthouse',
  sessionDate: TODAY,
  strongStart: 'The lighthouse is dark, and the Marigold is already on the rocks.',
  treasure: 'A smuggler’s ledger.',
  revealedAt: null,
  createdAt: new Date('2026-09-05T10:00:00.000Z'),
  updatedAt: new Date('2026-09-05T10:00:00.000Z'),
}

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

let plans: unknown[] = [PLAN]
let fights: unknown[] = [FIGHT]

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'jamie' })),
}))

jest.mock('@/lib/db/client', () => ({ isDatabaseConfigured: jest.fn(() => true) }))

jest.mock('@/lib/dm/scope', () => ({
  resolveDmScope: jest.fn(async () => ({
    campaign: CAMPAIGN,
    otherCampaigns: [],
    carryable: [],
  })),
}))

jest.mock('@/lib/notes/schema', () => ({
  ...jest.requireActual('@/lib/notes/schema'),
  todaySessionDate: () => TODAY,
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(async () => ({ campaign: CAMPAIGN, members: [], characters: [] })),
}))

jest.mock('@/lib/db/encounters', () => ({ listOpenFights: jest.fn(async () => fights) }))

jest.mock('@/lib/db/session-plans', () => ({
  listSessionPlans: jest.fn(async () => plans),
  getSessionPlan: jest.fn(async () => ({ plan: PLAN, items: [], links: [] })),
}))

jest.mock('@/lib/db/reveals', () => ({
  ...jest.requireActual('@/lib/db/reveals'),
  listHiddenReveals: jest.fn(async () => [
    { kind: 'npc', id: 'npc-1', name: 'Bram the innkeeper' },
  ]),
}))

jest.mock('@/lib/db/users', () => ({ getUserNames: jest.fn(async () => ({})) }))

beforeEach(() => {
  plans = [PLAN]
  fights = [FIGHT]
})

/**
 * The page is its title and its content: a `DmTab` element whose child is the
 * board. `DmTab` is an async server component, so the test resolves it by
 * calling it with the props the page gave it — the same thing the server does,
 * one await earlier than jsdom can do on its own.
 */
async function renderPlayTab() {
  const page = (await DmPlayPage()) as ReactElement<Parameters<typeof DmTab>[0]>

  return render(await DmTab(page.props))
}

describe('the Play tab', () => {
  it('is the sections in the order a hand reaches for them', async () => {
    await renderPlayTab()

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

  it('names the campaign it is scoped to, and carries the toolbar', async () => {
    await renderPlayTab()

    expect(screen.getByRole('heading', { name: 'Play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Campaign: ${CAMPAIGN.name}` })).toBeInTheDocument()

    for (const label of ['Quick note', 'Reveal', 'Table screen']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Crib' })).toHaveAttribute('href', '/dm/crib')
  })

  it('shows the fight on the table, saying whose turn it is', async () => {
    await renderPlayTab()

    expect(screen.getByText('Round 2 · Aldric’s turn')).toBeInTheDocument()
  })

  it('prints the strong start only behind the DM-only marking', async () => {
    const { container } = await renderPlayTab()

    const secret = screen.getByRole('heading', { name: 'Behind the screen' }).closest('section')!
    expect(secret).toHaveTextContent(PLAN.strongStart)

    // Once on the page, and inside that block: the one DM-only column that
    // reaches a browser here does so marked.
    expect(container.textContent?.split(PLAN.strongStart)).toHaveLength(2)
  })

  it('keeps the treasure off the screen the night is run from', async () => {
    const { container } = await renderPlayTab()

    // Treasure is prep, not a thing tapped mid-session; the whole plan is one
    // link away for it.
    expect(container.textContent).not.toContain(PLAN.treasure)
  })

  it('says there is no plan for tonight rather than showing last week’s', async () => {
    plans = [{ ...PLAN, sessionDate: '2026-09-03' }]

    await renderPlayTab()

    expect(screen.getByText(/Nothing prepped for tonight/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan a night in Prep' })).toBeInTheDocument()
  })

  it('offers no table screen link when no fight has been started', async () => {
    fights = [
      { ...FIGHT, encounter: { ...FIGHT.encounter, round: 1, activeTurn: 0 }, combatants: [] },
    ]

    await renderPlayTab()

    expect(screen.getByText(/No fight on the table/)).toBeInTheDocument()
  })
})
