import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Encounter } from '@/lib/db/schema'

/**
 * A campaign's encounters (DND-031): the list, and the way in to a new one.
 *
 * The one-field create form that used to live here is gone
 * (`dm-prep-suite/encounter-builder`). It made an encounter in a tap, and the
 * cost of that tap was a DM arriving at the tracker with no idea whether what
 * they were about to add could kill somebody. The builder asks for the same
 * name as its first field, so nothing is slower except by one navigation — and
 * what it gives back is the difficulty readout, which is the whole point.
 *
 * A server component now: with the form gone there is no state left to own.
 */
export function EncountersCard({
  campaignId,
  encounters,
}: {
  campaignId: string
  encounters: Encounter[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Encounters</CardTitle>
        <CardDescription>
          Each one keeps its own initiative order and per-monster hit points, and survives between
          sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {encounters.length > 0 ? (
          <ul className="space-y-2">
            {encounters.map((encounter) => (
              <li key={encounter.id}>
                <Link
                  href={`/dm/encounters/${encounter.id}`}
                  className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{encounter.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      Round {encounter.round}
                    </span>
                  </span>
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No encounters yet.</p>
        )}

        <Button asChild className="h-11 w-full">
          <Link href={`/dm/campaigns/${campaignId}/encounters/new`}>Build an encounter</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
