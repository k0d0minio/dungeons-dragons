// The 262 SRD 5.2.1 magic items (`srd-2024-migration/long-tail-reference-data`).
//
// Sourced from dnd5eapi's `/api/2024/magic-items`, which does carry the full
// 5.2.1 set including the SRD renames.
import magicItemData from './data/magic-items.json'
import { collection } from './lookup'
import type { SrdMagicItem } from './types'

export const MAGIC_ITEMS = collection(magicItemData as SrdMagicItem[])
