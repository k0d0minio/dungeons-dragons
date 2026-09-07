import { DmTab } from '@/components/dm/dm-tab'
import { SessionsBoard } from '@/components/dm/sessions-board'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sessions',
}

/**
 * Sessions — what happened, after the night (D48).
 *
 * The timeline of nights, newest first, with the state of each in words on the
 * row: planned, tonight and open, played and recapped. Under it, the notes
 * that belong to no night, and the campaigns that are already behind you.
 *
 * The shell, the chip and the empty state are `DmTab`'s; what this tab is
 * *about* is `SessionsBoard` (`dm-chronology/sessions-tab`).
 */
export default async function DmSessionsPage() {
  return (
    <DmTab
      title="Sessions"
      subtitle="After the night: what happened, the recap the table gets, and the campaigns behind you."
      content={({ campaign, dmUserId }) => (
        <SessionsBoard campaign={campaign} dmUserId={dmUserId} />
      )}
    />
  )
}
