'use client'

import { Badge } from "@/components/ui/badge"
import { useMonster, type Monster } from '@/lib/dnd-api/swr-hooks'
import {
  DetailError,
  DetailLoading,
  DetailSection,
  NamedEntries,
  ReferenceBadges,
  Stat,
  StatGrid,
  StringBadges,
} from './detail-parts'

const ABILITIES = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
] as const

export function abilityModifier(score: number): string {
  const modifier = Math.floor((score - 10) / 2)
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}

/** The API reports fractional CRs as decimals; players read them as fractions. */
export function formatChallengeRating(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return `${cr}`
}

function formatArmorClass(armorClass?: Monster['armor_class']): string | null {
  if (!armorClass?.length) return null
  return armorClass
    .map((entry) => `${entry.value}${entry.type ? ` (${entry.type})` : ''}`)
    .join(', ')
}

function formatSpeed(speed?: Monster['speed']): string | null {
  if (!speed) return null
  const parts = Object.entries(speed)
    .filter(([, value]) => Boolean(value))
    .map(([mode, value]) => `${mode} ${value}`)
  return parts.length > 0 ? parts.join(', ') : null
}

function formatSenses(senses?: Monster['senses']): string | null {
  if (!senses) return null
  const parts = Object.entries(senses)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([sense, value]) =>
      sense === 'passive_perception' ? `passive Perception ${value}` : `${sense} ${value}`
    )
  return parts.length > 0 ? parts.join(', ') : null
}

export function MonsterDetail({ index }: { index: string }) {
  const { monster, isLoading, error } = useMonster(index)

  if (isLoading) return <DetailLoading label="monster" />
  if (error || !monster) return <DetailError label="monster" />

  const proficiencies = (monster.proficiencies ?? []).filter((entry) => entry?.proficiency?.name)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {monster.challenge_rating !== undefined && (
          <Badge>CR {formatChallengeRating(monster.challenge_rating)}</Badge>
        )}
        {monster.type && <Badge variant="outline" className="capitalize">{monster.type}</Badge>}
        {monster.size && <Badge variant="secondary">{monster.size}</Badge>}
      </div>

      <StatGrid>
        <Stat label="Armor Class" value={formatArmorClass(monster.armor_class)} />
        <Stat
          label="Hit Points"
          value={
            monster.hit_points !== undefined
              ? `${monster.hit_points}${monster.hit_dice ? ` (${monster.hit_dice})` : ''}`
              : null
          }
        />
        <Stat label="Speed" value={formatSpeed(monster.speed)} />
        <Stat label="XP" value={monster.xp} />
        <Stat label="Alignment" value={monster.alignment} />
        <Stat label="Subtype" value={monster.subtype} />
      </StatGrid>

      <DetailSection title="Ability Scores">
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map(({ key, label }) => (
            <div
              key={key}
              className="rounded-lg border bg-gray-50 px-2 py-2 text-center dark:bg-gray-800/50"
            >
              <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {monster[key]} ({abilityModifier(monster[key])})
              </dd>
            </div>
          ))}
        </dl>
      </DetailSection>

      {proficiencies.length > 0 && (
        <DetailSection title="Saving Throws & Skills">
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {proficiencies.map((entry) => (
              <li key={entry.proficiency.index}>
                {entry.proficiency.name} +{entry.value}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {monster.damage_vulnerabilities?.length > 0 && (
        <DetailSection title="Damage Vulnerabilities">
          <StringBadges items={monster.damage_vulnerabilities} />
        </DetailSection>
      )}

      {monster.damage_resistances?.length > 0 && (
        <DetailSection title="Damage Resistances">
          <StringBadges items={monster.damage_resistances} />
        </DetailSection>
      )}

      {monster.damage_immunities?.length > 0 && (
        <DetailSection title="Damage Immunities">
          <StringBadges items={monster.damage_immunities} />
        </DetailSection>
      )}

      {monster.condition_immunities?.length > 0 && (
        <DetailSection title="Condition Immunities">
          <ReferenceBadges items={monster.condition_immunities} />
        </DetailSection>
      )}

      <StatGrid>
        <Stat label="Senses" value={formatSenses(monster.senses)} />
        <Stat label="Languages" value={monster.languages} />
      </StatGrid>

      {monster.special_abilities?.length ? (
        <DetailSection title="Special Abilities">
          <NamedEntries entries={monster.special_abilities} />
        </DetailSection>
      ) : null}

      {monster.actions?.length ? (
        <DetailSection title="Actions">
          <div className="space-y-3">
            {monster.actions.map((action) => (
              <div key={action.name} className="rounded-lg border p-3">
                <h4 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {action.name}
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {action.desc}
                </p>
                {(action.attack_bonus !== undefined || action.damage?.length) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {action.attack_bonus !== undefined && (
                      <Badge variant="outline">To hit +{action.attack_bonus}</Badge>
                    )}
                    {action.damage?.map((damage, i) => (
                      <Badge key={i} variant="secondary">
                        {damage.damage_dice} {damage.damage_type?.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      ) : null}

      {monster.legendary_actions?.length ? (
        <DetailSection title="Legendary Actions">
          <NamedEntries entries={monster.legendary_actions} />
        </DetailSection>
      ) : null}
    </div>
  )
}
