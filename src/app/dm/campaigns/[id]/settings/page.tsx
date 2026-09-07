import { notFound, redirect } from 'next/navigation'

import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session and one campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

/**
 * The feature gates moved (D48, `dm-chronology/campaign-settings`).
 *
 * This page was a screen of its own for one control — how much of the sheet
 * this campaign's players get (D40) — reached from the campaign hub. The hub
 * is gone (`dm-chronology/retire-the-hub`) and the gates are now one row of
 * the grouped between-sessions page the campaign chip opens, beside the name,
 * the one page, the milestone and the end of the campaign, which are the
 * decisions made in the same sitting.
 *
 * The URL keeps working, because a DM who bookmarked "player features" meant
 * the control, not the route. DM-scoped first, so another DM's id still 404s
 * here like it never existed.
 */
export default async function CampaignGatesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  redirect(`/dm/campaign?id=${campaign.id}`)
}
