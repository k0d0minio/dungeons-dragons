import { render, screen, within } from '@testing-library/react'

import { PrepBoard } from './prep-board'

// What the Prep tab is about (`dm-chronology/prep-tab`): the next night on
// top, and the doors to everything already written beneath it. The data
// functions are their own tests' (`src/lib/db/prep.test.ts`) and the next-night
// rule is `next-night.test.ts`'; what is on trial here is the screen — which
// night the hero picks, what each value row says, and that every door points
// at the page it names.

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/lib/db/prep', () => ({
  countCampaignNpcs: jest.fn(),
  countCampaignLocations: jest.fn(),
  countCampaignHandouts: jest.fn(),
  countCampaignEncounters: jest.fn(),
  countPartyReadiness: jest.fn(),
}))

jest.mock('@/lib/db/session-plans', () => ({
  listSessionPlans: jest.fn(),
  getSessionPlan: jest.fn(),
}))

import {
  countCampaignEncounters,
  countCampaignHandouts,
  countCampaignLocations,
  countCampaignNpcs,
  countPartyReadiness,
} from '@/lib/db/prep'
import type { Campaign } from '@/lib/db/schema'
import { getSessionPlan, listSessionPlans } from '@/lib/db/session-plans'

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const CAMPAIGN = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
} satisfies Campaign

const PLAN = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  title: 'Session 4 — the shrine',
  sessionDate: '2099-09-10',
  strongStart: 'The door is already open.',
  treasure: null,
  revealedAt: null,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
}

/** The counts a quiet campaign has, overridden per test. */
function counts({
  npcs = { total: 0, revealed: 0 },
  places = { total: 0, revealed: 0 },
  handouts = { total: 0, revealed: 0 },
  fights = { total: 0, ready: 0 },
  party = { total: 0, notReady: 0 },
} = {}) {
  ;(countCampaignNpcs as jest.Mock).mockResolvedValue(npcs)
  ;(countCampaignLocations as jest.Mock).mockResolvedValue(places)
  ;(countCampaignHandouts as jest.Mock).mockResolvedValue(handouts)
  ;(countCampaignEncounters as jest.Mock).mockResolvedValue(fights)
  ;(countPartyReadiness as jest.Mock).mockResolvedValue(party)
}

/** The value printed beside a row, read off the row the label names. */
function valueOf(label: string): string {
  const row = screen.getByRole('link', { name: new RegExp(label) })
  return row.textContent ?? ''
}

beforeEach(() => {
  counts()
  ;(listSessionPlans as jest.Mock).mockResolvedValue([])
  ;(getSessionPlan as jest.Mock).mockResolvedValue(null)
})

