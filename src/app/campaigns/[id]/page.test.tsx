import { render, screen } from '@testing-library/react'

import PlayerCampaignPage from './page'

// The player's campaign page, as `first-table/session-zero-one-pager`,
// `first-table/announce-the-night` and `first-table/one-night-campaign` left
// it: the one page first, the next night under it, and a closed campaign that
// is its recap and nothing else. The queries' three arms are
// `discovered.test.ts`'s; this pins the wiring.
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

let campaign: Record<string, unknown> | null = null
let nextNight: Record<string, unknown> | null = null

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'priya' })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => true),
}))

const mockListParty = jest.fn(async () => [
  {
    id: '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c',
    name: 'Vex Ashbrand',
    level: 1,
    speciesIndex: 'elf',
    classIndex: 'wizard',
    portrait: null,
    isYours: true,
  },
])

jest.mock('@/lib/db/discovered', () => ({
  getCampaignForMember: jest.fn(async () => campaign),
  listPartyForMember: (...args: unknown[]) => mockListParty(...(args as [])),
  listDiscoveredNpcs: jest.fn(async () => []),
  listDiscoveredLocations: jest.fn(async () => []),
  listDiscoveredHandouts: jest.fn(async () => []),
  nextAnnouncedNight: jest.fn(async () => nextNight),
}))

jest.mock('@/lib/db/notes', () => ({
  listCampaignRecaps: jest.fn(async () => [
    {
      id: 'note-1',
      sessionDate: '2026-09-10',
      body: 'You met Halda. The lighthouse was lit.',
    },
  ]),
}))

const OPEN = {
  id: CAMPAIGN_ID,
  dmUserId: 'jamie',
  name: 'The Tutorial',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: 'The pitch — a lighthouse that should not be lit.\n\nPhones — face down.',
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const NIGHT = {
  id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
  campaignId: CAMPAIGN_ID,
  title: 'Session 1 - Intro',
  sessionDate: '2026-09-10',
  revealedAt: new Date('2026-09-05T19:00:00.000Z'),
}

const params = Promise.resolve({ id: CAMPAIGN_ID })

/** A card's title — a `div`, not a heading, in the shadcn card. */
function cardTitle(text: string): HTMLElement {
  return screen.getByText(text, { selector: '[data-slot="card-title"]' })
}

/** The card titles named, in the order they sit on the page. */
function cardOrder(...titles: string[]): string[] {
  return titles
    .map((title) => cardTitle(title))
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    .map((element) => element.textContent ?? '')
}

beforeEach(() => {
  campaign = OPEN
  nextNight = NIGHT
})

describe('the player campaign page', () => {
  it('opens with the one page, then the next night, then the recap, then the party', async () => {
    render(await PlayerCampaignPage({ params }))

    expect(cardOrder('The party', 'Previously on…', 'Next session', 'The one page')).toEqual([
      'The one page',
      'Next session',
      'Previously on…',
      'The party',
    ])

    expect(screen.getByText('The pitch — a lighthouse that should not be lit.')).toBeInTheDocument()
    expect(screen.getByText('Thursday 10 September — Session 1 - Intro')).toBeInTheDocument()
    expect(screen.getByText('Vex Ashbrand')).toBeInTheDocument()
  })

  it('goes back to the one character, not a list', async () => {
    render(await PlayerCampaignPage({ params }))

    expect(screen.getByRole('link', { name: /Your character$/ })).toHaveAttribute(
      'href',
      '/characters',
    )
  })

  it('shows neither card when nothing is written and nothing is announced', async () => {
    campaign = { ...OPEN, sessionZero: null }
    nextNight = null

    render(await PlayerCampaignPage({ params }))

    expect(screen.queryByText('The one page')).not.toBeInTheDocument()
    expect(screen.queryByText('Next session')).not.toBeInTheDocument()
    expect(cardTitle('The party')).toBeInTheDocument()
  })

  it('renders a closed campaign as its recap and nothing else', async () => {
    campaign = { ...OPEN, closedAt: new Date('2026-09-10T22:30:00.000Z') }

    render(await PlayerCampaignPage({ params }))

    expect(screen.getByText('This campaign has ended.')).toBeInTheDocument()
    expect(screen.getByText('You met Halda. The lighthouse was lit.')).toBeInTheDocument()

    expect(screen.queryByText('The party')).not.toBeInTheDocument()
    expect(screen.queryByText('The one page')).not.toBeInTheDocument()
    expect(screen.queryByText('Next session')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nothing discovered yet/)).not.toBeInTheDocument()
    // The party read is not even made.
    expect(mockListParty).not.toHaveBeenCalled()
  })

  it('404s a campaign the reader does not sit at', async () => {
    campaign = null

    await expect(PlayerCampaignPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
