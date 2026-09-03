import { render, screen } from '@testing-library/react'

import DmCribPage from './page'

// The gate, and only the gate (`dm-run-suite/dm-rules-crib`). What the crib
// says is `crib.test.ts`'s and `rules-crib.test.tsx`'s; this asserts who gets
// to see it — and that a player is told whose screen it is rather than 404ed,
// the same posture `/dm` takes (D19).

let role: 'dm' | 'player' = 'dm'
let databaseReady = true

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(() => ({ id: 'user-1' })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/roles', () => ({
  getUserRole: jest.fn(() => role),
}))

beforeEach(() => {
  role = 'dm'
  databaseReady = true
})

describe('the crib page', () => {
  it('gives a DM the crib itself', async () => {
    render(await DmCribPage())

    expect(screen.getByRole('navigation', { name: 'Jump to' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Something landed a condition' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'DM' })).toHaveAttribute('href', '/dm')
  })

  it('tells a player whose screen it is, and points them at the chapters', async () => {
    role = 'player'

    render(await DmCribPage())

    expect(screen.getByText("This side of the screen is the DM's")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'rules chapters' })).toHaveAttribute('href', '/rules')
    expect(screen.queryByRole('navigation', { name: 'Jump to' })).not.toBeInTheDocument()
  })

  it('says so when there is no database to read the role from', async () => {
    databaseReady = false

    render(await DmCribPage())

    expect(screen.getByText('Not connected to a database yet')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Jump to' })).not.toBeInTheDocument()
  })
})
