import {
  claimInvite,
  createInvite,
  findClaimableInvite,
  generateInviteToken,
  INVITE_TTL_MS,
  inviteStatus,
  isInviteToken,
  listInvites,
  revokeInvite,
  type UserInviteRow,
} from './invites'

// The same real-Drizzle-over-a-stub-driver pattern as `campaigns.test.ts`.
// The property under test is "one link, one person, once": a claimable
// invite is unclaimed, unrevoked and unexpired in every WHERE clause that
// matters, the claim is a single conditional UPDATE, and the role write that
// follows it never turns a DM into a player.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRowsQueue: unknown[][][] = []

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRowsQueue.shift() ?? [] }
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

const DM = 'user_2mFq8xKpLd'
const SAM = '3dc11dd3-fc15-408b-8701-bd4d991f0e1c'
const INVITE_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'
const CAMPAIGN_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const CAMPAIGN_NAME = 'Heroes of the Borderlands'

/** A row as the driver hands it back, in column order. */
function row(overrides: Partial<Record<string, unknown>> = {}): unknown[] {
  const values = {
    id: INVITE_ID,
    token: TOKEN,
    role: 'player',
    label: 'Sam',
    email: null,
    created_by: DM,
    campaign_id: null,
    created_at: '2026-09-03T10:00:00.000Z',
    expires_at: '2026-09-17T10:00:00.000Z',
    revoked_at: null,
    claimed_at: null,
    claimed_by_user_id: null,
    ...overrides,
  }
  return Object.values(values)
}

/**
 * The same row as the two joined reads hand it back: every invite column, then
 * the campaign's name from the left join — `null` for an invite that carries
 * no campaign, which is every invite minted from `/dm/users`.
 */
function joinedRow(
  overrides: Partial<Record<string, unknown>> = {},
  campaignName: string | null = null,
): unknown[] {
  return [...row(overrides), campaignName]
}

function fixture(overrides: Partial<UserInviteRow> = {}): UserInviteRow {
  return {
    id: INVITE_ID,
    token: TOKEN,
    role: 'player',
    label: 'Sam',
    email: null,
    createdBy: DM,
    campaignId: null,
    createdAt: new Date('2026-09-03T10:00:00.000Z'),
    expiresAt: new Date('2026-09-17T10:00:00.000Z'),
    revokedAt: null,
    claimedAt: null,
    claimedByUserId: null,
    ...overrides,
  }
}

/** The three-column definition of "still good", as SQL. */
function expectClaimable(sql: string) {
  expect(sql).toContain('"user_invites"."claimed_at" is null')
  expect(sql).toContain('"user_invites"."revoked_at" is null')
  expect(sql).toContain('"user_invites"."expires_at" > $')
}

beforeEach(() => {
  mockCalls.length = 0
  mockRowsQueue = []
})

describe('tokens', () => {
  it('generates unguessable, URL-safe tokens', () => {
    const token = generateInviteToken()

    expect(isInviteToken(token)).toBe(true)
    expect(token).not.toBe(generateInviteToken())
  })

  it('recognises only token-shaped strings', () => {
    expect(isInviteToken(TOKEN)).toBe(true)
    expect(isInviteToken('short')).toBe(false)
    expect(isInviteToken('has spaces in it here')).toBe(false)
    expect(isInviteToken(undefined)).toBe(false)
    expect(isInviteToken(null)).toBe(false)
  })
})

describe('inviteStatus', () => {
  const now = new Date('2026-09-10T00:00:00.000Z')

  it('reads the three closing columns in one order: claimed, revoked, expired', () => {
    expect(inviteStatus(fixture(), now)).toBe('open')
    expect(inviteStatus(fixture({ claimedAt: now }), now)).toBe('claimed')
    expect(inviteStatus(fixture({ revokedAt: now }), now)).toBe('revoked')
    expect(inviteStatus(fixture({ expiresAt: new Date('2026-09-09T00:00:00.000Z') }), now)).toBe(
      'expired',
    )
    // Claimed wins even over an expiry that has since passed: it was used.
    expect(
      inviteStatus(
        fixture({ claimedAt: now, expiresAt: new Date('2026-09-09T00:00:00.000Z') }),
        now,
      ),
    ).toBe('claimed')
  })
})

