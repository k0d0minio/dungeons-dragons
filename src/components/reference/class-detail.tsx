'use client'

import { Badge } from '@/components/ui/badge'
import { ABILITIES } from '@/lib/characters/schema'
import { CLASSES, subclassesForClass } from '@/lib/srd/classes'
import {
  DescriptionText,
  DetailError,
  DetailSection,
  NamedEntries,
  ReferenceBadges,
  Stat,
  StatGrid,
} from './detail-parts'

const ABILITY_LABELS = new Map(ABILITIES.map((ability) => [ability.key, ability.label]))

/**
 * Read straight from the local SRD data rather than fetched, so there is no
 * loading state: the twelve classes are already in this bundle for the
 * character sheet (`src/lib/characters/rules.ts`), and fetching them again over
 * HTTP would ship the same JSON twice.
 */
export function ClassDetail({ index }: { index: string }) {
  const characterClass = CLASSES.get(index)
  if (!characterClass) return <DetailError label="class" />

  const subclasses = subclassesForClass(index)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>Hit Die d{characterClass.hitDie}</Badge>
        <Badge variant="outline">{characterClass.primaryAbility}</Badge>
      </div>

      <StatGrid>
        <Stat label="Hit Die" value={`d${characterClass.hitDie}`} />
        <Stat label="Primary Ability" value={characterClass.primaryAbility} />
        <Stat
          label="Saving Throws"
          value={characterClass.savingThrows
            .map((ability) => ABILITY_LABELS.get(ability) ?? ability)
            .join(', ')}
        />
        <Stat label="Subclass At" value={`Level ${characterClass.subclassLevel}`} />
      </StatGrid>

      {characterClass.proficiencies.length > 0 && (
        <DetailSection title="Proficiencies">
          <ReferenceBadges items={characterClass.proficiencies} />
        </DetailSection>
      )}

      {characterClass.skillChoices.map((choice, i) => (
        <DetailSection key={i} title={`Skills (choose ${choice.choose})`}>
          {choice.description ? (
            <DescriptionText desc={choice.description} />
          ) : (
            <ReferenceBadges
              items={choice.from.map((skill) => ({
                index: skill,
                name: skill.replace(/-/g, ' '),
              }))}
            />
          )}
        </DetailSection>
      ))}

      {characterClass.startingEquipment.length > 0 && (
        <DetailSection title="Starting Equipment">
          <DescriptionText desc={characterClass.startingEquipment} />
        </DetailSection>
      )}

      {characterClass.features.length > 0 && (
        <DetailSection title="Features">
          <NamedEntries
            entries={characterClass.features.map((feature) => ({
              name: `${feature.name} (Level ${feature.level})`,
              description: feature.description,
            }))}
          />
        </DetailSection>
      )}

      {/* The SRD publishes exactly one subclass per class; the others are not
          CC-BY and never enter this data. */}
      {subclasses.length > 0 && (
        <DetailSection title="Subclass">
          <NamedEntries
            entries={subclasses.map((subclass) => ({
              name: subclass.summary ? `${subclass.name} — ${subclass.summary}` : subclass.name,
              description: subclass.description,
            }))}
          />
        </DetailSection>
      )}
    </div>
  )
}
