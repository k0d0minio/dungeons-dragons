import { render, screen } from '@testing-library/react'

import Home from './page'

let sessionUser: { id: string; name?: string; email?: string } | null = null
let characters: Array<{ id: string }> = []
let databaseReady = true

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(() => sessionUser),
}))

jest.mock('@/lib/db/characters', () => ({
  listCharacters: jest.fn(() => characters),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

const redirectMock = jest.requireMock('next/navigation').redirect as jest.Mock

beforeEach(() => {
  sessionUser = null
  characters = []
  databaseReady = true
  redirectMock.mockClear()
})

async function renderHome() {
  try {
    await render(await Home())
    return null
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT:')) {
      return error.message
    }
    throw error
  }
}

describe('the front door (D33)', () => {
  it('shows a signed-out visitor the welcome screen with sign-in', async () => {
    sessionUser = null

    await renderHome()

    expect(redirectMock).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'D&D 5e Companion' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/sign-in')
    expect(screen.getByRole('link', { name: 'Request an invite' })).toHaveAttribute(
      'href',
      '/auth/sign-up',
    )
  })

  it('sends a player with one character straight to their sheet', async () => {
    sessionUser = { id: 'user-1' }
    characters = [{ id: 'char-7' }]

    const threw = await renderHome()

    expect(threw).toContain('NEXT_REDIRECT:/characters/char-7')
  })

  it('sends a player with several characters to their list', async () => {
    sessionUser = { id: 'user-1' }
    characters = [{ id: 'char-1' }, { id: 'char-2' }]

    const threw = await renderHome()

    expect(threw).toContain('NEXT_REDIRECT:/characters')
  })

  it('sends a player with no characters to creation', async () => {
    sessionUser = { id: 'user-1' }
    characters = []

    const threw = await renderHome()

    expect(threw).toContain('NEXT_REDIRECT:/characters/new')
  })

  it('sends a player to the list when the database is unprovisioned', async () => {
    sessionUser = { id: 'user-1' }
    characters = []
    databaseReady = false

    const threw = await renderHome()

    expect(threw).toContain('NEXT_REDIRECT:/characters')
  })
})
