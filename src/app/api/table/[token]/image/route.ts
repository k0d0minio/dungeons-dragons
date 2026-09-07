// The picture of whatever is on the table screen right now
// (`dm-run-suite/table-screen-cast`).
//
// **The narrowest image route in the app, and its URL is the reason.** It
// names no entity: the only bytes it will ever serve are those attached to the
// thing the DM has *currently cast*, so an unrevealed handout is not one
// guessed id away from the party — it is not addressable here at all. Cast
// something else and the previous picture stops being fetchable in the same
// write that moved the screen.
//
// Public, like the feed beside it and for the same reason: the token is the
// credential. `loadSpotlightImage` carries the campaign, the pointer and
// `revealed_at is not null`, so a handout the DM hid again 404s from this URL
// while the screen is still catching up.
//
// GET only. Nothing writes an image from a screen nobody is signed in to.
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadSpotlightImage } from '@/lib/db/table'
import { serveSlotImage, type ImageSlot } from '@/lib/images/slot'
import { databaseUnconfigured } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { token } = await params

  return serveSlotImage({
    noun: 'picture',
    // The store key is built by the loader from the row it read, never from
    // anything in this request — these two are unused on the read path and are
    // here because the slot shape is shared with the upload routes.
    campaignId: 'table',
    key: `table/${token}`,
    load: () => loadSpotlightImage(token),
    set: () => {
      throw new Error('The table screen cannot change a picture')
    },
  } satisfies ImageSlot<never>)
}
