import { isUserRole, listUsers, setUserRole } from './users'

// The same real-Drizzle-over-a-stub-driver pattern as `roles.test.ts`. What
// matters: the list reads Neon Auth's own table (every account, not a
// roster), joins the role by a text cast of the uuid, reads a missing row as
// player, and the role write is an upsert.
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

const JAMIE = '90684dfa-e5a7-487c-9aee-aa3c5532b57d'
const SAM = '3dc11dd3-fc15-408b-8701-bd4d991f0e1c'

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
})

describe('listUsers', () => {
  it('reads every account from neon_auth.user, joined to the role by a text cast', async () => {
    await listUsers()

    expect(mockCalls).toHaveLength(1)
    const { sql } = mockCalls[0]
    expect(sql).toContain('from "neon_auth"."user"')
    expect(sql).toContain('left join "user_roles"')
    expect(sql).toContain('"user_roles"."user_id" = "neon_auth"."user"."id"::text')
    expect(sql).toContain('from "characters"')
    expect(sql).toContain('from "campaign_members"')
    expect(sql).toContain('order by "neon_auth"."user"."createdAt"')
  })

  it('shapes rows, reading a missing role row as player and counts as numbers', async () => {
    mockRows = [
      [JAMIE, 'Jamie', 'jamie@example.com', '2026-08-13T17:44:34.000Z', 'dm', '2', '1'],
      [SAM, 'Sam', 'sam@example.com', '2026-09-01T10:00:00.000Z', null, '0', '0'],
    ]

    const users = await listUsers()

    expect(users).toEqual([
      expect.objectContaining({
        id: JAMIE,
        name: 'Jamie',
        role: 'dm',
        characterCount: 2,
        campaignCount: 1,
      }),
      expect.objectContaining({ id: SAM, role: 'player', characterCount: 0, campaignCount: 0 }),
    ])
    expect(users[0].createdAt).toBeInstanceOf(Date)
  })

  it('reads any role that is not dm as player', async () => {
    mockRows = [[SAM, 'Sam', 'sam@example.com', '2026-09-01T10:00:00.000Z', 'wizard', '0', '0']]

    const [user] = await listUsers()

    expect(user.role).toBe('player')
  })
})

describe('setUserRole', () => {
  it('upserts the row, because no row is a legitimate starting state (D19)', async () => {
    await setUserRole(SAM, 'dm')

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('insert into "user_roles"')
    expect(sql).toContain('on conflict ("user_id") do update set "role" =')
    expect(params.slice(0, 2)).toEqual([SAM, 'dm'])
  })
})

describe('isUserRole', () => {
  it('accepts exactly the two roles the check constraint does', () => {
    expect(isUserRole('dm')).toBe(true)
    expect(isUserRole('player')).toBe(true)
    expect(isUserRole('wizard')).toBe(false)
    expect(isUserRole(undefined)).toBe(false)
    expect(isUserRole(1)).toBe(false)
  })
})
