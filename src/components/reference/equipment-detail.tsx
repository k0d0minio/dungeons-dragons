'use client'

import { Badge } from "@/components/ui/badge"
import { useEquipmentItem, type Equipment } from '@/lib/dnd-api/swr-hooks'
import {
  DescriptionText,
  DetailError,
  DetailLoading,
  DetailSection,
  ReferenceBadges,
  Stat,
  StatGrid,
} from './detail-parts'

function formatCost(cost?: Equipment['cost']): string | null {
  if (!cost || cost.quantity === undefined) return null
  return `${cost.quantity} ${cost.unit}`
}

function formatRange(range?: Equipment['range']): string | null {
  if (!range || range.normal === undefined) return null
  return range.long ? `${range.normal}/${range.long} ft.` : `${range.normal} ft.`
}

function formatArmorClass(armorClass?: Equipment['armor_class']): string | null {
  if (!armorClass || armorClass.base === undefined) return null
  if (!armorClass.dex_bonus) return `${armorClass.base}`
  const cap = armorClass.max_bonus !== undefined ? ` (max ${armorClass.max_bonus})` : ''
  return `${armorClass.base} + Dex modifier${cap}`
}

export function EquipmentDetail({ index }: { index: string }) {
  const { equipment, isLoading, error } = useEquipmentItem(index)

  if (isLoading) return <DetailLoading label="equipment" />
  if (error || !equipment) return <DetailError label="equipment" />

  const contents = (equipment.contents ?? []).filter((entry) => entry?.item?.name)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {equipment.equipment_category?.name && <Badge>{equipment.equipment_category.name}</Badge>}
        {equipment.weapon_category && (
          <Badge variant="outline">{equipment.weapon_category}</Badge>
        )}
        {equipment.armor_category && <Badge variant="outline">{equipment.armor_category}</Badge>}
        {equipment.stealth_disadvantage && (
          <Badge variant="destructive">Stealth Disadvantage</Badge>
        )}
      </div>

      <StatGrid>
        <Stat label="Cost" value={formatCost(equipment.cost)} />
        <Stat label="Weight" value={equipment.weight ? `${equipment.weight} lb.` : null} />
        <Stat
          label="Damage"
          value={
            equipment.damage
              ? `${equipment.damage.damage_dice} ${equipment.damage.damage_type?.name ?? ''}`.trim()
              : null
          }
        />
        <Stat label="Range" value={formatRange(equipment.range)} />
        <Stat label="Weapon Range" value={equipment.weapon_range} />
        <Stat label="Armor Class" value={formatArmorClass(equipment.armor_class)} />
        <Stat label="Tool Category" value={equipment.tool_category} />
        <Stat label="Vehicle Category" value={equipment.vehicle_category} />
        <Stat
          label="Speed"
          value={equipment.speed ? `${equipment.speed.quantity} ${equipment.speed.unit}` : null}
        />
        <Stat label="Capacity" value={equipment.capacity} />
        <Stat label="Quantity" value={equipment.quantity} />
      </StatGrid>

      {equipment.desc?.length ? (
        <DetailSection title="Description">
          <DescriptionText desc={equipment.desc} />
        </DetailSection>
      ) : null}

      {equipment.properties?.length ? (
        <DetailSection title="Properties">
          <ReferenceBadges items={equipment.properties} />
        </DetailSection>
      ) : null}

      {contents.length > 0 && (
        <DetailSection title="Contents">
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {contents.map((entry) => (
              <li key={entry.item.index}>
                {entry.item.name}
                {entry.quantity > 1 && ` ×${entry.quantity}`}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {equipment.special?.length ? (
        <DetailSection title="Special">
          <DescriptionText desc={equipment.special} />
        </DetailSection>
      ) : null}
    </div>
  )
}
