'use client'

import { Badge } from '@/components/ui/badge'
import { formatComponents, formatDuration, formatSpellLevel } from '@/lib/srd/format'
import { useSpell } from '@/lib/srd/hooks'
import {
  DescriptionText,
  DetailError,
  DetailLoading,
  DetailSection,
  Stat,
  StatGrid,
  StringBadges,
} from './detail-parts'

/** Class and school indexes are slugs; the SRD prints them capitalised. */
function titleCase(index: string): string {
  return index.replace(/(^|[\s-])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase())
}

export function SpellDetail({ index }: { index: string }) {
  const { spell, isLoading, error } = useSpell(index)

  if (isLoading) return <DetailLoading label="spell" />
  if (error || !spell) return <DetailError label="spell" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>{formatSpellLevel(spell.level)}</Badge>
        <Badge variant="outline">{titleCase(spell.school)}</Badge>
        {spell.ritual && <Badge variant="secondary">Ritual</Badge>}
        {spell.concentration && <Badge variant="secondary">Concentration</Badge>}
      </div>

      <StatGrid>
        <Stat label="Casting Time" value={spell.castingTime} />
        <Stat label="Range" value={spell.range} />
        <Stat label="Duration" value={formatDuration(spell)} />
        <Stat label="Components" value={formatComponents(spell)} />
        <Stat
          label="Save"
          value={spell.savingThrow ? `${titleCase(spell.savingThrow)} saving throw` : null}
        />
        <Stat label="Attack" value={spell.attackRoll ? 'Spell attack roll' : null} />
      </StatGrid>

      {/* A Reaction spell is only usable when its trigger fires, so the trigger
          belongs beside the casting time rather than buried in the prose. */}
      {spell.reactionCondition && (
        <DetailSection title="Trigger">
          <DescriptionText desc={spell.reactionCondition} />
        </DetailSection>
      )}

      <DetailSection title="Description">
        <DescriptionText desc={spell.description} />
      </DetailSection>

      {spell.higherLevel && (
        <DetailSection title="Using a Higher-Level Spell Slot">
          <DescriptionText desc={spell.higherLevel} />
        </DetailSection>
      )}

      {spell.higherLevelDamage.length > 0 && (
        <DetailSection title="Damage by Slot Level">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Slot Level
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Damage
                  </th>
                </tr>
              </thead>
              <tbody>
                {spell.higherLevelDamage.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-foreground">{row.label}</td>
                    <td className="py-2 font-medium text-foreground">{row.damage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailSection>
      )}

      {spell.damageTypes.length > 0 && (
        <DetailSection title="Damage Types">
          <StringBadges items={spell.damageTypes} />
        </DetailSection>
      )}

      {spell.classes.length > 0 && (
        <DetailSection title="Classes">
          <StringBadges items={spell.classes} />
        </DetailSection>
      )}
    </div>
  )
}
