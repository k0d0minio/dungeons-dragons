// A revealed handout's picture, for a player at the table
// (`dm-run-suite/player-campaign-view`).
//
// The DM's route two directories over serves the same bytes to whoever runs the
// campaign. This one serves them to whoever *sits* at it, and the difference is
// entirely in which function loads the row: `loadDiscoveredHandoutImage` carries
// membership **and** `revealed_at is not null`, so a handout the DM has staged
// but not produced is as unreachable here as one that does not exist.
//
// GET only, and that is the whole shape of the player surface: this page is
// read-only, so there is no POST to replace a picture and no DELETE to remove
// one. Uploading stays where authority to upload is.
import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadDiscoveredHandoutImage } from '@/lib/db/discovered'
import { serveSlotImage, type ImageSlot } from '@/lib/images/slot'
import { databaseUnconfigured, unauthorized } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; handoutId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, handoutId } = await params

  return serveSlotImage({
    noun: 'handout',
    campaignId: id,
    key: `handouts/${handoutId}`,
    load: () => loadDiscoveredHandoutImage(user.id, id, handoutId),
    // Read-only: `serveSlotImage` never calls this, and a player has no
    // business writing to a DM's handout. Throwing rather than quietly doing
    // nothing means a future edit that wires a write verb to this slot fails
    // loudly in a test instead of silently discarding the upload.
    set: () => {
      throw new Error('A player cannot change a handout image')
    },
  } satisfies ImageSlot<never>)
}
