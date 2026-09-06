import { render, screen } from '@testing-library/react'

import NewCharacterPage from './page'

// The wizard's door (first-table/dm-front-door, first-table/one-character): the
// DM never gets in, and a player who already owns a character is sent to it.

let characters: Array<{ id: string }> = []
let campaigns: Array<{ id: string; name: string }> = []
let databaseReady = true
let dm = false

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'user-1' })),
}))

jest.mock('@/lib/db/characters', () => ({
  listCharacters: jest.fn(async () => characters),
}))

jest.mock('@/lib/db/campaigns', () => ({
  listCampaignsForMember: jest.fn(async () => campaigns),
  listPartyClassIndexes: jest.fn(async () => []),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(async () => dm),
}))

jest.mock('@/components/characters/wizard/character-wizard', () => ({
  CharacterWizard: () => <div>the wizard</div>,
}))

async function renderPage(campaign?: string) {
  try {
    render(await NewCharacterPage({ searchParams: Promise.resolve({ campaign }) }))
    return null
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT:')) return error.message
    throw error
  }
}

beforeEach(() => {
  characters = []
  campaigns = []
  databaseReady = true
  dm = false
})

describe('/characters/new', () => {
  it('sends the DM behind the screen', async () => {
    dm = true

    expect(await renderPage()).toBe('NEXT_REDIRECT:/dm')
  })

  it('sends a player who already owns a character to its sheet', async () => {
    characters = [{ id: 'char-7' }]

    expect(await renderPage()).toBe('NEXT_REDIRECT:/characters/char-7')
  })

  it('sends a player who owns two to the list', async () => {
    characters = [{ id: 'a' }, { id: 'b' }]

    expect(await renderPage()).toBe('NEXT_REDIRECT:/characters')
  })

  it('opens the wizard for a player with none', async () => {
    expect(await renderPage()).toBeNull()

    expect(screen.getByText('the wizard')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Your character/ })).toHaveAttribute(
      'href',
      '/characters',
    )
  })

  it('explains a missing database before asking anything', async () => {
    databaseReady = false
    dm = true

    expect(await renderPage()).toBeNull()

    expect(screen.getByText('Not connected to a database yet')).toBeInTheDocument()
    expect(jest.requireMock('@/lib/db/roles').isDm).not.toHaveBeenCalled()
  })
})
