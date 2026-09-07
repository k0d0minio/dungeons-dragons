import { DmTab } from '@/components/dm/dm-tab'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Play',
}

/**
 * Play — the DM's home while the table is in front of him (D48), and where
 * `/dm` now lands.
 *
 * One tap in, never two: the tracker, the crib, the table screen, the quick
 * note and reveal all belong on this screen. They arrive in
 * `dm-chronology/play-tab`; this stub builds the door they hang behind.
 */
export default async function DmPlayPage() {
  return (
    <DmTab
      title="Play"
      subtitle="Tonight, in front of the table: the fight, the party, and what you reveal."
    />
  )
}
