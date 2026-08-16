import { isSignupOpen, isValidInviteCode } from './invite'

// The sign-up door (DND-044, D20). The property that matters most is the
// fail-closed default: with no SIGNUP_INVITE_CODE in the environment, nothing
// validates and sign-up is closed — misconfiguration locks the door rather
// than propping it open.

const ORIGINAL = process.env.SIGNUP_INVITE_CODE

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.SIGNUP_INVITE_CODE
  } else {
    process.env.SIGNUP_INVITE_CODE = ORIGINAL
  }
})

describe('with no invite code configured', () => {
  beforeEach(() => {
    delete process.env.SIGNUP_INVITE_CODE
  })

  it('reports sign-up closed', () => {
    expect(isSignupOpen()).toBe(false)
  })

  it('validates nothing — fail-closed, not fail-open', () => {
    expect(isValidInviteCode('x')).toBe(false)
    expect(isValidInviteCode('')).toBe(false)
    expect(isValidInviteCode(undefined)).toBe(false)
  })
})

describe('with an invite code configured', () => {
  beforeEach(() => {
    process.env.SIGNUP_INVITE_CODE = 'red-dragon-inn'
  })

  it('reports sign-up open', () => {
    expect(isSignupOpen()).toBe(true)
  })

  it('accepts exactly the configured code', () => {
    expect(isValidInviteCode('red-dragon-inn')).toBe(true)
  })

  it('rejects a wrong code, including a near miss', () => {
    expect(isValidInviteCode('red-dragon-in')).toBe(false)
    expect(isValidInviteCode('red-dragon-inn ')).toBe(false)
    expect(isValidInviteCode('RED-DRAGON-INN')).toBe(false)
  })

  it('rejects an absent code', () => {
    expect(isValidInviteCode(undefined)).toBe(false)
    expect(isValidInviteCode(null)).toBe(false)
    expect(isValidInviteCode('')).toBe(false)
  })
})
