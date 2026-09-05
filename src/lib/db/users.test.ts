import { deleteUserAccount, getUserName, isUserRole, listUsers, setUserRole } from './users'

// The same real-Drizzle-over-a-stub-driver pattern as `roles.test.ts`. What
// matters: the list reads Neon Auth's own table (every account, not a
// roster), joins the role by a text cast of the uuid, reads a missing row as
// player, the role write is an upsert, and a deletion issues its statements in
// the order chosen to fail benignly on `neon-http`.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
// A deletion is eight statements that answer differently, so those tests queue
// one result per call; everything else keeps the single-answer stub.
let mockQueue: unknown[][][] | null = null

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockQueue ? (mockQueue.shift() ?? []) : mockRows }
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
  mockQueue = null
})

// "Played by" on the DM's profile page (`first-table/dm-character-profile`).
describe('getUserName', () => {
  it('reads one name off neon_auth.user by a text cast of its id', async () => {
    mockRows = [['Sam']]

    expect(await getUserName(SAM)).toBe('Sam')

    const { sql, params } = mockCalls[0]
    expect(sql).toContain('from "neon_auth"."user"')
    expect(sql).toContain('"neon_auth"."user"."id"::text = $1')
    expect(params).toEqual([SAM, 1])
  })

  it('is null for an owner the auth table no longer knows', async () => {
    mockRows = []
    expect(await getUserName(SAM)).toBeNull()
  })
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

describe('deleteUserAccount', () => {
  /** The statements a deletion of an account that owns one of everything makes. */
  function queueOneOfEverything() {
    mockQueue = [
      [[SAM]], // the account exists
      [], // runs no campaigns
      [['session-1'], ['session-2']], // sessions
      [['invite-1']], // invites
      [[SAM]], // role row
      [['campaign-1']], // membership
      [['character-1']], // character
      [['account-1']], // credentials
      [], // the user row itself
    ]
  }

  it('treats an id that is not uuid-shaped as a miss, without asking the database', async () => {
    expect(await deleteUserAccount('sam')).toEqual({ outcome: 'missing' })
    expect(mockCalls).toHaveLength(0)
  })

  it('is a miss when no such account exists, and deletes nothing', async () => {
    mockQueue = [[]]

    expect(await deleteUserAccount(SAM)).toEqual({ outcome: 'missing' })
    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('from "neon_auth"."user"')
  })

  it('refuses an account that runs a campaign, before deleting anything', async () => {
    mockQueue = [[[SAM]], [['campaign-1'], ['campaign-2']]]

    expect(await deleteUserAccount(SAM)).toEqual({ outcome: 'runs-campaigns', campaigns: 2 })
    // The existence check and the campaign check, and not one delete: a
    // campaign with no DM is the state this refusal exists to prevent.
    expect(mockCalls).toHaveLength(2)
    expect(mockCalls.some((call) => call.sql.includes('delete from'))).toBe(false)
  })

  it('deletes in the order that fails benignly — access first, the auth rows last', async () => {
    queueOneOfEverything()

    await deleteUserAccount(SAM)

    const deletes = mockCalls.filter((call) => call.sql.startsWith('delete from'))

    expect(deletes.map((call) => call.sql.split(' where ')[0])).toEqual([
      'delete from "neon_auth"."session"',
      'delete from "user_invites"',
      'delete from "user_roles"',
      'delete from "campaign_members"',
      'delete from "characters"',
      'delete from "neon_auth"."account"',
      'delete from "neon_auth"."user"',
    ])
  })

  it('takes both sides of an invite — the links they minted and the one that let them in', async () => {
    queueOneOfEverything()

    await deleteUserAccount(SAM)

    const invites = mockCalls.find((call) => call.sql.includes('delete from "user_invites"'))
    expect(invites?.sql).toContain('"created_by" = ')
    expect(invites?.sql).toContain('"claimed_by_user_id" = ')
    expect(invites?.params).toEqual([SAM, SAM])
  })

  it('scopes every statement to the one account', async () => {
    queueOneOfEverything()

    await deleteUserAccount(SAM)

    // Every statement, the two reads included, names the account. The `limit`
    // on the existence check is the only parameter here that is not an id.
    for (const call of mockCalls) {
      expect(call.params).toContain(SAM)
      expect(call.params.filter((param) => param !== SAM && param !== 1)).toEqual([])
    }
  })

  it('reports what went, so the DM is told rather than reassured', async () => {
    queueOneOfEverything()

    expect(await deleteUserAccount(SAM)).toEqual({
      outcome: 'deleted',
      tally: {
        characters: 1,
        campaignMembers: 1,
        invites: 1,
        roles: 1,
        sessions: 2,
        accounts: 1,
      },
    })
  })

  it('is idempotent enough to re-run: an account with nothing left still deletes', async () => {
    mockQueue = [[[SAM]], [], [], [], [], [], [], [], []]

    expect(await deleteUserAccount(SAM)).toEqual({
      outcome: 'deleted',
      tally: {
        characters: 0,
        campaignMembers: 0,
        invites: 0,
        roles: 0,
        sessions: 0,
        accounts: 0,
      },
    })
  })
})
