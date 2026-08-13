'use client'

import { Badge } from "@/components/ui/badge"
import { useClass, type ApiReference } from '@/lib/dnd-api/swr-hooks'
import {
  DetailError,
  DetailLoading,
  DetailSection,
  NamedEntries,
  ReferenceBadges,
  Stat,
  StatGrid,
} from './detail-parts'

interface Choice {
  choose: number
  from?: {
    options?: Array<{ item?: ApiReference }>
  }
}

/** Choice option sets vary in shape across the API; keep only the ones we can name. */
function namedOptions(choice: Choice): ApiReference[] {
  return (choice.from?.options ?? [])
    .map((option) => option.item)
    .filter((item): item is ApiReference => Boolean(item?.name))
}

function ChoiceList({ choices, suffix }: { choices?: Choice[]; suffix: string }) {
  const usable = (choices ?? []).filter((choice) => namedOptions(choice).length > 0)
  if (usable.length === 0) return null

  return (
    <div className="space-y-3">
      {usable.map((choice, i) => (
        <div key={i} className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Choose {choice.choose} {suffix}
          </p>
          <ReferenceBadges items={namedOptions(choice)} />
        </div>
      ))}
    </div>
  )
}

export function ClassDetail({ index }: { index: string }) {
  const { class: cls, isLoading, error } = useClass(index)

  if (isLoading) return <DetailLoading label="class" />
  if (error || !cls) return <DetailError label="class" />

  const startingEquipment = (cls.starting_equipment ?? []).filter((entry) => entry?.equipment?.name)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>Hit Die d{cls.hit_die}</Badge>
        {cls.spellcasting && <Badge variant="secondary">Spellcaster</Badge>}
      </div>

      <StatGrid>
        <Stat label="Hit Die" value={`d${cls.hit_die}`} />
        <Stat
          label="Saving Throws"
          value={cls.saving_throws?.map((save) => save.name).join(', ')}
        />
        <Stat
          label="Spellcasting Ability"
          value={cls.spellcasting?.spellcasting_ability?.name ?? cls.spellcasting_ability?.name}
        />
      </StatGrid>

      {cls.proficiencies?.length > 0 && (
        <DetailSection title="Proficiencies">
          <ReferenceBadges items={cls.proficiencies} />
        </DetailSection>
      )}

      {cls.proficiency_choices?.length > 0 && (
        <DetailSection title="Proficiency Choices">
          <ChoiceList choices={cls.proficiency_choices} suffix="of the following" />
        </DetailSection>
      )}

      {startingEquipment.length > 0 && (
        <DetailSection title="Starting Equipment">
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {startingEquipment.map((entry) => (
              <li key={entry.equipment.index}>
                {entry.equipment.name}
                {entry.quantity > 1 && ` ×${entry.quantity}`}
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {cls.starting_equipment_options?.length > 0 && (
        <DetailSection title="Equipment Choices">
          <ChoiceList choices={cls.starting_equipment_options} suffix="of the following" />
        </DetailSection>
      )}

      {cls.spellcasting?.info?.length ? (
        <DetailSection title="Spellcasting">
          <NamedEntries entries={cls.spellcasting.info} />
        </DetailSection>
      ) : null}

      {cls.multi_classing?.prerequisites?.length ? (
        <DetailSection title="Multiclassing Prerequisites">
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {cls.multi_classing.prerequisites.map((prerequisite) => (
              <li key={prerequisite.ability_score.index}>
                {prerequisite.ability_score.name} {prerequisite.minimum_score}+
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}

      {cls.multi_classing?.proficiencies_gained?.length ? (
        <DetailSection title="Multiclassing Proficiencies">
          <ReferenceBadges items={cls.multi_classing.proficiencies_gained} />
        </DetailSection>
      ) : null}

      {cls.subclasses?.length > 0 && (
        <DetailSection title="Subclasses">
          <ReferenceBadges items={cls.subclasses} />
        </DetailSection>
      )}
    </div>
  )
}
