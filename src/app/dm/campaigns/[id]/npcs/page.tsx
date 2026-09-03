import { notFound } from 'next/navigation'

import { NpcRoster } from '@/components/campaigns/npc-roster'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listCampaignNpcs } from '@/lib/db/npcs'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'NPCs',
}

/**
 * A campaign's NPC roster (`dm-prep-suite/npc-roster`).
 *
 * Its own page rather than another card on the campaign screen: a campaign that
 * has run a few sessions has more people in it than fights, and the campaign
 * page is what a DM opens mid-session to see the party or start an encounter.
 * Prep is a different visit.
 *
 * DM-scoped in the query — `campaigns.dm_user_id` and nowhere else — so someone
 * else's campaign id 404s here like it never existed, the same as the campaign
 * page it hangs off. There is deliberately no player route anywhere near this
 * one: the party reads revealed NPCs at `/campaigns/[id]`
 * (`dm-run-suite/player-campaign-view`), through a query that selects the
 * public layer only and never reaches this page's data. What decides whether an
 * NPC is on that list is the reveal switch on this one
 * (`dm-run-suite/reveal-controls`).
 */
export default async function CampaignNpcsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignForDm(user.id, id)
  if (!campaign) notFound()

  const npcs = await listCampaignNpcs(user.id, id)
  if (!npcs) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="NPCs"
        subtitle={`${campaign.name} · ${npcs.length} ${npcs.length === 1 ? 'NPC' : 'NPCs'}`}
        backHref={`/dm/campaigns/${campaign.id}`}
        backLabel={campaign.name}
      />

      <NpcRoster campaignId={campaign.id} npcs={npcs} />
    </main>
  )
}
