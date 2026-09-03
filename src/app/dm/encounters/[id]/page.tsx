import Link from 'next/link'
import { notFound } from 'next/navigation'

import { QuickNoteCard } from '@/components/campaigns/quick-note-card'
import { DeleteEncounterCard } from '@/components/encounters/delete-encounter-card'
import { EncounterTracker } from '@/components/encounters/encounter-tracker'
import { ShareTableCard } from '@/components/encounters/share-table-card'
import { PageHeader } from '@/components/navigation/page-header'
import { Button } from '@/components/ui/button'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getEncounterForDm } from '@/lib/db/encounters'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Encounter',
}

/**
 * The encounter tracker (DND-031) — the screen the DM holds open for three
 * hours. DM-scoped in the query: anyone else's encounter id 404s like it
 * never existed. The server render seeds the tracker; from there the client
 * owns the state, polling every ~15 s (D25).
 */
export default async function EncounterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const detail = await getEncounterForDm(user.id, id)
  if (!detail) notFound()

  const { encounter, combatants } = detail

  // The Add combatants sheet's Party tab offers the campaign's roster.
  const roster = await getCampaignRoster(user.id, encounter.campaignId)
  const rosterOptions = (roster?.characters ?? []).map((character) => ({
    id: character.id,
    name: character.name,
  }))

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title={encounter.name}
        backHref={`/dm/campaigns/${encounter.campaignId}`}
        backLabel={roster?.campaign.name ?? 'Campaign'}
        actions={
          // In the header rather than beside "Next turn"
          // (`dm-run-suite/dm-rules-crib`): the ruling the DM has stopped for
          // is not part of the turn loop, and a link sharing an edge with the
          // button pressed forty times an evening is a mis-tap waiting to
          // happen. The tracker's state is the server's, so leaving and coming
          // back costs nothing.
          <Button asChild variant="outline" className="h-11">
            <Link href="/dm/crib">Crib</Link>
          </Button>
        }
      />

      <EncounterTracker
        initialEncounter={encounter}
        initialCombatants={combatants}
        roster={rosterOptions}
      />

      {/* Directly under the tracker (DND-058): the thing worth writing down
          happens in the fight, and reaching it must not mean leaving the
          initiative order. */}
      <QuickNoteCard campaignId={encounter.campaignId} />

      <ShareTableCard encounterId={encounter.id} shareToken={encounter.shareToken} />

      <DeleteEncounterCard
        encounterId={encounter.id}
        name={encounter.name}
        campaignId={encounter.campaignId}
      />
    </main>
  )
}
