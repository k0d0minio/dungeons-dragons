import { notFound, redirect } from 'next/navigation'

import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session and one campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

/**
 * The campaign hub is a door now (D48, `dm-chronology/retire-the-hub`).
 *
 * This URL used to be the DM's whole side of the app: thirteen cards in one
 * scroll — party glance, milestone, encounters, session zero, four prep links,
 * session log, gates, notes, join code, close campaign — that had to serve
 * prep on a Tuesday and a fight on a Thursday. Every card of it now has a
 * home on one of the four stops, so the page has nothing left to draw.
 *
 * It stays because the link is out there — in a DM's history, in the join
 * link's own landing, on a home screen — and because a 404 for a campaign you
 * still run is a lie. Where it lands says which half of a DM's life the
 * campaign is in:
 *
 * - **Still running** → `/dm/play`, the same landing `/dm` gives: opening an
 *   old link mid-session should put the table in front of you.
 * - **Closed** → its own Sessions timeline, which is where a campaign you have
 *   finished lives (`dm-chronology/sessions-tab`). Play is about a table that
 *   is still sitting down; this one has stood up.
 *
 * DM-scoped, as the page was: another DM's campaign id 404s here like it never
 * existed, and it does so *before* redirecting, so the redirect never becomes
 * a way to ask whether an id is real.
 */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  redirect(campaign.closedAt === null ? '/dm/play' : `/dm/campaigns/${campaign.id}/sessions`)
}
