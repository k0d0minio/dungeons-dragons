import { DmTab } from '@/components/dm/dm-tab'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Prep',
}

/**
 * Prep — the first stop on the DM's bar (D48): what you do before the night.
 *
 * The shell, the chip and the empty state are all this stub owes; the up-next
 * plan, the world, the party and session zero arrive in
 * `dm-chronology/prep-tab`, and the Lazy DM eight steps in `eight-steps-plan`.
 */
export default async function DmPrepPage() {
  return (
    <DmTab
      title="Prep"
      subtitle="Before the night: the world, the people in it, and the plan for the next session."
    />
  )
}
