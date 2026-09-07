import { notFound } from 'next/navigation'

import { SessionsBoard } from '@/components/dm/sessions-board'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sessions',
}

/**
 * One campaign's own timeline (`dm-chronology/sessions-tab`).
 *
 * The Sessions tab is about the campaign the DM is running; this is the same
 * timeline for a named one, and it exists for the tables that are over. A
 * closed campaign is not on the chip's menu — the chip switches between tables
 * still running (D48) — so its history is reached by a row at the bottom of
 * the tab, which lands here and is read-only, because `SessionsBoard` drops
 * every chip and every write on a campaign with a `closed_at`.
 *
 * DM-scoped in the query: `campaigns.dm_user_id` and nowhere else, so another
 * DM's campaign id 404s exactly like one that never existed.
 */
export default async function CampaignSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <PageHeader
        title="Sessions"
        subtitle={
          campaign.closedAt
            ? `${campaign.name} · closed`
            : `${campaign.name} · every night in order`
        }
        backHref="/dm/sessions"
        backLabel="Sessions"
      />

      <SessionsBoard campaign={campaign} dmUserId={user.id} withEarlier={false} />
    </main>
  )
}
