// The 331 SRD 5.2.1 monsters (`srd-2024-migration/long-tail-reference-data`).
//
// Sourced from Open5e's `srd-2024` document: dnd5eapi's 2024 namespace holds
// three of them. These are the 2025 Monster Manual SRD stat blocks, so a Goblin
// Warrior is Fey and its attacks read "Melee Attack Roll: +4", not "+4 to hit".
import monsterData from './data/monsters.json'
import { collection } from './lookup'
import type { SrdMonster } from './types'

export const MONSTERS = collection(monsterData as SrdMonster[])
