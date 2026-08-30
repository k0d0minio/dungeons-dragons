'use client'

import { ClassDetail } from './class-detail'
import { EquipmentDetail } from './equipment-detail'
import { MagicItemDetail } from './magic-item-detail'
import { MonsterDetail } from './monster-detail'
import { SpeciesDetail } from './species-detail'
import { SpellDetail } from './spell-detail'

// 2024 says species, not race (D32) — including in the value a selection
// carries, so nothing in the app has to translate between the two words.
export type ReferenceType = 'spell' | 'class' | 'species' | 'equipment' | 'monster' | 'magic-item'

export interface ReferenceSelection {
  type: ReferenceType
  index: string
  name: string
}

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  spell: 'Spell',
  class: 'Class',
  species: 'Species',
  equipment: 'Equipment',
  monster: 'Monster',
  'magic-item': 'Magic Item',
}

/**
 * The rendered detail for one reference item, without any container.
 *
 * It lives apart from `ReferenceDetailSheet` because two surfaces now show the
 * same body: that sheet, opened from a list, and the DND-029 lookup overlay,
 * which shows results and detail inside a single sheet rather than stacking a
 * second one on top.
 */
export function ReferenceDetailBody({ selection }: { selection: ReferenceSelection }) {
  switch (selection.type) {
    case 'spell':
      return <SpellDetail index={selection.index} />
    case 'class':
      return <ClassDetail index={selection.index} />
    case 'species':
      return <SpeciesDetail index={selection.index} />
    case 'equipment':
      return <EquipmentDetail index={selection.index} />
    case 'monster':
      return <MonsterDetail index={selection.index} />
    case 'magic-item':
      return <MagicItemDetail index={selection.index} />
  }
}
