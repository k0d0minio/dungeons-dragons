'use client'

import { Badge } from '@/components/ui/badge'
import { useRace } from '@/lib/dnd-api/swr-hooks'
import {
  DescriptionText,
  DetailError,
  DetailLoading,
  DetailSection,
  ReferenceBadges,
  Stat,
  StatGrid,
} from './detail-parts'

export function RaceDetail({ index }: { index: string }) {
  const { race, isLoading, error } = useRace(index)

  if (isLoading) return <DetailLoading label="species" />
  if (error || !race) return <DetailError label="species" />

  const abilityBonuses = (race.ability_bonuses ?? []).filter((bonus) => bonus?.ability_score?.name)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {race.size && <Badge>{race.size}</Badge>}
        {race.speed !== undefined && <Badge variant="outline">Speed {race.speed} ft.</Badge>}
      </div>

      <StatGrid>
        <Stat label="Speed" value={race.speed !== undefined ? `${race.speed} ft.` : null} />
        <Stat label="Size" value={race.size} />
        <Stat
          label="Ability Bonuses"
          value={abilityBonuses
            .map((bonus) => `${bonus.ability_score.name} +${bonus.bonus}`)
            .join(', ')}
        />
      </StatGrid>

      {race.size_description && (
        <DetailSection title="Size">
          <DescriptionText desc={race.size_description} />
        </DetailSection>
      )}

      {race.age && (
        <DetailSection title="Age">
          <DescriptionText desc={race.age} />
        </DetailSection>
      )}

      {race.alignment && (
        <DetailSection title="Alignment">
          <DescriptionText desc={race.alignment} />
        </DetailSection>
      )}

      {race.languages?.length > 0 && (
        <DetailSection title="Languages">
          <ReferenceBadges items={race.languages} />
          {race.language_desc && <DescriptionText desc={race.language_desc} />}
        </DetailSection>
      )}

      {race.starting_proficiencies?.length > 0 && (
        <DetailSection title="Starting Proficiencies">
          <ReferenceBadges items={race.starting_proficiencies} />
        </DetailSection>
      )}

      {race.starting_proficiency_options?.from?.options?.length ? (
        <DetailSection
          title={`Proficiency Options (choose ${race.starting_proficiency_options.choose})`}
        >
          <ReferenceBadges
            items={race.starting_proficiency_options.from.options
              .map((option) => option.item)
              .filter(Boolean)}
          />
        </DetailSection>
      ) : null}

      {race.traits?.length > 0 && (
        <DetailSection title="Traits">
          <ReferenceBadges items={race.traits} />
        </DetailSection>
      )}

      {/* "Lineages" is the 2024 word (D32) for the slot SRD 5.1 calls a subrace.
          Upstream's field name stays as it is; the heading is what a player
          reads, and it has to match the "Species" this detail sits under. */}
      {race.subraces?.length > 0 && (
        <DetailSection title="Lineages">
          <ReferenceBadges items={race.subraces} />
        </DetailSection>
      )}
    </div>
  )
}
