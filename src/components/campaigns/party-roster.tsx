import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { characterInitials } from '@/lib/campaigns/discovered'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { PartyMember } from '@/lib/db/discovered'

/**
 * Who you play with (`dm-run-suite/player-campaign-view`).
 *
 * The DM's `PartyGlance` and this card look at the same table and show
 * deliberately different things. The glance is a DM's instrument — live HP, AC,
 * passive Perception, conditions — and it polls, because the DM needs it
 * current mid-fight. This is a party list: a name, a face, what they are and
 * what level. It does not poll and it links nowhere, because a player tapping
 * another player's row has nothing to do there — the sheets are owner-only, and
 * offering a link that 404s would be worse than offering none.
 *
 * The reader's own character is marked rather than pulled to the top: the list
 * is alphabetical so it reads the same on six phones, which is what makes it
 * usable as a thing to point at across a table.
 */
export function PartyRoster({ campaignId, party }: { campaignId: string; party: PartyMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">The party</CardTitle>
        <CardDescription>
          {party.length === 1 ? 'One character' : `${party.length} characters`} at this table.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {party.length > 0 ? (
          <ul className="space-y-2">
            {party.map((member) => (
              <li
                key={member.id}
                className="flex min-h-11 items-center gap-3 rounded-md border p-3"
              >
                {member.portrait ? (
                  /* Not `next/image`, for `image-slot-field`'s reason: an
                     authed private route with no known dimensions, which the
                     optimizer cannot help with and should not cache. The `?v=`
                     is the upload time, so a replaced portrait is not served
                     from a stale cache. */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/campaigns/${campaignId}/party/${member.id}/portrait?v=${encodeURIComponent(member.portrait.uploadedAt)}`}
                    alt=""
                    className="size-10 shrink-0 rounded-full border object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-medium"
                  >
                    {characterInitials(member.name)}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate font-medium">{member.name}</span>
                    {member.isYours ? (
                      <span className="text-muted-foreground text-xs">yours</span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    Level {member.level} {formatReferenceIndex(member.speciesIndex)}{' '}
                    {formatReferenceIndex(member.classIndex)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nobody has brought a character to this table yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
