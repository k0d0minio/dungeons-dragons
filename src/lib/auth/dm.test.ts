import { PLAYER_HOME_PATH, requireDmUser } from './dm'

// The DM-only wall (`user-management/invites-and-roles`): a signed-in player
// is sent to their characters, a DM is let through, and with no database
// there is no role to read so the page behind gets to explain itself.
let databaseReady = true
let dm = true

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

jest.mock('./server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'user-1' })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(async () => dm),
}))

beforeEach(() => {
  databaseReady = true
  dm = true
})

describe('requireDmUser', () => {
  it('returns the DM', async () => {
    await expect(requireDmUser()).resolves.toEqual({ id: 'user-1' })
  })

  it('sends a player to their characters, never a DM screen', async () => {
    dm = false

    await expect(requireDmUser()).rejects.toThrow(`NEXT_REDIRECT:${PLAYER_HOME_PATH}`)
  })

  it('lets a session through when there is no database to read a role from', async () => {
    databaseReady = false
    dm = false

    await expect(requireDmUser()).resolves.toEqual({ id: 'user-1' })
  })
})
