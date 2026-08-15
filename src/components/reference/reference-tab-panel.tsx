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

/** A tab other than this one that has matches for the current query. */
export interface OtherTabMatch {
  value: string
  label: string
  count: number
}

/**
 * How many cards a tab shows before it asks you to tap for more. Twelve fills
 * a desktop grid and stays a short scroll on a phone; the rest is one tap away
 * rather than silently missing (DND-021).
 */
export const REFERENCE_PAGE_SIZE = 12

/**
 * One reference tab: the card, its heading count, and every state the list can
 * be in — loading, failed, no matches, truncated, complete.
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
  totalCount,
  isLoading,
  error,
  query,
  spinnerClassName,
  onSelect,
  otherMatches = [],
  onJumpToTab,
}: {
  title: string
  pluralNoun: string
  icon: ReactNode
  description: string
  badge: string
  items: ReferenceListItem[]
  totalCount: number
  isLoading: boolean
  error: unknown
  query: string
  spinnerClassName: string
  onSelect: (item: { index: string; name: string }) => void
  otherMatches?: OtherTabMatch[]
  onJumpToTab?: (value: string) => void
}) {
  const [visibleCount, setVisibleCount] = useState(REFERENCE_PAGE_SIZE)
  const trimmedQuery = query.trim()

  // A new query is a new list — start it from the top rather than partway
  // through the previous search's "show more" chain. Adjusted during render
  // rather than in an effect, so the reset happens before the old slice is
  // ever painted (react.dev/learn/you-might-not-need-an-effect).
  const [lastQuery, setLastQuery] = useState(trimmedQuery)

  if (lastQuery !== trimmedQuery) {
    setLastQuery(trimmedQuery)
    setVisibleCount(REFERENCE_PAGE_SIZE)
  }

  const usableItems = items.filter((item) => item && item.index)
  const matchCount = usableItems.length
  const visibleItems = usableItems.slice(0, visibleCount)
  const remaining = matchCount - visibleItems.length

  // Loading and error states have no honest count to show, so they show none.
  const heading =
    isLoading || error
      ? title
      : trimmedQuery
        ? `${title} (${matchCount} of ${totalCount})`
        : `${title} (${totalCount})`

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
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading {pluralNoun}...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Badge variant="destructive">Error loading {pluralNoun}</Badge>
          </div>
        ) : matchCount === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {trimmedQuery
                ? `No ${pluralNoun} match “${trimmedQuery}”.`
                : `No ${pluralNoun} in the reference data.`}
            </p>
            {trimmedQuery && otherMatches.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-sm">Found in:</span>
                {otherMatches.map((match) => (
                  <Button
                    key={match.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11"
                    onClick={() => onJumpToTab?.(match.value)}
                  >
                    {match.label} ({match.count})
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
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
                  Showing {visibleItems.length} of {matchCount} {pluralNoun}
                  {trimmedQuery ? ` matching “${trimmedQuery}”` : ''}.
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
            ) : matchCount > REFERENCE_PAGE_SIZE ? (
              <p className="text-muted-foreground text-center text-sm" aria-live="polite">
                Showing all {matchCount} {pluralNoun}.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
