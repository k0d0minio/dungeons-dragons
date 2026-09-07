import { render, screen } from '@testing-library/react'

import NewEncounterPage from './page'

// The encounter builder's page (`dm-prep-suite/encounter-builder`), and the
// one thing `dm-chronology/eight-steps-plan` added to it: **`?plan=` is where
// the fight came from**.
//
// The plan is read through the DM-scoped read rather than trusted from the
// query string, which is the property on trial here — a plan id belonging to
// somebody else's table is simply not a plan, and the page builds a fight for
// the campaign as if the parameter were absent.

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

let roster: unknown = null
let plan: unknown = null
let configured = true

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: DM })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => configured),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(async () => roster),
}))

jest.mock('@/lib/db/session-plans', () => ({
  getSessionPlan: jest.fn(async () => plan),
}))

// The builder itself is its own test's; this one is about what the page hands it.
jest.mock('@/components/encounters/encounter-builder', () => ({
  EncounterBuilder: ({ planId }: { planId?: string }) => (
    <div data-testid="builder" data-plan={planId ?? 'none'} />
  ),
}))

import { getSessionPlan } from '@/lib/db/session-plans'

function page(query: { plan?: string | string[] } = {}) {
  return NewEncounterPage({
    params: Promise.resolve({ id: CAMPAIGN_ID }),
    searchParams: Promise.resolve(query),
  })
}

beforeEach(() => {
  configured = true
  plan = null
  roster = {
    campaign: { id: CAMPAIGN_ID, name: 'Rime of the Frostmaiden', dmUserId: DM },
    members: [],
    characters: [{ id: 'char-1', name: 'Ava', level: 1 }],
    armor: {},
  }
})

describe('the encounter builder’s page', () => {
  it('builds a fight for the campaign when no night asked for one', async () => {
    render(await page())

    expect(screen.getByTestId('builder')).toHaveAttribute('data-plan', 'none')
    // Building a fight is prep, so the way out is Prep — not the campaign hub,
    // which is a redirect now (`dm-chronology/retire-the-hub`).
    expect(screen.getByRole('link', { name: /Prep/ })).toHaveAttribute('href', '/dm/prep')
    expect(getSessionPlan).not.toHaveBeenCalled()
  })

  it('carries the night through, and says the fight will be linked to it', async () => {
    plan = { plan: { id: PLAN_ID, title: 'Session 4 — the shrine' }, items: [], links: [] }

    render(await page({ plan: PLAN_ID }))

    expect(screen.getByTestId('builder')).toHaveAttribute('data-plan', PLAN_ID)
    expect(screen.getByText(/it will be linked to the night/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Session 4/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`,
    )
  })

  it('ignores a plan id that is not this DM’s, rather than 404ing the builder', async () => {
    // `getSessionPlan` is DM-scoped and answers null for somebody else's night.
    plan = null

    render(await page({ plan: PLAN_ID }))

    expect(screen.getByTestId('builder')).toHaveAttribute('data-plan', 'none')
  })

  it('ignores a repeated plan parameter rather than guessing which one is meant', async () => {
    render(await page({ plan: [PLAN_ID, 'other'] }))

    expect(screen.getByTestId('builder')).toHaveAttribute('data-plan', 'none')
    expect(getSessionPlan).not.toHaveBeenCalled()
  })

  it('404s a campaign this DM does not run', async () => {
    roster = null

    await expect(page()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
