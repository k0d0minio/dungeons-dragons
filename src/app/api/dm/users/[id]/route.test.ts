import { DELETE } from './route'

// Deleting an account (`triage/account-deletion-from-users-page`). DM-only,
// never on yourself, and never one that runs a campaign — the three refusals
// are the point of this file. What deletion *does*, and in what order, is
// `users.test.ts`.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/users', () => ({
  deleteUserAccount: jest.fn(),
}))

jest.mock('@/lib/db/roles', () => ({
  isDm: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'
import { deleteUserAccount } from '@/lib/db/users'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockDeleteUserAccount = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>
const mockIsDm = isDm as jest.MockedFunction<typeof isDm>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'd3698d8d-beac-4768-b769-9d6dccae3053'
const SAM = '3dc11dd3-fc15-408b-8701-bd4d991f0e1c'

const TALLY = {
  characters: 1,
  campaignMembers: 1,
  invites: 0,
  roles: 1,
  sessions: 2,
  accounts: 1,
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

function request(): Request {
  return {} as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockIsDm.mockResolvedValue(true)
  mockDeleteUserAccount.mockResolvedValue({ outcome: 'deleted', tally: TALLY })
})

describe('DELETE /api/dm/users/[id]', () => {
  it('answers 401 when signed out', async () => {
    expect((await DELETE(request(), context(SAM))).status).toBe(401)
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  it('answers 503 when the database is not configured', async () => {
    signedIn()
    mockIsDatabaseConfigured.mockReturnValue(false)

    expect((await DELETE(request(), context(SAM))).status).toBe(503)
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  it('answers 403 to a player', async () => {
    signedIn()
    mockIsDm.mockResolvedValue(false)

    expect((await DELETE(request(), context(SAM))).status).toBe(403)
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  it('refuses to delete your own account — the lock-out guard', async () => {
    signedIn()

    const response = await DELETE(request(), context(DM))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toMatch(/your own account/i)
    expect(mockDeleteUserAccount).not.toHaveBeenCalled()
  })

  it('answers 404 when the account is already gone', async () => {
    signedIn()
    mockDeleteUserAccount.mockResolvedValue({ outcome: 'missing' })

    expect((await DELETE(request(), context(SAM))).status).toBe(404)
  })

  it('answers 409 for an account that still runs a campaign, and names the way out', async () => {
    signedIn()
    mockDeleteUserAccount.mockResolvedValue({ outcome: 'runs-campaigns', campaigns: 1 })

    const response = await DELETE(request(), context(SAM))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe(
      'This account runs a campaign. Delete it or hand it to another DM first.',
    )
  })

  it('counts the campaigns it refused over', async () => {
    signedIn()
    mockDeleteUserAccount.mockResolvedValue({ outcome: 'runs-campaigns', campaigns: 3 })

    const response = await DELETE(request(), context(SAM))

    expect((await response.json()).error).toMatch(/runs 3 campaigns/)
  })

  it('deletes the account and reports what went with it', async () => {
    signedIn()

    const response = await DELETE(request(), context(SAM))

    expect(response.status).toBe(200)
    expect(mockDeleteUserAccount).toHaveBeenCalledWith(SAM)
    expect(await response.json()).toEqual({ deleted: { id: SAM }, tally: TALLY })
  })
})
