// The sign-up door (DND-044, register decision D20).
//
// One shared invite code, set as `SIGNUP_INVITE_CODE` in the environment and
// nowhere in git. A visitor who presents it gets an httpOnly cookie, and only
// that cookie lets a sign-up request through the auth proxy. **Fail-closed:**
// with the variable unset, sign-up is refused outright — the door defaults to
// shut, which is what keeps the GDPR household exemption comfortable
// (`.icm/intake/_done/DND-044-gate-signup.md`). Everything else — sign-in,
// sign-out, password reset, existing sessions — is untouched.
import { timingSafeEqual } from 'node:crypto'

/** The cookie a validated invite leaves behind. Checked by the auth proxy. */
export const INVITE_COOKIE = 'dnd-invite'

/** A week: long enough to sign up at leisure, short enough not to be a key. */
export const INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/** True when a code is configured, i.e. sign-up is possible at all. */
export function isSignupOpen(): boolean {
  return Boolean(process.env.SIGNUP_INVITE_CODE)
}

/**
 * Whether `presented` is the configured code. Constant-time on the comparison
 * itself; the length check leaks only the length, which a shared human-typed
 * code does not need to hide.
 */
export function isValidInviteCode(presented: string | undefined | null): boolean {
  const expected = process.env.SIGNUP_INVITE_CODE
  if (!expected || !presented) return false

  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
