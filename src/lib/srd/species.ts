// The nine SRD 5.2.1 species, local (`srd-2024-migration/srd-data-layer`).
//
// 2024 species grant traits and nothing else — no ability score increases; those
// moved to the background. Half-elf and half-orc are gone from the SRD entirely,
// so an index that used to name one resolves to `null` here.
import data from './data/species.json'
import { collection } from './lookup'
import type { SrdSpecies } from './types'

export const SPECIES = collection(data as SrdSpecies[])

/**
 * The lineage with this index within a species — an Elven Lineage, a Giant
 * Ancestry — or `null` when the species offers none by that name.
 *
 * Lineages are nested rather than a collection of their own because a lineage
 * index is only meaningful under its species: "Drow" answers a question the
 * player was asked after choosing Elf.
 */
export function speciesLineage(speciesIndex: string, lineageIndex: string) {
  return (
    SPECIES.get(speciesIndex)?.lineages.find((lineage) => lineage.index === lineageIndex) ?? null
  )
}

/**
 * Every trait a character of this species and lineage has at `level`.
 *
 * Species traits are all level 1; lineage traits are not — a Drow's Faerie Fire
 * arrives at character level 3 — so the level filter is what keeps a level 1
 * sheet from listing a trait its owner cannot use yet.
 */
export function speciesTraitsAtLevel(
  speciesIndex: string,
  lineageIndex: string | null,
  level: number,
) {
  const species = SPECIES.get(speciesIndex)
  if (!species) return []
  const lineage = lineageIndex ? speciesLineage(speciesIndex, lineageIndex) : null
  return [...species.traits, ...(lineage?.traits ?? [])].filter(
    (trait) => (trait.level ?? 1) <= level,
  )
}
