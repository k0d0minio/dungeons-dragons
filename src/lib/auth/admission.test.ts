import { admitSignup } from './admission'

// Who gets through the sign-up door (`user-management/invites-and-roles`).
// Two keys, one decision: the shared code costs no query and is checked
// first; a token needs the database and is not even looked up without one.
let databaseReady = true
const mockFind = jest.fn(async (): Promise<unknown> => null)

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/invites', () => ({
  ...jest.requireActual('@/lib/db/invites'),
  findClaimableInvite: (...args: unknown[]) => mockFind(...(args as [])),
}))

const ORIGINAL = process.env.SIGNUP_INVITE_CODE
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.SIGNUP_INVITE_CODE
  } else {
    process.env.SIGNUP_INVITE_CODE = ORIGINAL
  }
  databaseReady = true
})

describe('admitSignup', () => {
  it('admits the shared code without a query', async () => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'

    await expect(admitSignup('red-dragon-inn')).resolves.toEqual({ by: 'code' })
    expect(mockFind).not.toHaveBeenCalled()
  })

  it('admits a live token, and says which', async () => {
    delete process.env.SIGNUP_INVITE_CODE
    mockFind.mockResolvedValueOnce({ token: TOKEN })

    await expect(admitSignup(TOKEN)).resolves.toEqual({ by: 'token', token: TOKEN })
    expect(mockFind).toHaveBeenCalledWith(TOKEN)
  })

  it('refuses a token the database does not know as live', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    await expect(admitSignup(TOKEN)).resolves.toBeNull()
  })

  it('refuses a token outright without a database — fail-closed, not an error', async () => {
    delete process.env.SIGNUP_INVITE_CODE
    databaseReady = false

    await expect(admitSignup(TOKEN)).resolves.toBeNull()
    expect(mockFind).not.toHaveBeenCalled()
  })

  it('refuses nothing, garbage and a wrong code alike, without a query', async () => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'

    await expect(admitSignup(undefined)).resolves.toBeNull()
    await expect(admitSignup(null)).resolves.toBeNull()
    await expect(admitSignup('')).resolves.toBeNull()
    await expect(admitSignup('wrong')).resolves.toBeNull()
    expect(mockFind).not.toHaveBeenCalled()
  })

  it('is shut with no code configured and no token presented', async () => {
    delete process.env.SIGNUP_INVITE_CODE

    await expect(admitSignup('red-dragon-inn')).resolves.toBeNull()
  })
})
