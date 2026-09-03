import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDiscoveredOn } from '@/lib/campaigns/discovered'
import type { PublicLocation, PublicNpc } from '@/lib/db/discovered'

/**
 * The public layer of a revealed NPC or location — the two are the same shape
 * and the same card twice.
 *
 * Typed as the union of the two *public* row types rather than a hand-written
 * interface, so a column moving between layers in `schema.ts` is a compile
 * error here rather than a blank line on a phone.
 */
type Discovered = PublicNpc | PublicLocation

/**
 * People the party has met, or places it has found
 * (`dm-run-suite/player-campaign-view`).
 *
 * One component for both because the difference between an NPC and a location,
 * to a player reading a list of them, is the heading. What each row can contain
 * is fixed by the query that fetched it: `listDiscoveredNpcs` and
 * `listDiscoveredLocations` select public columns only, so there is no
 * `secrets` field on these objects for this component to render even by
 * mistake.
 *
 * The order is the query's, not this component's: both lists arrive newest
 * reveal first (`dm-run-suite/reveal-controls`), so the person the DM just
 * introduced is at the top rather than filed alphabetically halfway down. This
 * component must never sort them.
 *
 * Renders nothing when the list is empty rather than an empty box — the page
 * says "nothing yet" once, for all three sections, instead of three times.
 */
export function DiscoveredList({
  title,
  description,
  entries,
}: {
  title: string
  description: string
  entries: Discovered[]
}) {
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="space-y-1 rounded-md border p-3">
              <h3 className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="font-medium">{entry.name}</span>
                {entry.revealedAt ? (
                  <span className="text-muted-foreground text-xs">
                    {formatDiscoveredOn(entry.revealedAt)}
                  </span>
                ) : null}
              </h3>

              {entry.summary ? <p className="text-sm">{entry.summary}</p> : null}

              {/* The DM's longer blurb, written as paragraphs — without
                  pre-wrap it reads as one block. */}
              {entry.description ? (
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {entry.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
