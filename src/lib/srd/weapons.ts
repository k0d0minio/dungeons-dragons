// The 38 SRD 5.2.1 weapons and the property tables they reference (`srd-2024-migration/srd-data-layer`).
//
// Weapon Mastery is the 2024 subsystem the sheet has no equivalent of yet:
// every weapon carries exactly one mastery property, and a martial class
// unlocks the use of some number of them. The data says which property a weapon
// has; whether a given character may use it is a class question, answered in
// `src/lib/characters/`.
import masteryData from './data/weapon-masteries.json'
import propertyData from './data/weapon-properties.json'
import weaponData from './data/weapons.json'
import { collection } from './lookup'
import type { SrdWeapon, SrdWeaponMastery, SrdWeaponProperty } from './types'

export const WEAPONS = collection(weaponData as SrdWeapon[])
export const WEAPON_MASTERIES = collection(masteryData as SrdWeaponMastery[])
export const WEAPON_PROPERTIES = collection(propertyData as SrdWeaponProperty[])

/** The weapons in one of the SRD's four table sections. */
export function weaponsByCategory(
  category: SrdWeapon['category'],
  kind: SrdWeapon['kind'],
): SrdWeapon[] {
  return WEAPONS.all.filter((weapon) => weapon.category === category && weapon.kind === kind)
}

/** The mastery property a weapon carries, resolved to its SRD text. */
export function masteryFor(weaponIndex: string): SrdWeaponMastery | null {
  const weapon = WEAPONS.get(weaponIndex)
  return weapon ? WEAPON_MASTERIES.get(weapon.mastery) : null
}

/** A weapon's properties, resolved to their SRD text, in table order. */
export function propertiesFor(weaponIndex: string): SrdWeaponProperty[] {
  const weapon = WEAPONS.get(weaponIndex)
  if (!weapon) return []
  return weapon.properties
    .map((index) => WEAPON_PROPERTIES.get(index))
    .filter((property): property is SrdWeaponProperty => property !== null)
}

/** True when the weapon can be thrown — the property that gives it a second range. */
export function isThrown(weaponIndex: string): boolean {
  return WEAPONS.get(weaponIndex)?.properties.includes('thrown') ?? false
}
