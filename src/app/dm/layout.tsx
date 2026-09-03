import type { ReactNode } from 'react'

import { requireDmUser } from '@/lib/auth/dm'

// Reads the session and the role, so nothing under it can be prerendered.
export const dynamic = 'force-dynamic'

/**
 * The wall around the DM's side of the screen
 * (`user-management/invites-and-roles`).
 *
 * A player never sees a DM screen: not the home, not a campaign's prep, not
 * the crib. The rule used to be "the tab is visible, the tools are not", and
 * Jamie changed it on 2026-09-03 — a beginner who can wander into an empty
 * DM page learns nothing from it except that there is a door. So the tab is
 * not drawn for a player, and this layout sends one who types the URL to
 * their characters instead.
 *
 * Defence in depth, not the only lock: every DM query still scopes by
 * `campaigns.dm_user_id`, and every `/api/dm/*` route checks the role itself.
 */
export default async function DmLayout({ children }: { children: ReactNode }) {
  await requireDmUser()

  return children
}