describe('createInvite', () => {
  it('inserts a fresh token with the role, trimmed label and email, and a two-week expiry', async () => {
    mockRowsQueue = [[row()]]
    const before = Date.now()

    const invite = await createInvite({ createdBy: DM, role: 'player', label: '  Sam ', email: '' })

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('insert into "user_invites"')
    expect(isInviteToken(params[0] as string)).toBe(true)
    expect(params.slice(1, 6)).toEqual(['player', 'Sam', null, DM, null])
    const expiresAt = new Date(params[6] as string).getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + INVITE_TTL_MS - 1000)
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + INVITE_TTL_MS)

    expect(invite).toEqual(expect.objectContaining({ id: INVITE_ID, token: TOKEN }))
    expect(invite.expiresAt).toBeInstanceOf(Date)
  })

  // One link, not two (`dm-chronology/one-link-invite`): the campaign the
  // settings page hands in is written on the row, and it is what the claim
  // later reads to seat them.
  it('records the campaign an invite seats at, when it is given one', async () => {
    mockRowsQueue = [[row({ campaign_id: CAMPAIGN_ID })]]

    const invite = await createInvite({
      createdBy: DM,
      role: 'player',
      label: 'Sam',
      campaignId: CAMPAIGN_ID,
    })

    expect(mockCalls[0].params[5]).toBe(CAMPAIGN_ID)
    expect(invite.campaignId).toBe(CAMPAIGN_ID)
  })
})

describe('listInvites', () => {
  it('reads every invite, newest first, with the table it seats at named', async () => {
    mockRowsQueue = [[joinedRow({ campaign_id: CAMPAIGN_ID }, CAMPAIGN_NAME), joinedRow()]]

    const invites = await listInvites()

    const { sql } = mockCalls[0]
    expect(sql).toContain('order by "user_invites"."created_at" desc')
    // A left join, so an account-only invite — and one whose campaign has since
    // been deleted — is still in the DM's record.
    expect(sql).toContain('left join "campaigns"')
    expect(invites).toHaveLength(2)
    expect(invites[0].campaignName).toBe(CAMPAIGN_NAME)
    expect(invites[1].campaignName).toBeNull()
  })
})

