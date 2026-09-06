import { render, screen } from '@testing-library/react'

import JoinCampaignPage from './page'

// Where a join link lands, per role (first-table/dm-front-door): the DM
// following his own link reaches the table's page, another table's link sends
// him behind the screen, and a player gets the form with their character.

const CAMPAIGN_ID = '7c1e2d3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f'

let viewer = 'player-1'
let dm = false
let campaign: { id: string; name: string; dmUserId: string } | null = null
let characters: Array<{ id: string; name: string; level: number }> = []

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: viewer })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => true),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignByJoinCode: jest.fn(async () => campaign),
}))

jest.mock('@/lib/db/characters', () => ({
  listCharacters: jest.fn(async () =>
    characters.map((character) => ({
      ...character,
      speciesIndex: 'human',
      classIndex: 'fighter',
    })),
  ),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(async () => dm),
}))

jest.mock('@/components/campaigns/join-campaign-form', () => ({
  JoinCampaignForm: ({ characters: rows }: { characters: Array<{ name: string }> }) => (
    <div>the form: {rows.map((row) => row.name).join(', ')}</div>
  ),
}))

async function renderPage() {
  try {
    render(await JoinCampaignPage({ params: Promise.resolve({ code: 'ABCDEF' }) }))
    return null
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_')) return error.message
    throw error
  }
}

beforeEach(() => {
  viewer = 'player-1'
  dm = false
  campaign = { id: CAMPAIGN_ID, name: 'Tutorial', dmUserId: 'jamie' }
  characters = [{ id: 'char-7', name: 'Ava Delacroix', level: 1 }]
})

describe('/campaigns/join/[code]', () => {
  it('404s a dead code before reading the role', async () => {
    campaign = null

    expect(await renderPage()).toBe('NEXT_NOT_FOUND')
    expect(jest.requireMock('@/lib/db/roles').isDm).not.toHaveBeenCalled()
  })

  it('sends the DM following his own link to the table’s page', async () => {
    viewer = 'jamie'
    dm = true

    expect(await renderPage()).toBe(`NEXT_REDIRECT:/dm/campaigns/${CAMPAIGN_ID}`)
  })

  it('sends a DM following somebody else’s link behind the screen', async () => {
    viewer = 'other-dm'
    dm = true

    expect(await renderPage()).toBe('NEXT_REDIRECT:/dm')
  })

  it('gives a player the form, with their character on it', async () => {
    expect(await renderPage()).toBeNull()

    // A card's title is a div, not a heading, in the shadcn card.
    expect(screen.getByText('Join Tutorial')).toBeInTheDocument()
    expect(screen.getByText('the form: Ava Delacroix')).toBeInTheDocument()
  })
})
