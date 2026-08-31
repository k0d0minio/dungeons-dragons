'use client'

import { Badge } from '@/components/ui/badge'
import { formatArmorClass, formatCost, formatWeight } from '@/lib/srd/format'
import { useEquipmentItem } from '@/lib/srd/hooks'
import { WEAPONS, propertiesFor, masteryFor } from '@/lib/srd/weapons'
import type { SrdRange } from '@/lib/srd/types'
import {
  DescriptionText,
  DetailError,
  DetailLoading,
  DetailSection,
  NamedEntries,
  ReferenceBadges,
  Stat,
  StatGrid,
} from './detail-parts'

function formatRange(range: SrdRange | null): string | null {
  if (!range) return null
  return range.long ? `${range.normal}/${range.long} ft.` : `${range.normal} ft.`
}

/** `1d8 slashing`, with the Versatile damage the SRD prints in brackets. */
function formatDamage(weapon: NonNullable<ReturnType<typeof WEAPONS.get>>): string | null {
  if (!weapon.damage) return null
  const base = `${weapon.damage.dice} ${weapon.damage.type}`
  return weapon.twoHandedDamage ? `${base} (${weapon.twoHandedDamage.dice} two-handed)` : base
}

export function EquipmentDetail({ index }: { index: string }) {
  const { equipment, isLoading, error } = useEquipmentItem(index)

  if (isLoading) return <DetailLoading label="equipment" />
  if (error || !equipment) return <DetailError label="equipment" />

  // The weapon columns — damage, properties, mastery — live on the weapons
  // table rather than being restated on every equipment row. `null` for the
  // 144 rows that are not weapons.
  const weapon = WEAPONS.get(index)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {equipment.categories.map((category) => (
          <Badge key={category} variant="outline" className="capitalize">
            {category.replace(/-/g, ' ')}
          </Badge>
        ))}
        {equipment.stealthDisadvantage && <Badge variant="destructive">Stealth Disadvantage</Badge>}
      </div>

      <StatGrid>
        <Stat label="Cost" value={formatCost(equipment.cost)} />
        <Stat label="Weight" value={formatWeight(equipment.weight)} />
        <Stat label="Damage" value={weapon ? formatDamage(weapon) : null} />
        <Stat
          label="Range"
          value={weapon ? formatRange(weapon.range ?? weapon.throwRange) : null}
        />
        <Stat label="Mastery" value={weapon ? (masteryFor(index)?.name ?? null) : null} />
        <Stat label="Armor Class" value={formatArmorClass(equipment.armorClass)} />
        <Stat label="Strength" value={equipment.strengthMinimum} />
        <Stat label="Don" value={equipment.donTime} />
        <Stat label="Doff" value={equipment.doffTime} />
      </StatGrid>

      {equipment.description.length > 0 && (
        <DetailSection title="Description">
          <DescriptionText desc={equipment.description} />
        </DetailSection>
      )}

      {equipment.notes.length > 0 && (
        <DetailSection title="Notes">
          <DescriptionText desc={equipment.notes} />
        </DetailSection>
      )}

      {weapon && propertiesFor(index).length > 0 && (
        <DetailSection title="Properties">
          <NamedEntries entries={propertiesFor(index)} />
        </DetailSection>
      )}

      {/* The SRD's Utilize line: what the item does, and the check it takes. */}
      {equipment.utilize.length > 0 && (
        <DetailSection title="Utilize">
          <ul className="space-y-1 text-sm text-foreground">
            {equipment.utilize.map((use) => (
              <li key={use.name}>
                {use.name}
                {use.ability && use.dc !== null && ` — DC ${use.dc} ${use.ability}`}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {equipment.contents.length > 0 && (
        <DetailSection title="Contents">
          <ReferenceBadges
            items={equipment.contents.map((entry) => ({
              index: entry.index,
              name:
                entry.quantity > 1
                  ? `${entry.index.replace(/-/g, ' ')} ×${entry.quantity}`
                  : entry.index.replace(/-/g, ' '),
            }))}
          />
        </DetailSection>
      )}
    </div>
  )
}
