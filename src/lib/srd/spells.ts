// The 339 SRD 5.2.1 spells (`srd-2024-migration/long-tail-reference-data`).
//
// Sourced from Open5e's `srd-2024` document rather than dnd5eapi, whose 2024
// namespace has no spells endpoint at all — see the generator's header.
import spellData from './data/spells.json'
import { collection } from './lookup'
import type { SrdSpell } from './types'

export const SPELLS = collection(spellData as SrdSpell[])

/** The spells on a class's list, in SRD order. Empty for a non-caster. */
export function spellsForClass(classIndex: string): SrdSpell[] {
  return SPELLS.all.filter((spell) => spell.classes.includes(classIndex))
}
