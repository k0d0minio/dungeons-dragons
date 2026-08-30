// The 182 SRD 5.2.1 equipment rows (`srd-2024-migration/long-tail-reference-data`).
//
// Weapons appear here too, with the same nine corrections `weapons.json`
// carries, so the Equipment tab and the Weapons table never price a Dart
// differently. The weapon-specific columns — damage, properties, mastery —
// live on `WEAPONS` alone; look an index up there rather than restating them.
//
// Rows carry the categories they belong to (`['armor', 'medium-armor']`), so
// grouping is a filter rather than a second collection to keep in step.
import equipmentData from './data/equipment.json'
import { collection } from './lookup'
import type { SrdEquipment } from './types'

export const EQUIPMENT = collection(equipmentData as SrdEquipment[])
