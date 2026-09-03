// A party member's portrait, for the people they play with
// (`dm-run-suite/player-campaign-view`).
//
// `characters.portrait` arrived with the image store (`locations-handouts`) and
// this is its first reader. There is no reveal switch on a character — a
// character is not prep — so what stands in `revealed_at`'s place is the
// roster: `loadPartyPortrait` requires the character to be on this campaign's
// `character_campaigns` and the asker to be seated at the same campaign. A face
// is visible to the table it plays at, and to nobody else.
//
// GET only. Nothing writes this column yet; where a player edits their own face
// is a judgment a later ticket makes, and it will not be here.
import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { loadPartyPortrait } from '@/lib/db/discovered'
import { serveSlotImage, type ImageSlot } from '@/lib/images/slot'
import { databaseUnconfigured, unauthorized } from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; characterId: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id, characterId } = await params

  return serveSlotImage({
    noun: 'character',
    campaignId: id,
    key: `characters/${characterId}`,
    load: () => loadPartyPortrait(user.id, id, characterId),
    set: () => {
      throw new Error('The party screen cannot change a portrait')
    },
  } satisfies ImageSlot<never>)
}
