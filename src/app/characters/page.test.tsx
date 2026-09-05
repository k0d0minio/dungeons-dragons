import { render, screen } from '@testing-library/react'

import CharactersPage from './page'

// The Character stop (first-table/one-character, first-table/dm-front-door):
// one character is the sheet, none is the first-character card, the DM is sent
// behind the screen, and nothing here offers a New button.

let characters: Array<Record<string, unknown>> = []
let databaseReady = true
let dm = false

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({
    id: 'user-1',
    name: 'Ava',
    email: 'ava@example.com',
  })),
}))

jest.mock('@/lib/db/characters', () => ({
  listCharacters: jest.fn(async () => characters),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(async () => dm),
}))

jest.mock('@/lib/db/items', () => ({
  equippedArmorByCharacter: jest.fn(async () => ({
    a: [
      {
        index: 'chain-mail',
        categories: ['armor', 'heavy-armor'],
        armorClass: { base: 16, dexBonus: false, maxBonus: 0 },
      },
    ],
  })),
}))

function character(overrides: Record<string, unknown>) {
  return {
    id: 'char-1',
    name: 'Ava Delacroix',
    classIndex: 'paladin',
    speciesIndex: 'human',
    level: 1,
    currentHitPoints: 12,
    maxHitPoints: 12,
    armorClass: 10,
    speed: 30,
    knownSpellIndexes: [],
    ...overrides,
  }
}

async function renderPage() {
  try {
    render(await CharactersPage())
    return null
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT:')) return error.message
    throw error
  }
}

beforeEach(() => {
  characters = []
  databaseReady = true
  dm = false
})

describe('/characters', () => {
  it('sends the DM behind the screen', async () => {
    dm = true

    expect(await renderPage()).toBe('NEXT_REDIRECT:/dm')
    expect(jest.requireMock('@/lib/db/characters').listCharacters).not.toHaveBeenCalled()
  })

  it('is the sheet for a player with one character', async () => {
    characters = [character({ id: 'char-7' })]

    expect(await renderPage()).toBe('NEXT_REDIRECT:/characters/char-7')
  })

  it('offers a player with none their first character, and no New button', async () => {
    expect(await renderPage()).toBeNull()

    expect(screen.getByRole('heading', { name: 'Your character' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/characters/new')
    expect(screen.queryByRole('link', { name: 'New' })).not.toBeInTheDocument()
  })

  it('still lists a player who somehow owns two, reachable by nothing on the bar', async () => {
    characters = [character({ id: 'a', name: 'Ava Delacroix' }), character({ id: 'b', name: 'Bo' })]

    expect(await renderPage()).toBeNull()

    expect(screen.getByRole('heading', { name: 'Your characters' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ava Delacroix/ })).toHaveAttribute(
      'href',
      '/characters/a',
    )
    expect(screen.queryByRole('link', { name: 'New' })).not.toBeInTheDocument()
    // The AC the sheet prints (`first-table/glance-derived-ac`): Ava wears
    // chain mail over a stored 10; Bo wears nothing.
    expect(screen.getByRole('link', { name: /Ava Delacroix/ })).toHaveTextContent('AC16')
    expect(screen.getByRole('link', { name: /Bo/ })).toHaveTextContent('AC10')
  })

  it('explains a missing database instead of reading a role from it', async () => {
    databaseReady = false
    dm = true

    expect(await renderPage()).toBeNull()

    expect(screen.getByText('Not connected to a database yet')).toBeInTheDocument()
    expect(jest.requireMock('@/lib/db/roles').isDm).not.toHaveBeenCalled()
  })
})
