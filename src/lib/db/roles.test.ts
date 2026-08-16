import { getUserRole, isDm } from './roles'

// The same real-Drizzle-over-a-stub-driver pattern as `characters.test.ts`:
// what matters here is that the lookup is scoped to the user asked about, and
// that anything short of a well-formed 'dm' row reads as a player — absence of
// a row is the default that makes every future sign-up a player (D19).
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRows }
}

jest.mock('./client', () => {
  let db: ReturnType<typeof import('drizzle-orm/neon-http').drizzle> | undefined

  return {
    getDb: () => {
      const { drizzle } = require('drizzle-orm/neon-http')
      db ??= drizzle(mockClient)
      return db
    },
    isDatabaseConfigured: () => true,
  }
})

const USER = 'user_2mFq8xKpLd'

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
})

describe('getUserRole', () => {
  it('scopes the lookup to the user asked about', async () => {
    mockRows = [['dm']]

    await getUserRole(USER)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('from "user_roles"')
    expect(sql).toContain('"user_roles"."user_id" = $1')
    expect(params).toEqual([USER, 1])
  })

  it('reads the absence of a row as player, by design (D19)', async () => {
    await expect(getUserRole(USER)).resolves.toBe('player')
  })

  it('reads a dm row as dm', async () => {
    mockRows = [['dm']]

    await expect(getUserRole(USER)).resolves.toBe('dm')
  })

  it('reads a player row as player', async () => {
    mockRows = [['player']]

    await expect(getUserRole(USER)).resolves.toBe('player')
  })

  it('reads a role it does not recognise as player, never as dm', async () => {
    // The check constraint should make this impossible, but if a row ever says
    // something else, the safe reading is the unprivileged one.
    mockRows = [['wizard']]

    await expect(getUserRole(USER)).resolves.toBe('player')
  })
})

describe('isDm', () => {
  it('is true only for a dm row', async () => {
    mockRows = [['dm']]
    await expect(isDm(USER)).resolves.toBe(true)

    mockRows = [['player']]
    await expect(isDm(USER)).resolves.toBe(false)

    mockRows = []
    await expect(isDm(USER)).resolves.toBe(false)
  })
})
