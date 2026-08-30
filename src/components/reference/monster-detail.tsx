'use client'

import { Badge } from '@/components/ui/badge'
import { formatModifier, formatSenses, formatSpeed } from '@/lib/srd/format'
import { useMonster } from '@/lib/srd/hooks'
import type { SrdMonster } from '@/lib/srd/types'
import {
  DetailError,
  DetailLoading,
  DetailSection,
  NamedEntries,
  Stat,
  StatGrid,
} from './detail-parts'

const ABILITIES = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
] as const

/** `Dex +5, Wis +3` — the saves a 2024 stat block prints, in ability order. */
function formatSavingThrows(monster: SrdMonster): string | null {
  const saves = ABILITIES.filter(({ key }) => monster.savingThrows[key] !== undefined).map(
    ({ key, label }) => `${label} ${formatModifier(monster.savingThrows[key] as number)}`,
  )
  return saves.length > 0 ? saves.join(', ') : null
}

/** `Perception +6, Stealth +4` — only the skills the block prints a bonus for. */
function formatSkills(monster: SrdMonster): string | null {
  const skills = Object.entries(monster.skillBonuses)
    .filter(([, bonus]) => typeof bonus === 'number')
    .map(([skill, bonus]) => {
      const name = skill
        .replace(/_/g, ' ')
        .replace(/(^|\s)([a-z])/g, (_, l, c) => l + c.toUpperCase())
      return `${name} ${formatModifier(bonus as number)}`
    })
  return skills.length > 0 ? skills.join(', ') : null
}

export function MonsterDetail({ index }: { index: string }) {
  const { monster, isLoading, error } = useMonster(index)

  if (isLoading) return <DetailLoading label="monster" />
  if (error || !monster) return <DetailError label="monster" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>CR {monster.challengeRatingText}</Badge>
        <Badge variant="outline">{monster.type}</Badge>
        <Badge variant="secondary">{monster.size}</Badge>
      </div>

      <StatGrid>
        <Stat
          label="Armor Class"
          value={`${monster.armorClass}${monster.armorDetail ? ` (${monster.armorDetail})` : ''}`}
        />
        <Stat
          label="Hit Points"
          value={`${monster.hitPoints}${monster.hitDice ? ` (${monster.hitDice})` : ''}`}
        />
        <Stat label="Speed" value={formatSpeed(monster)} />
        <Stat label="Initiative" value={formatModifier(monster.initiativeBonus ?? 0)} />
        <Stat label="XP" value={monster.experiencePoints} />
        <Stat label="Proficiency Bonus" value={formatModifier(monster.proficiencyBonus)} />
        <Stat label="Alignment" value={monster.alignment} />
      </StatGrid>

      <DetailSection title="Ability Scores">
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map(({ key, label }) => (
            <div key={key} className="rounded-lg border bg-muted px-2 py-2 text-center">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium text-foreground">
                {monster.abilityScores[key]} ({formatModifier(monster.modifiers[key])})
              </dd>
            </div>
          ))}
        </dl>
      </DetailSection>

      <StatGrid>
        <Stat label="Saving Throws" value={formatSavingThrows(monster)} />
        <Stat label="Skills" value={formatSkills(monster)} />
        <Stat label="Vulnerabilities" value={monster.damageVulnerabilities} />
        <Stat label="Resistances" value={monster.damageResistances} />
        <Stat label="Damage Immunities" value={monster.damageImmunities} />
        <Stat label="Condition Immunities" value={monster.conditionImmunities} />
        <Stat label="Senses" value={formatSenses(monster)} />
        <Stat label="Languages" value={monster.languages} />
      </StatGrid>

      {monster.traits.length > 0 && (
        <DetailSection title="Traits">
          <NamedEntries entries={monster.traits} />
        </DetailSection>
      )}

      {monster.actions.length > 0 && (
        <DetailSection title="Actions">
          <NamedEntries entries={monster.actions} />
        </DetailSection>
      )}

      {monster.bonusActions.length > 0 && (
        <DetailSection title="Bonus Actions">
          <NamedEntries entries={monster.bonusActions} />
        </DetailSection>
      )}

      {monster.reactions.length > 0 && (
        <DetailSection title="Reactions">
          <NamedEntries entries={monster.reactions} />
        </DetailSection>
      )}

      {monster.legendaryActions.length > 0 && (
        <DetailSection title="Legendary Actions">
          <NamedEntries entries={monster.legendaryActions} />
        </DetailSection>
      )}
    </div>
  )
}
