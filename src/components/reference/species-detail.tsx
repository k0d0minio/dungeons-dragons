'use client'

import { Badge } from '@/components/ui/badge'
import { SPECIES } from '@/lib/srd/species'
import { DetailError, DetailSection, NamedEntries, Stat, StatGrid } from './detail-parts'

/**
 * A 2024 species. Read straight from the local SRD data for the same reason
 * `ClassDetail` is: the nine species are small, creation-critical, and already
 * needed synchronously by the sheet.
 *
 * 2024 species grant traits and nothing else — the ability score increases that
 * SRD 5.1 put here moved to the background (D32), so there is no Ability
 * Bonuses row any more, and no Age or Alignment prose: the SRD stopped printing
 * them per species.
 */
export function SpeciesDetail({ index }: { index: string }) {
  const species = SPECIES.get(index)
  if (!species) return <DetailError label="species" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge>{species.size}</Badge>
        <Badge variant="outline">Speed {species.speed} ft.</Badge>
        <Badge variant="secondary">{species.creatureType}</Badge>
      </div>

      <StatGrid>
        <Stat label="Creature Type" value={species.creatureType} />
        <Stat label="Size" value={species.size} />
        <Stat label="Speed" value={`${species.speed} ft.`} />
      </StatGrid>

      {species.traits.length > 0 && (
        <DetailSection title="Traits">
          <NamedEntries
            entries={species.traits.map((trait) => ({
              name: trait.level ? `${trait.name} (Level ${trait.level})` : trait.name,
              description: trait.description,
            }))}
          />
        </DetailSection>
      )}

      {/* "Lineages" is the 2024 word (D32) for the slot SRD 5.1 called a
          subrace. Each carries its own traits, some level-gated. */}
      {species.lineages.map((lineage) => (
        <DetailSection key={lineage.index} title={lineage.name}>
          <NamedEntries
            entries={lineage.traits.map((trait) => ({
              name: trait.level ? `${trait.name} (Level ${trait.level})` : trait.name,
              description: trait.description,
            }))}
          />
        </DetailSection>
      ))}
    </div>
  )
}
