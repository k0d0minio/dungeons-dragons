import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { formatDiscoveredOn } from '@/lib/campaigns/discovered'

import CampaignSettingsPage from './page'

// The grouped between-sessions page (`dm-chronology/campaign-settings`, D48).
//
// Three things are on trial here and nothing else: the value each row shows
// without being opened, the shape a *closed* campaign takes, and that every
// control behind a row still posts to the route it posted to on the hub. The
// controls themselves are their own tests'.
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const CLOSED_AT = new Date('2026-09-07T21:00:00.000Z')

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

// The milestone card polls the glance's SWR key; the page is what is on trial,
// so it is stood in for by something that records what it was handed.
jest.mock('@/components/campaigns/campaign-milestone-card', () => ({
  CampaignMilestoneCard: (props: { campaignId: string; milestoneLevel: number | null }) => (
    <div
      data-testid="milestone-card"
      data-campaign={props.campaignId}
      data-level={String(props.milestoneLevel)}
    />
  ),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignForDm: jest.fn(async () => campaign),
  getCampaignRoster: jest.fn(async () =>
    campaign ? { campaign, members, characters, armor: {} } : null,
  ),
  listCampaignsForDm: jest.fn(async () => everyCampaign),
}))

jest.mock('@/lib/dm/scope', () => ({
  resolveDmScope: jest.fn(async () => ({
    campaign: campaign?.closedAt === null ? campaign : null,
    otherCampaigns: [],
    carryable: [],
  })),
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

jest.mock('@/lib/db/users', () => ({
  getUserName: jest.fn(async (userId: string) => (userId === 'ellie' ? 'Ellie' : 'Sam')),
}))

const OPEN = {
  id: CAMPAIGN_ID,
  dmUserId: 'jamie',
  name: 'The Tutorial',
  joinCode: 'kfEbCq3vX9pLm2Rt8sWz1A',
  gates: { conditions: true, currency: true } as Record<string, boolean> | null,
  milestoneLevel: 4,
  closedAt: null as Date | null,
  sessionZero: 'The pitch — a lighthouse that will not light.',
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const CHARACTER = {
  id: CHARACTER_ID,
  ownerId: 'ellie',
  name: 'Vex Ashbrand',
  classIndex: 'rogue',
  speciesIndex: 'half-elf',
  level: 3,
}

let campaign: Record<string, unknown> | null = null
let members: { campaignId: string; userId: string; role: string }[] = []
let characters: Record<string, unknown>[] = []
/** Every table this DM runs, with its headcount, for the carry-forward row. */
let everyCampaign: Record<string, unknown>[] = []

const FULLER = {
  ...OPEN,
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  name: 'The Thursday table',
  playerCount: 4,
  characterCount: 4,
}

function seatedTable() {
  members = [
    { campaignId: CAMPAIGN_ID, userId: 'jamie', role: 'dm' },
    { campaignId: CAMPAIGN_ID, userId: 'ellie', role: 'player' },
  ]
  characters = [CHARACTER]
}

/** Open a row's sheet by the label the list draws on it. */
async function openRow(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name }))
}

/**
 * Stand in for the network and record where each control posted, so "reaches
 * the same route it did on the hub" is asserted against the real component
 * rather than a mock of it.
 */
const posted: string[] = []

function answerFetchWith(payload: unknown) {
  global.fetch = jest.fn(async (url: string) => {
    posted.push(url)
    return { ok: true, json: async () => payload } as Response
  }) as unknown as typeof fetch
}

beforeEach(() => {
  campaign = { ...OPEN }
  members = []
  characters = []
  everyCampaign = [{ ...OPEN, playerCount: 0, characterCount: 0 }]
  posted.length = 0
})

function renderPage(search: { id?: string; from?: string } = {}) {
  return CampaignSettingsPage({ searchParams: Promise.resolve(search) }).then(render)
}

describe('the campaign settings page', () => {
  it('states every value on its row, without anything being opened', async () => {
    campaign = { ...OPEN }
    await renderPage()

    // Label left, current state right: the question is answered by the list.
    expect(screen.getByRole('button', { name: /Name\s*The Tutorial/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Session zero.*Written/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Milestone.*Level 4/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Player features.*2 of 6 on/ })).toBeInTheDocument()
  })

  it('says so plainly when nothing has been written, set or switched on', async () => {
    campaign = { ...OPEN, sessionZero: null, milestoneLevel: null, gates: null }
    await renderPage()

    expect(screen.getByRole('button', { name: /Session zero.*Empty/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Milestone.*Not set/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Player features.*0 of 6 on/ })).toBeInTheDocument()
  })

  it('names the account, the character and the class on one row into the DM’s profile', async () => {
    seatedTable()
    await renderPage()

    const row = screen.getByRole('link', { name: /Ellie/ })
    expect(row).toHaveAttribute('href', `/dm/campaigns/${CAMPAIGN_ID}/party/${CHARACTER_ID}`)
    expect(row).toHaveTextContent('Vex Ashbrand · Level 3 Rogue')
    // The DM's own seat is not a player at his own table.
    expect(screen.queryByText('Sam')).not.toBeInTheDocument()
  })

  it('says a seated player has no character yet rather than linking nowhere', async () => {
    members = [{ campaignId: CAMPAIGN_ID, userId: 'ellie', role: 'player' }]
    characters = []
    await renderPage()

    expect(screen.getByText('No character yet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ellie/ })).not.toBeInTheDocument()
  })

  it('goes back to the tab it was opened from, and to Play for anything else', async () => {
    await renderPage({ from: '/dm/prep' })
    expect(screen.getByRole('link', { name: 'Prep' })).toHaveAttribute('href', '/dm/prep')

    screen.getByRole('link', { name: 'Prep' }).remove()

    // A `from` that is not one of the DM's tabs is ignored, not followed.
    await renderPage({ from: 'https://example.com/phish' })
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('href', '/dm/play')
  })

  it('reaches a closed campaign by id, and offers it no join link', async () => {
    campaign = { ...OPEN, closedAt: CLOSED_AT }
    await renderPage({ id: CAMPAIGN_ID })

    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText(formatDiscoveredOn(CLOSED_AT))).toBeInTheDocument()
    // A closed campaign answers no join code, so it is offered none — and no
    // invite either, which would mint a link to a table that has ended.
    expect(screen.queryByRole('button', { name: /Join link/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Invite someone/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Close this campaign/ })).not.toBeInTheDocument()
  })

  // The carry-forward came off the retired hub with the rest of the
  // between-sessions controls (`dm-chronology/retire-the-hub`).
  it('offers the carry from a fuller table of the DM’s, beside the invites', async () => {
    everyCampaign = [{ ...OPEN, playerCount: 0, characterCount: 0 }, FULLER]
    await renderPage()

    expect(screen.getByRole('button', { name: /Carry a table forward/ })).toBeInTheDocument()
  })

  it('offers no carry when no other table of the DM’s is fuller than this one', async () => {
    everyCampaign = [
      { ...OPEN, playerCount: 0, characterCount: 0 },
      { ...FULLER, playerCount: 0, characterCount: 0 },
    ]
    await renderPage()

    expect(screen.queryByRole('button', { name: /Carry a table forward/ })).not.toBeInTheDocument()
  })

  it('offers no carry into a closed campaign — its join link is dead too', async () => {
    campaign = { ...OPEN, closedAt: CLOSED_AT }
    everyCampaign = [{ ...OPEN, playerCount: 0, characterCount: 0 }, FULLER]
    await renderPage({ id: CAMPAIGN_ID })

    expect(screen.queryByRole('button', { name: /Carry a table forward/ })).not.toBeInTheDocument()
  })

  it('404s when there is no campaign to settle at all', async () => {
    campaign = null

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('the controls behind the rows', () => {
  it('switches a gate on the route the hub’s settings screen posted to', async () => {
    const user = userEvent.setup()
    answerFetchWith({})

    await renderPage()
    await openRow(user, /Player features/)

    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByLabelText('Conditions and exhaustion'))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toBe(`/api/campaigns/${CAMPAIGN_ID}/gates`)
  })

  it('saves the one page on its own route', async () => {
    const user = userEvent.setup()
    answerFetchWith({ campaign: { sessionZero: 'x' } })

    await renderPage()
    await openRow(user, /Session zero/)

    const sheet = await screen.findByRole('dialog')
    await user.type(within(sheet).getByLabelText('The one page'), ' A wreck on the rocks.')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toBe(`/api/campaigns/${CAMPAIGN_ID}/session-zero`)
  })

  it('regenerates the join link on its own route', async () => {
    const user = userEvent.setup()
    answerFetchWith({ campaign: { joinCode: 'new' } })

    await renderPage()
    await openRow(user, /Join link/)

    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: 'Regenerate' }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toBe(`/api/campaigns/${CAMPAIGN_ID}/join-code`)
  })

  it('hands the milestone control the campaign and the level it already holds', async () => {
    await renderPage()

    // Behind a closed sheet nothing is mounted, which is the point: the card
    // polls, and a settings page must not.
    expect(screen.queryByTestId('milestone-card')).not.toBeInTheDocument()

    const user = userEvent.setup()
    await openRow(user, /Milestone/)

    const card = await screen.findByTestId('milestone-card')
    expect(card).toHaveAttribute('data-campaign', CAMPAIGN_ID)
    expect(card).toHaveAttribute('data-level', '4')
  })

  it('opens the close-campaign card with the session log’s draft in the box', async () => {
    const user = userEvent.setup()

    await renderPage()
    await openRow(user, /Close this campaign/)

    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByLabelText('Recap')).toHaveValue('Halda lied about the lighthouse.')
  })

  // One link that makes the account *and* seats them here
  // (`dm-chronology/one-link-invite`): the row is a sheet on this page now, not
  // a chevron off to `/dm/users`.
  it('mints an invite carrying this campaign, from the row itself', async () => {
    const user = userEvent.setup()
    answerFetchWith({ invite: { token: 'BBBBBBBBBBBBBBBBBBBBBB' } })

    await renderPage()
    await openRow(user, /Invite someone/)

    const sheet = await screen.findByRole('dialog')
    await user.type(within(sheet).getByLabelText('Who is it for?'), 'Sam')
    await user.click(within(sheet).getByRole('button', { name: 'Make invite link' }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toBe('/api/dm/invites')
    expect(within(sheet).getByText('/invite/BBBBBBBBBBBBBBBBBBBBBB')).toBeInTheDocument()
  })

  it('carries a fuller table across on the route the hub’s card posted to', async () => {
    const user = userEvent.setup()
    everyCampaign = [{ ...OPEN, playerCount: 0, characterCount: 0 }, FULLER]
    answerFetchWith({})

    await renderPage()
    await openRow(user, /Carry a table forward/)

    const sheet = await screen.findByRole('dialog')
    await user.click(
      within(sheet).getByRole('button', { name: 'Carry the table across from The Thursday table' }),
    )

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toBe(`/api/campaigns/${CAMPAIGN_ID}/carry-from`)
  })

  it('renames from the first row, on the campaign’s own route', async () => {
    const user = userEvent.setup()
    answerFetchWith({ campaign: { name: 'The Thursday Table' } })

    await renderPage()
    await openRow(user, /Name/)

    const sheet = await screen.findByRole('dialog')
    const field = within(sheet).getByLabelText('Name')
    await user.clear(field)
    await user.type(field, 'The Thursday Table')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toBe(`/api/campaigns/${CAMPAIGN_ID}`)
  })
})
