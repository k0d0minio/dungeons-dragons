import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CampaignNotesCard } from '@/components/campaigns/campaign-notes-card'
import { JoinCodeCard } from '@/components/campaigns/join-code-card'
import { PartyGlance } from '@/components/campaigns/party-glance'
import { EncountersCard } from '@/components/encounters/encounters-card'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listEncounters } from '@/lib/db/encounters'
import { listCampaignNotes } from '@/lib/db/notes'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Campaign',
}

/**
 * One campaign, as its DM sees it (DND-046, DND-030, DND-031): the join link
 * to hand out, the party at a glance — live HP, AC, passive Perception and
 * conditions, polling every ~15 s (D25) — and the campaign's encounters. DM-
 * scoped in the query; anyone else's campaign id 404s like it never existed.
 * Glance rows link to the real sheets, which the DND-027 viewer predicate
 * lets the DM open.
 */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const [encounters, notes] = await Promise.all([
    listEncounters(user.id, id),
    listCampaignNotes(user.id, id),
  ])

  const { campaign, members, characters } = roster
  const playerCount = members.filter((member) => member.role === 'player').length

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="space-y-1">
        <Link
          href="/dm"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← DM
        </Link>
        <h2 className="text-2xl font-bold">{campaign.name}</h2>
        <p className="text-muted-foreground text-sm">
          {playerCount} {playerCount === 1 ? 'player' : 'players'} · {characters.length}{' '}
          {characters.length === 1 ? 'character' : 'characters'}
        </p>
      </div>

      <PartyGlance campaignId={campaign.id} initialCharacters={characters} />

      <EncountersCard campaignId={campaign.id} encounters={encounters} />

      {/* Notes sit below the party and the fights: at a table you open this
          page to see the party or start an encounter, and you write the note
          up afterwards. Mid-session capture does not come through here at all
          — it is the quick-note field on the tracker (DND-058). */}
      <CampaignNotesCard campaignId={campaign.id} notes={notes ?? []} />

      <JoinCodeCard campaignId={campaign.id} joinCode={campaign.joinCode} />
    </main>
  )
}
