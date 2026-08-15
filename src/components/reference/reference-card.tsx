'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

/**
 * A tappable list card. The whole card is the button so the touch target
 * spans the full row rather than a small label (NFR-002).
 */
export function ReferenceCard({
  name,
  badge,
  onSelect,
}: {
  name: string
  badge: string
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`View details for ${name}`}
      className="focus-visible:ring-ring w-full rounded-xl text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card className="h-full py-0 transition-shadow hover:shadow-lg active:shadow-sm">
        <CardContent className="flex min-h-[44px] items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
              <Badge variant="outline" className="shrink-0">
                {badge}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tap to view details</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </CardContent>
      </Card>
    </button>
  )
}
