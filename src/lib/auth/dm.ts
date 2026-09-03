// The DM-only wall (`user-management/invites-and-roles`).
//
// Its own module rather than a line in `server.ts` because `src/proxy.ts`
// imports that file, and the proxy must never pull the database driver into
// its bundle. Pages under `/dm/` reach this through `src/app/dm/layout.tsx`;
// API routes under `/api/dm/` call `isDm` themselves and answer 403, because
// an API caller wants a status, not a redirect.
import { redirect } from 'next/navigation'

import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'

import { requireSessionUser } from './server'

/** Where a player who wanders towards the DM tools is sent instead. */
export const PLAYER_HOME_PATH = '/characters'

/**
 * The signed-in DM, or a redirect. A signed-out visitor goes to sign-in as
 * everywhere; a signed-in player goes to their characters — not a 404 and not
 * a "this is the DM's" card, because the rule is now that a player never sees
 * the DM screens at all. Without a database there is no role to read, and the
 * page behind is left to explain the missing `DATABASE_URL` itself.
 */
export async function requireDmUser() {
  const user = await requireSessionUser()

  if (isDatabaseConfigured() && !(await isDm(user.id))) redirect(PLAYER_HOME_PATH)

  return user
}
