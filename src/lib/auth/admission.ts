// Who gets through the sign-up door (`user-management/invites-and-roles`).
//
// Two keys open it. The shared invite code (D20) is one code for the whole
// table, checked against the environment; a tokenised invite is one link for
// one person, checked against `user_invites`. Both arrive the same way — as
// the value of the invite cookie `/api/invite` sets — and both are decided
// here, once, so the auth proxy (the lock) and the sign-up page (the polite
// front) cannot drift apart on what counts.
//
// **Fail-closed still holds.** With no shared code configured and no live
// invite matching the cookie, the answer is `null` and the door stays shut.
import { isDatabaseConfigured } from '@/lib/db/client'
import { findClaimableInvite, isInviteToken } from '@/lib/db/invites'

import { isValidInviteCode } from './invite'

/** How a visitor was admitted, or `null` for not at all. */
export type Admission = { by: 'code' } | { by: 'token'; token: string } | null

/**
 * Whether the presented cookie value admits a sign-up right now. The shared
 * code is checked first because it costs no query; the token path needs the
 * database and is skipped outright without one, which is what keeps an
 * unprovisioned deploy fail-closed rather than erroring.
 */
export async function admitSignup(presented: string | undefined | null): Promise<Admission> {
  if (isValidInviteCode(presented)) return { by: 'code' }

  if (!isInviteToken(presented) || !isDatabaseConfigured()) return null

  const invite = await findClaimableInvite(presented)
  return invite ? { by: 'token', token: presented } : null
}
