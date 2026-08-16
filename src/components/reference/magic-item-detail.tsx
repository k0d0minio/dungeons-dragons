'use client'

import { Badge } from '@/components/ui/badge'
import { useMagicItem } from '@/lib/dnd-api/swr-hooks'
import {
  DescriptionText,
  DetailError,
  DetailLoading,
  DetailSection,
  ReferenceBadges,
} from './detail-parts'

/**
 * The API has no structured attunement field: the requirement lives in the
 * `desc[0]` type line as "(requires attunement)", sometimes with a qualifier —
 * "(requires attunement by a paladin)" on a Holy Avenger.
 */
export function requiresAttunement(desc?: string[]): boolean {
  return /requires attunement/i.test(desc?.[0] ?? '')
}

/** The "Wondrous item, uncommon" type line, when the prose leads with one. */
function typeLine(desc?: string[]): string | null {
  const first = desc?.[0]?.trim()
  if (!first) return null
  // A type line is a short fragment, not a paragraph of prose. Every SRD item
  // leads with one; if the shape ever changes, showing nothing beats showing
  // the first paragraph twice.
  return first.length <= 120 && !first.endsWith('.') ? first : null
}

export function MagicItemDetail({ index }: { index: string }) {
  const { magicItem, isLoading, error } = useMagicItem(index)

  if (isLoading) return <DetailLoading label="magic item" />
  if (error || !magicItem) return <DetailError label="magic item" />

  const line = typeLine(magicItem.desc)
  // The type line already states the attunement requirement; the prose is
  // everything after it.
  const prose = line ? magicItem.desc.slice(1) : (magicItem.desc ?? [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {magicItem.rarity?.name && <Badge>{magicItem.rarity.name}</Badge>}
        {magicItem.equipment_category?.name && (
          <Badge variant="outline">{magicItem.equipment_category.name}</Badge>
        )}
        {requiresAttunement(magicItem.desc) && (
          <Badge variant="secondary">Requires attunement</Badge>
        )}
      </div>

      {line && <p className="text-sm text-gray-600 italic dark:text-gray-400">{line}</p>}

      {prose.length > 0 && (
        <DetailSection title="Description">
          <DescriptionText desc={prose} />
        </DetailSection>
      )}

      {magicItem.variants?.length ? (
        <DetailSection title="Variants">
          <ReferenceBadges items={magicItem.variants} />
        </DetailSection>
      ) : null}
    </div>
  )
}
