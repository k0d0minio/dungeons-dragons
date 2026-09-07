import { notFound } from 'next/navigation'

import { SessionPlanSteps } from '@/components/campaigns/session-plan-steps'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { countPartyReadiness } from '@/lib/db/prep'
import { getSessionPlan, listSessionPlanTargets } from '@/lib/db/session-plans'
import { formatSessionDate } from '@/lib/notes/schema'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Session plan',
}

/**
 * One night's prep, as the Lazy DM's eight steps
 * (`dm-chronology/eight-steps-plan`).
 *
 * Everything the screen needs arrives in three scoped reads: the plan with its
 * scenes, secrets and links, the campaign's own prep for the pickers, and the
 * party tally the book's first step is about. All three are DM-scoped through
 * `campaigns.dm_user_id`, so a plan id from another table 404s exactly like one
 * that never existed — and the pickers can only ever offer this campaign's
 * people, places and fights.
 *
 * The party arrives as two numbers rather than as characters: "review the
 * characters" is a step that is done or not, and counting it on the server
 * keeps a screen that renders in a browser from being handed a roster to
 * count.
 */
export default async function SessionPlanPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>
}) {
  const user = await requireSessionUser()
  const { id, planId } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  const [detail, targets, party] = await Promise.all([
    getSessionPlan(user.id, id, planId),
    listSessionPlanTargets(user.id, id),
    countPartyReadiness(user.id, id),
  ])

  if (!detail || !targets) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title={detail.plan.title}
        subtitle={
          detail.plan.sessionDate ? formatSessionDate(detail.plan.sessionDate) : 'No date yet'
        }
        backHref={`/dm/campaigns/${campaign.id}/session-plans`}
        backLabel="Session plans"
      />

      <SessionPlanSteps
        campaignId={campaign.id}
        plan={detail.plan}
        items={detail.items}
        links={detail.links}
        targets={targets}
        party={party}
        backHref={`/dm/campaigns/${campaign.id}/session-plans`}
      />
    </main>
  )
}
