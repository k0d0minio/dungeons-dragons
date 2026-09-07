import { render, screen } from '@testing-library/react'

import type { Character } from '@/lib/db/schema'

import DmPartyPage from './page'

// The party on a page of its own (`dm-chronology/eight-steps-plan`) — the door
// the Lazy DM's first step, review the characters, needed and did not have.
//
// What is on trial: the DM scope (another DM's campaign id is a 404, not a
// roster), and that the page is the glance the campaign hub already showed
// rather than a second summary of the same characters.

const DM = 'user_2mFq8xKpLd'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

let roster: unknown = null
let configured = true

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
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

// The glance polls its own route; the page under test only hands it the roster.
jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: string, _fetcher: unknown, options: { fallbackData?: unknown }) => ({
    data: options?.fallbackData,
  }),
}))

const AVA = {
  id: CHARACTER_ID,
  name: 'Ava Delacroix',
  classIndex: 'paladin',
  speciesIndex: 'human',
  level: 1,
  maxHitPoints: 12,
  currentHitPoints: 9,
  temporaryHitPoints: 0,
  armorClass: 10,
  dexterity: 10,
  wisdom: 12,
  conditions: [],
  skillProficiencies: [],
  skillExpertise: [],
} as unknown as Character

function page(params = { id: CAMPAIGN_ID }) {
  return DmPartyPage({ params: Promise.resolve(params) })
}

beforeEach(() => {
  configured = true
  roster = {
    campaign: { id: CAMPAIGN_ID, name: 'Rime of the Frostmaiden', dmUserId: DM },
    members: [],
    characters: [AVA],
    armor: {},
  }
})

describe('the DM’s party page', () => {
  it('names the campaign and how many characters are on it', async () => {
    render(await page())

    expect(screen.getByText(/Rime of the Frostmaiden · 1 character/)).toBeInTheDocument()
  })

  it('is the glance, with every row a door to that character’s own page', async () => {
    render(await page())

    expect(screen.getByRole('link', { name: /Ava Delacroix/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/party/${CHARACTER_ID}`,
    )
  })

  it('404s a campaign this DM does not run, rather than showing an empty party', async () => {
    roster = null

    await expect(page()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('404s rather than reaching for a database that is not configured', async () => {
    configured = false

    await expect(page()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
