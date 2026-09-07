import { DmTab } from '@/components/dm/dm-tab'
import { PlayBoard } from '@/components/dm/play-board'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Play',
}

/**
 * Play — the screen a DM has open with players either side of him (D48), and
 * where `/dm` lands.
 *
 * The shell, the chip and the empty state are `DmTab`'s; what this tab is
 * *about* is `PlayBoard` — the fight, the party, tonight's plan and reveal, in
 * the order a hand reaches for them, with the four one-tap actions in a
 * toolbar above the bar.
 */
export default async function DmPlayPage() {
  return (
    <DmTab
      title="Play"
      subtitle="Tonight, in front of the table: the fight, the party, and what you reveal."
      content={({ campaign, dmUserId }) => <PlayBoard campaign={campaign} dmUserId={dmUserId} />}
    />
  )
}
