import { render, screen } from '@testing-library/react'

import type { Campaign, CampaignHandout, CampaignLocation, Character } from '@/lib/db/schema'

import CampaignTableScreenPage from './page'

// The DM's remote page (`dm-run-suite/table-screen-cast`): DM-scoped in every
// query, and the rows it builds carry the DM's own view — the hidden badge, the
// private one-line summary — because this page is the DM's. What it hands the
// remote is ids; the public read builds everything the screen renders.

const DM = 'jamie'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const NPC_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

const CAMPAIGN = {
  id: CAMPAIGN_ID,
  dmUserId: DM,
  name: 'The Rime of the Frostmaiden',
  joinCode: null,
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  tableToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  tableSpotlight: { kind: 'npc', id: NPC_ID, at: '2026-09-07T19:00:00.000Z' },
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-07T19:00:00.000Z'),
} as Campaign

const CHARACTER = {
  id: CHARACTER_ID,
  name: 'Vex Ashbrand',
  classIndex: 'rogue',
  level: 5,
} as Character

let roster: unknown = {
  campaign: CAMPAIGN,
  members: [],
  characters: [CHARACTER],
  armor: {},
}

let npcs: unknown[] | null = [
  { id: NPC_ID, name: 'Harbourmaster Vane', summary: 'Runs the docks', revealedAt: null },
]
let locations: CampaignLocation[] | null = []
let handouts: unknown[] | null = []

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
  isDatabaseConfigured: jest.fn(() => true),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(async () => roster),
}))

jest.mock('@/lib/db/npcs', () => ({ listCampaignNpcs: jest.fn(async () => npcs) }))
jest.mock('@/lib/db/locations', () => ({ listCampaignLocations: jest.fn(async () => locations) }))
jest.mock('@/lib/db/handouts', () => ({ listCampaignHandouts: jest.fn(async () => handouts) }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

beforeEach(() => {
  roster = { campaign: CAMPAIGN, members: [], characters: [CHARACTER], armor: {} }
  npcs = [{ id: NPC_ID, name: 'Harbourmaster Vane', summary: 'Runs the docks', revealedAt: null }]
  locations = []
  handouts = [] as unknown as CampaignHandout[]
})

describe('/dm/campaigns/[id]/table', () => {
  it('renders the remote with the campaign’s own castable content', async () => {
    render(await CampaignTableScreenPage({ params: Promise.resolve({ id: CAMPAIGN_ID }) }))

    expect(screen.getByRole('heading', { name: 'Table screen' })).toBeInTheDocument()
    expect(screen.getByText('/table/kfEbCq3vX9pLm2Rt8sWz1A')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vex Ashbrand/ })).toHaveTextContent('Level 5 Rogue')

    // The stored pointer is read back, so the remote opens knowing what the
    // room is already looking at.
    expect(screen.getByText(/NPC — the table is looking at it/)).toBeInTheDocument()

    // Prep the party has not met is marked as such, on the DM's own page.
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('404s on a campaign this user does not run', async () => {
    roster = null

    await expect(
      CampaignTableScreenPage({ params: Promise.resolve({ id: CAMPAIGN_ID }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s when the app has no database', async () => {
    const { isDatabaseConfigured } = jest.requireMock('@/lib/db/client') as {
      isDatabaseConfigured: jest.Mock
    }
    isDatabaseConfigured.mockReturnValueOnce(false)

    await expect(
      CampaignTableScreenPage({ params: Promise.resolve({ id: CAMPAIGN_ID }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
