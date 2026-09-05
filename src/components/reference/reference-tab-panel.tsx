'use client'

import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReferenceCard } from '@/components/reference/reference-card'

export interface ReferenceListItem {
  index: string
  name?: string
}

/**
 * How many cards a list shows before it asks you to tap for more. Twelve fills
 * a desktop grid and stays a short scroll on a phone; the rest is one tap away
 * rather than silently missing (DND-021).
 */
export const REFERENCE_PAGE_SIZE = 12

/**
 * One whole reference type, browsed rather than searched: the card, its
 * heading count, and every state the list can be in — loading, failed,
 * empty, truncated, complete.
 *
 * Since first-table/library-search-first the Library only mounts this with an
 * empty search box (a typed query lists grouped results instead), so the panel
 * no longer filters or points at other tabs — it is the alphabet, for the
 * player who wants to read it.
 *
 * The heading never claims a number the list below cannot reach. While the
 * fetch is in flight it shows no count at all rather than the `0` an empty SWR
 * array would produce, and when the list is capped the footer says so and
 * offers the rest.
 */
export function ReferenceTabPanel({
  title,
  pluralNoun,
  icon,
  description,
  badge,
  items,
  isLoading,
  error,
  spinnerClassName,
  onSelect,
}: {
  title: string
  pluralNoun: string
  icon: ReactNode
  description: string
  badge: string
  items: readonly ReferenceListItem[]
  isLoading: boolean
  error: unknown
  spinnerClassName: string
  onSelect: (item: { index: string; name: string }) => void
}) {
  const [visibleCount, setVisibleCount] = useState(REFERENCE_PAGE_SIZE)

  const usableItems = items.filter((item) => item && item.index)
  const totalCount = usableItems.length
  const visibleItems = usableItems.slice(0, visibleCount)
  const remaining = totalCount - visibleItems.length

  // Loading and error states have no honest count to show, so they show none.
  const heading = isLoading || error ? title : `${title} (${totalCount})`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {heading}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div
              className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto ${spinnerClassName}`}
            ></div>
            <p className="mt-2 text-muted-foreground">Loading {pluralNoun}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Badge variant="destructive">Error loading {pluralNoun}</Badge>
          </div>
        ) : totalCount === 0 ? (
          <p className="text-muted-foreground py-2 text-sm" aria-live="polite">
            No {pluralNoun} in the reference data.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleItems.map((item) => {
                const name = item.name || `Unknown ${badge}`

                return (
                  <ReferenceCard
                    key={item.index}
                    name={name}
                    badge={badge}
                    onSelect={() => onSelect({ index: item.index, name })}
                  />
                )
              })}
            </div>

            {remaining > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  Showing {visibleItems.length} of {totalCount} {pluralNoun}.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-auto"
                  onClick={() => setVisibleCount((count) => count + REFERENCE_PAGE_SIZE)}
                >
                  Show {Math.min(remaining, REFERENCE_PAGE_SIZE)} more
                </Button>
              </div>
            ) : totalCount > REFERENCE_PAGE_SIZE ? (
              <p className="text-muted-foreground text-center text-sm" aria-live="polite">
                Showing all {totalCount} {pluralNoun}.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
