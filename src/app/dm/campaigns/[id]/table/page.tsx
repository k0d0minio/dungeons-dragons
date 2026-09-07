import { notFound } from 'next/navigation'

import { TableCaster, type TableCasterContent } from '@/components/campaigns/table-caster'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listCampaignHandouts } from '@/lib/db/handouts'
import { listCampaignLocations } from '@/lib/db/locations'
import { listCampaignNpcs } from '@/lib/db/npcs'
import { spotlightOf } from '@/lib/db/table'
import { CLASSES } from '@/lib/srd/classes'

// Reads the session and live prep, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Table screen',
}

/**
 * The DM's remote for the table screen (`dm-run-suite/table-screen-cast`).
 *
 * The screen at the end of the table has no controls on it — nobody is meant
 * to touch it — so every control it has is here, on the phone in the DM's
 * hand: the link to open it with, what is on it now, and everything that can
 * go on it next.
 *
 * DM-scoped in every query — `campaigns.dm_user_id` and nowhere else — so a
 * campaign someone else runs 404s here like it never existed. The **public**
 * half of this feature is `/table/[token]`, which reads through
 * `src/lib/db/table.ts` and never touches this page's data: what a DM sees
 * here is both layers of their own prep, and what the token buys is the public
 * layer of the one thing they cast.
 */
export default async function CampaignTableScreenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const [npcs, locations, handouts] = await Promise.all([
    listCampaignNpcs(user.id, id),
    listCampaignLocations(user.id, id),
    listCampaignHandouts(user.id, id),
  ])

  // The rows carry the DM's own view — a hidden badge, the private summary of
  // a place — because this page *is* the DM's. Nothing here is what the screen
  // renders; casting sends an id, and the public read builds the rest.
  const content: TableCasterContent = {
    characters: roster.characters.map((character) => ({
      target: { kind: 'character', id: character.id },
      label: character.name,
      detail: `Level ${character.level} ${CLASSES.get(character.classIndex)?.name ?? character.classIndex}`,
    })),
    npcs: (npcs ?? []).map((npc) => ({
      target: { kind: 'npc', id: npc.id },
      label: npc.name,
      detail: npc.summary,
      hidden: npc.revealedAt === null,
    })),
    locations: (locations ?? []).map((location) => ({
      target: { kind: 'location', id: location.id },
      label: location.name,
      detail: location.summary,
      hidden: location.revealedAt === null,
    })),
    handouts: (handouts ?? []).map((handout) => ({
      target: { kind: 'handout', id: handout.id },
      label: handout.title,
      hidden: handout.revealedAt === null,
    })),
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Table screen"
        subtitle={roster.campaign.name}
        backHref={`/dm/campaigns/${roster.campaign.id}`}
        backLabel="Campaign"
      />

      <TableCaster
        campaignId={roster.campaign.id}
        campaignName={roster.campaign.name}
        initialToken={roster.campaign.tableToken}
        initialSpotlight={spotlightOf(roster.campaign)}
        content={content}
      />
    </main>
  )
}
