import { notFound } from 'next/navigation'

import { PartyGlance } from '@/components/campaigns/party-glance'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'The party',
}

/**
 * The party, on a page of its own (`dm-chronology/eight-steps-plan`).
 *
 * The Lazy DM's first step is *review the characters*, and until now that step
 * had nowhere to go: the glance lived halfway down the campaign hub, and the
 * DM's page for one character was reachable only from inside it. The eight-step
 * rail's first row needs a door, so the glance gets one — the same component,
 * the same read, at a URL that says what it is.
 *
 * It is `PartyGlance` and nothing else on purpose. Every row on it already
 * leads to that character's own DM page, which is where "is this sheet ready"
 * is actually answered (`first-table/dm-character-profile`); a second summary
 * of the same roster here would be a second thing to keep in step with it.
 *
 * `getCampaignRoster` is DM-scoped, so another DM's campaign id 404s exactly
 * like one that never existed.
 */
export default async function DmPartyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const { campaign, characters } = roster
  const headcount = `${characters.length} ${characters.length === 1 ? 'character' : 'characters'}`

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="The party"
        subtitle={`${campaign.name} · ${headcount}`}
        backHref="/dm/prep"
        backLabel="Prep"
      />

      <PartyGlance
        campaignId={campaign.id}
        initialCharacters={characters}
        initialArmor={roster.armor}
      />
    </main>
  )
}
