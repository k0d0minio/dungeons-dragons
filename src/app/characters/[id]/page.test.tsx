import { render, screen } from '@testing-library/react'

import CharacterSheetPage from './page'

// The sheet page's wiring (first-table/dm-front-door, first-table/one-character):
// a player has no back link — the Character stop is this sheet — and a DM
// reading a party member's sheet goes back to the campaign, the one the link
// named where it did. The sheet itself is its own tests'.

const OWNER = 'user_ava'
const DM = 'jamie'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

let viewer = OWNER
let character: Record<string, unknown> | null = null
let dmCampaigns: Array<{ id: string; name: string }> = []

jest.mock('next/navigation', () => ({
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

jest.mock('@/lib/db/characters', () => ({
  getCharacter: jest.fn(async () => character),
}))

jest.mock('@/lib/db/campaigns', () => ({
  gatesForCharacter: jest.fn(async () => ({})),
  milestoneForCharacter: jest.fn(async () => null),
  listCampaignsForCharacter: jest.fn(async () => []),
  listCampaignsRunByForCharacter: jest.fn(async () => dmCampaigns),
}))

jest.mock('@/lib/db/items', () => ({
  listItems: jest.fn(async () => []),
}))

jest.mock('@/lib/db/notes', () => ({
  getCharacterNotes: jest.fn(async () => ''),
  listSharedNotesForCharacter: jest.fn(async () => []),
}))

jest.mock('@/lib/db/discovered', () => ({
  nextAnnouncedNightsForCharacter: jest.fn(async () => ({})),
}))

jest.mock('@/components/characters/sheet/character-sheet', () => ({
  CharacterSheet: () => <div>the sheet</div>,
}))

jest.mock('@/components/characters/sheet/welcome-band', () => ({
  WelcomeBand: () => null,
}))

jest.mock('@/components/characters/sheet/level-up-waiting-band', () => ({
  LevelUpWaitingBand: () => null,
}))

function renderPage(campaign?: string) {
  return CharacterSheetPage({
    params: Promise.resolve({ id: CHARACTER_ID }),
    searchParams: Promise.resolve({ campaign }),
  })
}

beforeEach(() => {
  viewer = OWNER
  character = {
    id: CHARACTER_ID,
    ownerId: OWNER,
    name: 'Ava Delacroix',
    level: 1,
    speciesIndex: 'human',
    classIndex: 'paladin',
  }
  dmCampaigns = []
})

describe('/characters/[id]', () => {
  it('404s a character the viewer may not see', async () => {
    character = null

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('gives the owner no back link — the Character stop is this sheet', async () => {
    render(await renderPage())

    expect(screen.getByRole('heading', { name: 'Ava Delacroix' })).toBeInTheDocument()
    expect(screen.getByText('the sheet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Your character/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/characters/${CHARACTER_ID}/edit`,
    )
    expect(
      jest.requireMock('@/lib/db/campaigns').listCampaignsRunByForCharacter,
    ).not.toHaveBeenCalled()
  })

  it('sends the DM back to the campaign the link named', async () => {
    viewer = DM
    dmCampaigns = [
      { id: 'a', name: 'Alpha table' },
      { id: 'b', name: 'Tutorial' },
    ]

    render(await renderPage('b'))

    expect(screen.getByRole('link', { name: /Tutorial/ })).toHaveAttribute(
      'href',
      '/dm/campaigns/b',
    )
  })

  it('falls back to the first campaign by name when the link named none', async () => {
    viewer = DM
    dmCampaigns = [
      { id: 'a', name: 'Alpha table' },
      { id: 'b', name: 'Tutorial' },
    ]

    render(await renderPage())

    expect(screen.getByRole('link', { name: /Alpha table/ })).toHaveAttribute(
      'href',
      '/dm/campaigns/a',
    )
  })
})
