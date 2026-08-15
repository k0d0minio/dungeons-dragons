'use client'

import { Badge } from '@/components/ui/badge'
import { useSpell } from '@/lib/dnd-api/swr-hooks'
import {
  DescriptionText,
  DetailError,
  DetailLoading,
  DetailSection,
  ReferenceBadges,
  Stat,
  StatGrid,
} from './detail-parts'

export function formatSpellLevel(level: number): string {
  return level === 0 ? 'Cantrip' : `Level ${level}`
}

function formatComponents(components?: string[], material?: string): string | null {
  if (!components?.length) return null
  const list = components.join(', ')
  return material ? `${list} (${material})` : list
}

export function SpellDetail({ index }: { index: string }) {
  const { spell, isLoading, error } = useSpell(index)

  if (isLoading) return <DetailLoading label="spell" />
  if (error || !spell) return <DetailError label="spell" />

  const slotLevels = spell.damage?.damage_at_slot_level
    ? Object.entries(spell.damage.damage_at_slot_level)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>{formatSpellLevel(spell.level)}</Badge>
        {spell.school?.name && <Badge variant="outline">{spell.school.name}</Badge>}
        {spell.ritual && <Badge variant="secondary">Ritual</Badge>}
        {spell.concentration && <Badge variant="secondary">Concentration</Badge>}
      </div>

      <StatGrid>
        <Stat label="Casting Time" value={spell.casting_time} />
        <Stat label="Range" value={spell.range} />
        <Stat label="Duration" value={spell.duration} />
        <Stat label="Components" value={formatComponents(spell.components, spell.material)} />
        <Stat label="Attack Type" value={spell.attack_type} />
        <Stat label="Damage Type" value={spell.damage?.damage_type?.name} />
      </StatGrid>

      {spell.desc?.length > 0 && (
        <DetailSection title="Description">
          <DescriptionText desc={spell.desc} />
        </DetailSection>
      )}

      {spell.higher_level && spell.higher_level.length > 0 && (
        <DetailSection title="At Higher Levels">
          <DescriptionText desc={spell.higher_level} />
        </DetailSection>
      )}

      {slotLevels.length > 0 && (
        <DetailSection title="Damage by Slot Level">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Slot Level
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Damage
                  </th>
                </tr>
              </thead>
              <tbody>
                {slotLevels.map(([slot, damage]) => (
                  <tr key={slot} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{slot}</td>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">{damage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

      {spell.classes?.length > 0 && (
        <DetailSection title="Classes">
          <ReferenceBadges items={spell.classes} />
        </DetailSection>
      )}

      {spell.subclasses && spell.subclasses.length > 0 && (
        <DetailSection title="Subclasses">
          <ReferenceBadges items={spell.subclasses} />
        </DetailSection>
      )}
    </div>
  )
}
