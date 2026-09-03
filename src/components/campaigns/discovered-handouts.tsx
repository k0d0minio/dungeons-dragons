import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDiscoveredOn } from '@/lib/campaigns/discovered'
import type { DiscoveredHandout } from '@/lib/db/discovered'

/**
 * What the DM has handed the party (`dm-run-suite/player-campaign-view`).
 *
 * Its own card rather than another `DiscoveredList` because a handout is the
 * one revealed thing with a picture, and the picture is the point — a letter or
 * a map fragment is looked *at*, not read about.
 *
 * **The `<img>` src is the app's own member-scoped route.** The row this
 * renders never carried the store key: `listDiscoveredHandouts` selects the
 * upload timestamp and nothing else about the image, so there is no address in
 * this component's props that could reach a browser, and the bytes come from a
 * handler that re-asks whether the reader is seated at the table and whether
 * the handout is revealed.
 *
 * Newest first, as the query ordered them: the handout the party is looking at
 * is the one that was just produced.
 */
export function DiscoveredHandouts({
  campaignId,
  handouts,
}: {
  campaignId: string
  handouts: DiscoveredHandout[]
}) {
  if (handouts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Handouts</CardTitle>
        <CardDescription>What your DM has passed across the table.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {handouts.map((handout) => (
            <li key={handout.id} className="space-y-2 rounded-md border p-3">
              <h3 className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="font-medium">{handout.title}</span>
                {handout.revealedAt ? (
                  <span className="text-muted-foreground text-xs">
                    {formatDiscoveredOn(handout.revealedAt)}
                  </span>
                ) : null}
              </h3>

              {handout.imageUploadedAt ? (
                /* Not `next/image` — see `image-slot-field`: a private authed
                   route with no known dimensions. The `?v=` is the upload
                   time, so a replaced scan is never served from cache. */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/campaigns/${campaignId}/discovered/handouts/${handout.id}/image?v=${encodeURIComponent(handout.imageUploadedAt)}`}
                  alt={handout.title}
                  className="max-h-80 w-full rounded-md border object-contain"
                />
              ) : null}

              {handout.body ? <p className="text-sm whitespace-pre-wrap">{handout.body}</p> : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
