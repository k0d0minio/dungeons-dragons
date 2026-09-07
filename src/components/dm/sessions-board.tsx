import { SessionsTimeline, type EarlierTable } from '@/components/dm/sessions-timeline'
import { listCampaignsForDm } from '@/lib/db/campaigns'
import { countRecapsByCampaign, listCampaignNotes } from '@/lib/db/notes'
import { countPartyReadiness } from '@/lib/db/prep'
import type { Campaign } from '@/lib/db/schema'
import { listNights } from '@/lib/db/session-log'
import { listPlanTallies } from '@/lib/db/session-plans'
import { notesWithoutANight } from '@/lib/sessions/timeline'

// Everything under the Sessions tab's title (`dm-chronology/sessions-tab`).
//
// The reads, and only the reads: the arrangement is `SessionsTimeline`'s and
// the words are `src/lib/sessions/timeline.ts`'. A server component that does
// its own loading, like `PrepBoard` and `PlayBoard` — every statement folds
// `campaigns.dm_user_id` in, and a campaign that is not this DM's comes back
// as no nights rather than as someone else's history.
//
// Four reads for a whole season, whatever the number of nights: `listNights`
// cuts one pass of the campaign's acts into windows, `listCampaignNotes` is
// what the orphan group is worked out from, `listPlanTallies` counts every
// plan's eight steps in three statements, and the earlier tables are one list
// and one grouped count.

/** The DM's closed campaigns, newest close first — the tables behind them. */
async function earlierTables(dmUserId: string, exclude: string): Promise<EarlierTable[]> {
  const all = await listCampaignsForDm(dmUserId)

  const closed = all
    .filter((campaign) => campaign.closedAt !== null && campaign.id !== exclude)
    .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0))

  if (closed.length === 0) return []

  const nights = await countRecapsByCampaign(
    dmUserId,
    closed.map((campaign) => campaign.id),
  )

  return closed.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    closedOn: (campaign.closedAt ?? campaign.createdAt).toISOString().slice(0, 10),
    nights: nights[campaign.id] ?? 0,
  }))
}

export async function SessionsBoard({
  campaign,
  dmUserId,
  /** The tab shows the tables behind you; one campaign's own timeline does not. */
  withEarlier = true,
}: {
  campaign: Campaign
  dmUserId: string
  withEarlier?: boolean
}) {
  const [nights, notes, party] = await Promise.all([
    listNights(dmUserId, campaign.id),
    listCampaignNotes(dmUserId, campaign.id),
    countPartyReadiness(dmUserId, campaign.id),
  ])

  const [tallies, earlier] = await Promise.all([
    listPlanTallies(dmUserId, campaign.id, party),
    withEarlier ? earlierTables(dmUserId, campaign.id) : Promise.resolve([]),
  ])

  return (
    <SessionsTimeline
      campaignId={campaign.id}
      nights={nights ?? []}
      tallies={tallies}
      orphanNotes={notesWithoutANight(nights ?? [], notes ?? [])}
      sessionZero={{
        date: campaign.createdAt.toISOString().slice(0, 10),
        written: (campaign.sessionZero ?? '').trim().length > 0,
      }}
      earlier={earlier}
      // A campaign the DM has closed is history: it is read, and every chip
      // and every write on it is gone.
      readOnly={campaign.closedAt !== null}
    />
  )
}
