import { notFound } from 'next/navigation'

import { NightBoard } from '@/components/dm/night-board'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { countPartyReadiness } from '@/lib/db/prep'
import { listNights } from '@/lib/db/session-log'
import { listPlanTallies } from '@/lib/db/session-plans'
import { nightLabel, nightTitle } from '@/lib/sessions/timeline'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'The night',
}

/**
 * One night, top to bottom (`dm-chronology/sessions-tab`).
 *
 * **A night is keyed by its recap**, which is the row that says the night
 * happened — or by its plan while it has none, which is the row that says it
 * is going to. That is `listNights`' own key, so the id in this URL is the id
 * on the timeline row that led here and there is no second rule for what a
 * night is called.
 *
 * The whole timeline is read to render one night of it, deliberately:
 * `listNights` reads a campaign's acts once and cuts them into windows, and a
 * night's window is defined by the closes either side of it — so "just this
 * night" is not a cheaper question than "every night", it is the same one
 * asked with a filter on the end. Authority is that query's, folded into every
 * statement, and the campaign pre-read here is what makes a foreign id a 404.
 */
export default async function CampaignNightPage({
  params,
}: {
  params: Promise<{ id: string; nightId: string }>
}) {
  const user = await requireSessionUser()
  const { id, nightId } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  const [nights, party] = await Promise.all([
    listNights(user.id, id),
    countPartyReadiness(user.id, id),
  ])

  const night = nights?.find((one) => one.id === nightId)
  if (!night) notFound()

  const tallies = night.plan ? await listPlanTallies(user.id, id, party) : {}

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <PageHeader
        title={nightTitle(night)}
        subtitle={`${campaign.name} · ${nightLabel(night)}`}
        backHref={`/dm/campaigns/${id}/sessions`}
        backLabel="Sessions"
      />

      <NightBoard
        campaignId={id}
        night={night}
        tally={night.plan ? (tallies[night.plan.id] ?? null) : null}
        readOnly={campaign.closedAt !== null}
      />
    </main>
  )
}