describe('findClaimableInvite', () => {
  it('looks the token up, and only among invites that are still good', async () => {
    mockRowsQueue = [[joinedRow()]]

    const invite = await findClaimableInvite(TOKEN)

    expect(mockCalls).toHaveLength(1)
    const { sql, params } = mockCalls[0]
    expect(sql).toContain('"user_invites"."token" = $1')
    expectClaimable(sql)
    expect(params[0]).toBe(TOKEN)
    expect(invite).toEqual(expect.objectContaining({ token: TOKEN, campaignName: null }))
  })

  // The landing names the table, and the name has to come through the token —
  // a standalone "campaign by id" read would be a public door onto campaigns.
  it('names the campaign in the same statement, never a second lookup', async () => {
    mockRowsQueue = [[joinedRow({ campaign_id: CAMPAIGN_ID }, CAMPAIGN_NAME)]]

    const invite = await findClaimableInvite(TOKEN)

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls[0].sql).toContain('left join "campaigns"')
    expect(invite).toEqual(
      expect.objectContaining({ campaignId: CAMPAIGN_ID, campaignName: CAMPAIGN_NAME }),
    )
  })

  it('answers null for a miss', async () => {
    await expect(findClaimableInvite(TOKEN)).resolves.toBeNull()
  })

  it('never queries for something that is not token-shaped', async () => {
    await expect(findClaimableInvite('nope')).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('revokeInvite', () => {
  it('closes only an open invite, and returns it', async () => {
    mockRowsQueue = [[row({ revoked_at: '2026-09-04T10:00:00.000Z' })]]

    const invite = await revokeInvite(INVITE_ID)

    const { sql, params } = mockCalls[0]
    expect(sql).toContain('update "user_invites" set "revoked_at" = $1')
    expect(sql).toContain('"user_invites"."id" = $2')
    expectClaimable(sql)
    expect(params[1]).toBe(INVITE_ID)
    expect(invite?.revokedAt).toBeInstanceOf(Date)
  })

  it('answers null when there was nothing open to revoke', async () => {
    await expect(revokeInvite(INVITE_ID)).resolves.toBeNull()
  })
})

describe('claimInvite', () => {
  it('claims with one conditional update, then writes the role', async () => {
    mockRowsQueue = [[row({ claimed_at: '2026-09-04T10:00:00.000Z', claimed_by_user_id: SAM })], []]

    const invite = await claimInvite(TOKEN, SAM)

    expect(mockCalls).toHaveLength(2)

    const claim = mockCalls[0]
    expect(claim.sql).toContain(
      'update "user_invites" set "claimed_at" = $1, "claimed_by_user_id" = $2',
    )
    expect(claim.sql).toContain('"user_invites"."token" = $3')
    expectClaimable(claim.sql)
    expect(claim.params.slice(1, 3)).toEqual([SAM, TOKEN])

    const role = mockCalls[1]
    expect(role.sql).toContain('insert into "user_roles"')
    expect(role.sql).toContain('on conflict ("user_id") do update set')
    // The upsert never demotes: an existing dm row keeps dm whatever the invite says.
    expect(role.sql).toContain(`case when "user_roles"."role" = 'dm' then 'dm' else $`)
    expect(role.params.slice(0, 2)).toEqual([SAM, 'player'])

    expect(invite).toEqual(expect.objectContaining({ claimedByUserId: SAM }))
  })

  it('writes dm for a dm invite', async () => {
    mockRowsQueue = [[row({ role: 'dm', claimed_at: '2026-09-04T10:00:00.000Z' })], []]

    await claimInvite(TOKEN, SAM)

    expect(mockCalls[1].params.slice(0, 2)).toEqual([SAM, 'dm'])
  })

  it('writes nothing when the claim finds no open invite — someone else got there first', async () => {
    await expect(claimInvite(TOKEN, SAM)).resolves.toBeNull()

    expect(mockCalls).toHaveLength(1)
  })

  it('never queries for something that is not token-shaped', async () => {
    await expect(claimInvite('nope', SAM)).resolves.toBeNull()
    expect(mockCalls).toHaveLength(0)
  })

  // One link makes the account *and* seats them
  // (`dm-chronology/one-link-invite`). The seat is exactly one
  // `campaign_members` row, written by `seatOnCampaign` so it is the same row
  // the join code writes, and it is the join context the wizard reads to
  // attach the finished character to that table (D36).
  it('seats the claimer on the campaign the invite carries, as a player', async () => {
    mockRowsQueue = [
      [row({ campaign_id: CAMPAIGN_ID, claimed_at: '2026-09-04T10:00:00.000Z' })],
      [],
      [],
    ]

    await claimInvite(TOKEN, SAM)

    expect(mockCalls).toHaveLength(3)
    const seat = mockCalls[2]
    expect(seat.sql).toContain('insert into "campaign_members"')
    // Idempotent: a link forwarded to someone already at the table is a no-op,
    // not an error.
    expect(seat.sql).toContain('on conflict do nothing')
    expect(seat.params).toEqual([CAMPAIGN_ID, SAM, 'player'])
  })

  // Fail-closed (D20): a claim never grants more than a roster seat, whatever
  // the link says. The invite's own role is the global one, written above.
  it('seats a dm-role invite as a player all the same', async () => {
    mockRowsQueue = [[row({ role: 'dm', campaign_id: CAMPAIGN_ID })], [], []]

    await claimInvite(TOKEN, SAM)

    expect(mockCalls[1].params.slice(0, 2)).toEqual([SAM, 'dm'])
    expect(mockCalls[2].params).toEqual([CAMPAIGN_ID, SAM, 'player'])
  })

  it('seats nobody when the invite carries no campaign — the old behaviour, unchanged', async () => {
    mockRowsQueue = [[row({ claimed_at: '2026-09-04T10:00:00.000Z' })], []]

    await claimInvite(TOKEN, SAM)

    expect(mockCalls).toHaveLength(2)
    expect(mockCalls.some((call) => call.sql.includes('campaign_members'))).toBe(false)
  })

  it('seats nobody when the link is revoked or expired — the claim finds nothing first', async () => {
    await expect(claimInvite(TOKEN, SAM)).resolves.toBeNull()

    expect(mockCalls).toHaveLength(1)
    expect(mockCalls.some((call) => call.sql.includes('campaign_members'))).toBe(false)
  })
})
