import { DmTab } from '@/components/dm/dm-tab'
import { PrepBoard } from '@/components/dm/prep-board'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Prep',
}

/**
 * Prep — the first stop on the DM's bar (D48): what you do before the night.
 *
 * The shell, the chip and the empty state are `DmTab`'s; what this tab is
 * *about* is `PrepBoard` — the next night on top, and the doors to everything
 * already written beneath it. The Lazy DM eight steps arrive on the plan
 * screen itself in `dm-chronology/eight-steps-plan`, and the rail here counts
 * whatever that function returns.
 */
export default async function DmPrepPage() {
  return (
    <DmTab
      title="Prep"
      subtitle="Before the night: the world, the people in it, and the plan for the next session."
      content={({ campaign, dmUserId }) => <PrepBoard campaign={campaign} dmUserId={dmUserId} />}
    />
  )
}
