import { notFound } from 'next/navigation'

import { CloseSessionCard } from '@/components/campaigns/close-session-card'
import { QuickNoteCard } from '@/components/campaigns/quick-note-card'
import { NightBoard } from '@/components/dm/night-board'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { composeRecapDraft } from '@/lib/campaigns/session-log'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { countPartyReadiness } from '@/lib/db/prep'
import { getSessionLog, type SessionNight } from '@/lib/db/session-log'
import { listPlanTallies, listSessionPlans } from '@/lib/db/session-plans'
import { todaySessionDate } from '@/lib/notes/schema'
import { nextPlannedNight } from '@/lib/session-plans/next-night'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tonight',
}

/**
 * **Tonight's night page**, and the close step (`dm-chronology/sessions-tab`,
 * `dm-run-suite/session-log-recap`).
 *
 * It used to be "the session log": a card of what the app remembered, a quick
 * note field, and the close. It is now the same page every other night has —
 * what happened, your notes, the plan — with the one thing tonight has that
 * history does not underneath it: the step that publishes a recap and closes
 * the window. The timeline's tonight row is what leads here, and after the
 * close this evening becomes a played night at
 * `/dm/campaigns/[id]/sessions/[recapId]` rendered by the same `NightBoard`.
 *
 * Everything is server-rendered from the derived log
 * (`src/lib/db/session-log.ts`) — there is no session-log state to poll for,
 * because the acts that fill it happen on other screens and this page is
 * re-rendered when the DM arrives. Authority is the query's: `getSessionLog`
 * folds `campaigns.dm_user_id` into every statement, so another DM's campaign
 * id 404s exactly like one that never existed.
 *
 * The quick-note field stays as well as being a row in Your notes, and lands
 * in the same note (DND-058): the thing worth writing down between fights is
 * written down where the DM is looking at what already happened.
 */
export default async function SessionLogPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const log = await getSessionLog(user.id, id)
  if (!log) notFound()

  // For the header only. The log query already settled authority, so this
  // cannot come back null by the time we are here — the fallback is the
  // page's, not a second check.
  const [roster, plans, party] = await Promise.all([
    getCampaignRoster(user.id, id),
    listSessionPlans(user.id, id),
    countPartyReadiness(user.id, id),
  ])

  // Which plan the close will link (`dm-chronology/session-chain`), decided
  // here as well as in the route and by the same function, so the dialog names
  // the plan the write will actually stamp rather than a second guess at it.
  const tonightsPlan = nextPlannedNight(plans ?? [], todaySessionDate())

  // Tonight, in the shape every other night on the timeline has. It is built
  // from the open window rather than read back out of `listNights`, because
  // the open window is exactly what `getSessionLog` already answered and
  // asking twice would be two definitions of tonight.
  const night: SessionNight = {
    kind: 'tonight',
    id: 'tonight',
    date: todaySessionDate(),
    since: log.since,
    until: null,
    recap: null,
    plan: tonightsPlan
      ? {
          id: tonightsPlan.id,
          campaignId: tonightsPlan.campaignId,
          title: tonightsPlan.title,
          sessionDate: tonightsPlan.sessionDate,
          revealedAt: tonightsPlan.revealedAt,
          createdAt: tonightsPlan.createdAt,
        }
      : null,
    entries: log.entries,
    notes: log.note ? [log.note] : [],
  }

  const tallies = tonightsPlan ? await listPlanTallies(user.id, id, party) : {}

  const draft = composeRecapDraft({
    entries: log.entries,
    capturedNotes: log.note?.body ?? null,
  })

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <PageHeader
        title="Tonight"
        subtitle={roster?.campaign.name ?? 'Campaign'}
        backHref="/dm/sessions"
        backLabel="Sessions"
      />

      <NightBoard
        campaignId={id}
        night={night}
        tally={tonightsPlan ? (tallies[tonightsPlan.id] ?? null) : null}
      />

      <QuickNoteCard campaignId={id} />

      <CloseSessionCard
        campaignId={id}
        draft={draft}
        plans={(plans ?? []).map((plan) => ({
          id: plan.id,
          title: plan.title,
          sessionDate: plan.sessionDate,
        }))}
        suggestedPlanId={tonightsPlan?.id ?? null}
        characters={(roster?.characters ?? []).map((character) => ({
          id: character.id,
          name: character.name,
        }))}
      />
    </main>
  )
}