describe('the Prep tab', () => {
  it('leads with the next night, its rail and what is left to write', async () => {
    ;(listSessionPlans as jest.Mock).mockResolvedValue([PLAN])
    ;(getSessionPlan as jest.Mock).mockResolvedValue({ plan: PLAN, items: [], links: [] })

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    const hero = screen.getByRole('link', { name: /Session 4 — the shrine/ })
    expect(hero).toHaveAttribute('href', `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`)
    expect(within(hero).getByText(/Next session · /)).toBeInTheDocument()
    // One of five written, and the line names what is not.
    expect(within(hero).getByText(/1 of 5 steps ready/)).toBeInTheDocument()
    expect(within(hero).getByText(/still to do: scenes, secrets/)).toBeInTheDocument()
  })

  it('names an undated night as one, rather than printing a blank date', async () => {
    // The rule's second limb: a plan started without a date fixed is still the
    // next night, and the eyebrow says so in words (`next-night.test.ts`).
    const undated = { ...PLAN, sessionDate: null }
    ;(listSessionPlans as jest.Mock).mockResolvedValue([undated])
    ;(getSessionPlan as jest.Mock).mockResolvedValue({ plan: undated, items: [], links: [] })

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByText('Next session · no date yet')).toBeInTheDocument()
  })

  it('teaches rather than throws when the scope names a campaign this DM lost', async () => {
    // `listSessionPlans` answers null for a campaign that is not this DM's —
    // a cookie switched between the scope read and this one, say. No plans is
    // no next night, which is the empty state and not an error.
    ;(listSessionPlans as jest.Mock).mockResolvedValue(null)

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByRole('heading', { name: 'Plan your next night' })).toBeInTheDocument()
  })

  it('says a fully written night is ready to run', async () => {
    ;(listSessionPlans as jest.Mock).mockResolvedValue([PLAN])
    ;(getSessionPlan as jest.Mock).mockResolvedValue({
      plan: { ...PLAN, treasure: 'A silvered dagger.' },
      items: [{ kind: 'scene' }, { kind: 'secret' }],
      links: [{ id: 'link-1' }],
    })

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByText(/5 of 5 steps ready · ready to run/)).toBeInTheDocument()
  })

  it('teaches what a plan is, with one control, when no night is coming', async () => {
    // The epic's rail: teach in the empty state, one call to action, never a
    // tour. A campaign whose plans are all behind it lands here too — there is
    // no next night, and naming one is the thing to do about that.
    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByRole('heading', { name: 'Plan your next night' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan a night' })).toBeInTheDocument()
    expect(getSessionPlan).not.toHaveBeenCalled()
  })

  it('offers one row to plan another night, and sends played ones to Sessions', async () => {
    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByRole('button', { name: /Plan another night/ })).toBeInTheDocument()
    expect(screen.getByText(/live under Sessions/)).toBeInTheDocument()
  })

  it('puts the count on every door into the world', async () => {
    counts({
      npcs: { total: 12, revealed: 4 },
      places: { total: 6, revealed: 6 },
      handouts: { total: 3, revealed: 0 },
      fights: { total: 5, ready: 2 },
      party: { total: 5, notReady: 1 },
    })

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(valueOf('NPCs')).toContain('12 · 4 revealed')
    expect(valueOf('Places')).toContain('6 · 6 revealed')
    expect(valueOf('Handouts')).toContain('3 · 0 revealed')
    expect(valueOf('Encounters')).toContain('2 ready')
    expect(valueOf('The party')).toContain('5 · 1 not ready')
  })

  it('says nothing yet rather than zero for a campaign nothing is written for', async () => {
    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(valueOf('NPCs')).toContain('None yet')
    expect(valueOf('Encounters')).toContain('None yet')
    expect(valueOf('The party')).toContain('Nobody yet')
  })

  it('calls a party with nothing to fix ready, and never in the bloodied colour', async () => {
    counts({ party: { total: 5, notReady: 0 }, fights: { total: 2, ready: 0 } })

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(valueOf('The party')).toContain('5 · all ready')
    expect(screen.getByText('5 · all ready')).not.toHaveClass('text-hp-bloodied')
    // Every fight built has been run: honest, and not "None yet".
    expect(valueOf('Encounters')).toContain('None ready')
  })

  it('colours the party row when somebody is not ready for the night', async () => {
    counts({ party: { total: 5, notReady: 1 } })

    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    expect(screen.getByText('5 · 1 not ready')).toHaveClass('text-hp-bloodied')
  })

  it('points each door at the page that already exists', async () => {
    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))

    const base = `/dm/campaigns/${CAMPAIGN_ID}`
    const href = (label: string) =>
      screen.getByRole('link', { name: new RegExp(label) }).getAttribute('href')

    expect(href('NPCs')).toBe(`${base}/npcs`)
    expect(href('Places')).toBe(`${base}/locations`)
    expect(href('Handouts')).toBe(`${base}/handouts`)
    // Building a fight is prep; running one is the Play tab's.
    expect(href('Encounters')).toBe(`${base}/encounters/new`)
    expect(href('The party')).toBe(base)
    expect(href('Session zero')).toBe(`${base}#session-zero`)
  })

  it('reports whether the one page has been written', async () => {
    render(await PrepBoard({ campaign: CAMPAIGN, dmUserId: DM }))
    expect(valueOf('Session zero')).toContain('Empty')
  })

  it('does not count six untouched headings as a written one page', async () => {
    // The card seeds the box with headings and only saves what the DM types,
    // so whitespace is not "Written".
    render(await PrepBoard({ campaign: { ...CAMPAIGN, sessionZero: '  \n ' }, dmUserId: DM }))
    expect(valueOf('Session zero')).toContain('Empty')

    render(
      await PrepBoard({ campaign: { ...CAMPAIGN, sessionZero: 'The pitch — ice' }, dmUserId: DM }),
    )
    expect(screen.getAllByText('Written')).toHaveLength(1)
  })
})
