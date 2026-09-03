import { notFound } from 'next/navigation'

import { CloseSessionCard } from '@/components/campaigns/close-session-card'
import { QuickNoteCard } from '@/components/campaigns/quick-note-card'
import { SessionLogCard } from '@/components/campaigns/session-log-card'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { composeRecapDraft } from '@/lib/campaigns/session-log'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getSessionLog } from '@/lib/db/session-log'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Session log',
}

/**
 * The session log and the close-session step
 * (`dm-run-suite/session-log-recap`) — DM-only, and the only screen in the app
 * that shows an evening as a whole.
 *
 * **Its own page rather than a card on the campaign page.** The campaign page
 * is what gets opened mid-session to check the party or start a fight, and the
 * log is read twice an evening at most: once to see where the night has got to,
 * once at the end to write it up. A card there would be a screen of history
 * above the two things a DM opens that page for.
 *
 * Everything here is server-rendered from the derived log
 * (`src/lib/db/session-log.ts`) — there is no session-log state to poll for,
 * because the acts that fill it happen on other screens and this page is
 * re-rendered when the DM arrives. Authority is the query's:
 * `getSessionLog` folds `campaigns.dm_user_id` into every statement, so
 * another DM's campaign id 404s exactly like one that never existed.
 *
 * The quick-note field is here as well as on the tracker, and lands in the
 * same note (DND-058): the thing worth writing down between fights is written
 * down where the DM is looking at what already happened.
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
  const roster = await getCampaignRoster(user.id, id)

  const draft = composeRecapDraft({
    entries: log.entries,
    capturedNotes: log.note?.body ?? null,
  })

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-16">
      <PageHeader
        title="Session log"
        subtitle={roster?.campaign.name ?? 'Campaign'}
        backHref={`/dm/campaigns/${id}`}
        backLabel={roster?.campaign.name ?? 'Campaign'}
      />

      <SessionLogCard
        entries={log.entries}
        since={log.since}
        capturedNotes={log.note?.body ?? null}
        capturedOn={log.note?.sessionDate ?? null}
      />

      <QuickNoteCard campaignId={id} />

      <CloseSessionCard campaignId={id} draft={draft} />
    </main>
  )
}
