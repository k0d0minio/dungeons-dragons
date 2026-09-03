import { notFound } from 'next/navigation'

import { SessionPlanRoster } from '@/components/campaigns/session-plan-roster'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listSessionPlans } from '@/lib/db/session-plans'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Session plans',
}

/**
 * A campaign's session plans (`dm-prep-suite/session-plans`).
 *
 * Its own page under `/dm/campaigns/[id]/`, reached from the Prep card, like
 * the roster and the places before it. DM-scoped in the query —
 * `campaigns.dm_user_id` and nowhere else — so someone else's campaign id 404s
 * here like it never existed, and there is no player route anywhere near it.
 */
export default async function CampaignSessionPlansPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  const plans = await listSessionPlans(user.id, id)
  if (!plans) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Session plans"
        subtitle={`${campaign.name} · ${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}`}
        backHref={`/dm/campaigns/${campaign.id}`}
        backLabel={campaign.name}
      />

      <SessionPlanRoster campaignId={campaign.id} plans={plans} />
    </main>
  )
}
