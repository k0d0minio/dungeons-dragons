import { DmTab } from '@/components/dm/dm-tab'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sessions',
}

/**
 * Sessions — what happened, after the night (D48).
 *
 * The timeline of nights played and the recap each one produced, plus the
 * closed campaigns that are this table's history. It fills in with
 * `dm-chronology/session-chain` and `sessions-tab`.
 */
export default async function DmSessionsPage() {
  return (
    <DmTab
      title="Sessions"
      subtitle="After the night: what happened, the recap the table gets, and the campaigns behind you."
    />
  )
}
