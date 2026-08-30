'use client'

import { Badge } from '@/components/ui/badge'
import { formatMagicItemType } from '@/lib/srd/format'
import { useMagicItem } from '@/lib/srd/hooks'
import { DescriptionText, DetailError, DetailLoading, DetailSection } from './detail-parts'

export function MagicItemDetail({ index }: { index: string }) {
  const { magicItem, isLoading, error } = useMagicItem(index)

  if (isLoading) return <DetailLoading label="magic item" />
  if (error || !magicItem) return <DetailError label="magic item" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>{magicItem.rarity}</Badge>
        <Badge variant="outline">{magicItem.categoryName}</Badge>
        {/* 2024 upstream carries attunement as a flag, so nothing here has to
            pattern-match "(requires attunement)" out of the prose the way the
            2014 detail view did. */}
        {magicItem.attunement && <Badge variant="secondary">Requires attunement</Badge>}
      </div>

      <p className="text-sm text-muted-foreground italic">{formatMagicItemType(magicItem)}</p>

      <DetailSection title="Description">
        <DescriptionText desc={magicItem.description} />
      </DetailSection>

      {magicItem.variants.length > 0 && (
        <DetailSection title="Variants">
          <div className="flex flex-wrap gap-2">
            {magicItem.variants.map((variant) => (
              <Badge key={variant} variant="secondary">
                {variant.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        </DetailSection>
      )}
    </div>
  )
}
