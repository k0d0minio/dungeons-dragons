// Global user roles (DND-047, register decision D19).
//
// One lookup, one rule: a `dm` row unlocks the DM tools — the `/dm` surface
// and campaign creation. It grants no access to anyone's data; that stays
// per-campaign via `campaigns.dm_user_id` (DND-027). **No row means player**,
// which is what makes every future sign-up a player without hooking Neon's
// managed sign-up flow.
import { eq } from 'drizzle-orm'
import { cache } from 'react'

import { getDb } from './client'
import { userRoles, type UserRole } from './schema'

export type { UserRole } from './schema'

/**
 * The role `userId` holds. Absence of a row is a player, by design.
 *
 * Wrapped in React's per-request `cache` (`first-table/dm-front-door`): the
 * root layout asks for the DM tab, the front door asks where to land, and the
 * character pages ask whether to refuse — one query answers all of them in a
 * render, the way `getSessionUser` already does. Outside a server render the
 * wrapper is a pass-through, so route handlers and tests see the plain
 * function.
 */
export const getUserRole = cache(async (userId: string): Promise<UserRole> => {
  const [row] = await getDb()
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1)

  return row?.role === 'dm' ? 'dm' : 'player'
})

/** True when `userId` may see the DM tools. */
export async function isDm(userId: string): Promise<boolean> {
  return (await getUserRole(userId)) === 'dm'
}
