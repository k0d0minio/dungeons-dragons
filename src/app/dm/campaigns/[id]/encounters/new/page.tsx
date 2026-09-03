import { notFound } from 'next/navigation'

import { EncounterBuilder } from '@/components/encounters/encounter-builder'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Build an encounter',
}

/**
 * The encounter builder (`dm-prep-suite/encounter-builder`) — the door every
 * new encounter now comes through.
 *
 * A page rather than a card on the campaign page, for the same reason prep is:
 * the campaign page is what gets opened mid-session, and assembling a fight is
 * a different visit from running one. DM-scoped in the query — anyone else's
 * campaign id 404s like it never existed.
 *
 * The roster is served with levels, because levels are the budget. Nothing else
 * about a character reaches the client here.
 */
export default async function NewEncounterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const attendees = roster.characters.map((character) => ({
    id: character.id,
    name: character.name,
    level: character.level,
  }))

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Build an encounter"
        subtitle="Monsters, and what they cost the people who turn up."
        backHref={`/dm/campaigns/${id}`}
        backLabel={roster.campaign.name}
      />

      <EncounterBuilder campaignId={id} roster={attendees} />
    </main>
  )
}
