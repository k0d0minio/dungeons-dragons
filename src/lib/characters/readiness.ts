// The three "ready a character" rules (`first-table/creation-readiness`),
// written once and called from two places: the wizard's create path
// (`POST /api/characters`) and the DM's one-tap fixes on the profile page
// (`first-table/dm-character-profile`).
//
// What the walkthrough of production found on 2026-09-05 was seven level-1
// characters, every one of them with no weapon equipped, five of six casters
// with no spell slots, and nobody with a Weapon Mastery choice. The wizard had
// put the kit in the backpack and stopped — armour worn, weapons not — and the
// sheet waited for taps no beginner has a reason to make. These functions are
// the rest of that job: given what a character carries and what class they
// are, say which weapons to ready, which slots to seed and which masteries to
// pick. They take items and a class and return *what to change*; they know
// nothing about the wizard, the row or the request that carries the answer,
// which is what lets the DM's fix and the wizard's create call the same code.
import type { SpellSlotState } from '@/lib/db/schema'
import { EQUIPMENT } from '@/lib/srd/equipment'
import type { SrdWeapon } from '@/lib/srd/types'
import { WEAPONS, isThrown, masteryFor } from '@/lib/srd/weapons'

import { standardSpellSlots, weaponMasteryCount } from './rules'
import { recommendedAbilityAssignment } from './wizard'

/**
 * The two columns of an item row these rules read. `StartingItemRow` (the
 * wizard's, before insert) and `CharacterItem` (the stored row) both satisfy
 * it, which is the point.
 */
export interface ReadinessItem {
  equipmentIndex: string | null
  equipped: boolean
}

/**
 * What the rules need to know about the character. Scores are optional: the
 * wizard has them, and so does a stored row, but the rule falls back to the
 * class's own ability priority when a caller has neither.
 */
export interface ReadinessCharacter {
  classIndex: string
  strength?: number
  dexterity?: number
}

/** True for an SRD shield — the thing a two-handed weapon cannot share hands with. */
function isShieldIndex(index: string): boolean {
  return EQUIPMENT.get(index)?.categories.includes('shields') ?? false
}

/** The distinct SRD weapons a character carries, in inventory order. */
function carriedWeapons(items: readonly ReadinessItem[]): SrdWeapon[] {
  const seen = new Set<string>()
  const weapons: SrdWeapon[] = []

  for (const item of items) {
    if (!item.equipmentIndex || seen.has(item.equipmentIndex)) continue
    const weapon = WEAPONS.get(item.equipmentIndex)
    if (!weapon) continue
    seen.add(item.equipmentIndex)
    weapons.push(weapon)
  }

  return weapons
}

/**
 * Which of Strength and Dexterity this character swings with.
 *
 * Real scores win when the caller has them — a fighter whose player put the
 * 15 in Dexterity is a Dexterity fighter whatever the class guide recommends.
 * A tie, or no scores at all, falls back to the class's ability priority from
 * the wizard's own guide, so the wizard and the DM's fix agree on the same
 * character.
 */
function preferredAbility(character: ReadinessCharacter): 'strength' | 'dexterity' {
  const { strength, dexterity } = character

  if (typeof strength === 'number' && typeof dexterity === 'number' && strength !== dexterity) {
    return dexterity > strength ? 'dexterity' : 'strength'
  }

  const priority = recommendedAbilityAssignment(character.classIndex)
  const first = priority.find((key) => key === 'strength' || key === 'dexterity')
  return first === 'dexterity' ? 'dexterity' : 'strength'
}

/** The average of a damage expression like `2d6`, for ranking kit weapons. */
function averageDamage(weapon: SrdWeapon): number {
  const match = /^(\d+)d(\d+)$/.exec(weapon.damage?.dice ?? '')
  if (!match) return 0
  const [, count, sides] = match
  return (Number(count) * (Number(sides) + 1)) / 2
}

/**
 * Whether a melee weapon uses the ability this character is best at. Every
 * ranged weapon uses Dexterity and every finesse weapon takes the better of
 * the two (`weaponAttack`), so the only weapon that can miss the preferred
 * ability is a plain melee one in a Dexterity character's hands.
 */
function fitsAbility(weapon: SrdWeapon, ability: 'strength' | 'dexterity'): boolean {
  if (weapon.kind === 'ranged' || ability === 'strength') return true
  return weapon.properties.includes('finesse')
}

/**
 * The best of some weapons: the ones that use the right ability first, then
 * the bigger die, then the SRD's own table order — so a tie is broken the same
 * way every time rather than by whatever order the backpack happened to be
 * packed in.
 */
function best(weapons: readonly SrdWeapon[], ability: 'strength' | 'dexterity'): SrdWeapon | null {
  if (weapons.length === 0) return null

  const order = WEAPONS.indexes
  return [...weapons].sort((a, b) => {
    const fit = Number(fitsAbility(b, ability)) - Number(fitsAbility(a, ability))
    if (fit !== 0) return fit
    const damage = averageDamage(b) - averageDamage(a)
    if (damage !== 0) return damage
    return order.indexOf(a.index) - order.indexOf(b.index)
  })[0]
}

/**
 * Which weapons to ready from what the character carries: one melee weapon,
 * plus one ranged weapon where the kit has one.
 *
 * The melee pick prefers the weapon the character's ability favours — a
 * Strength fighter readies the greatsword over the scimitar, a Dexterity
 * rogue the shortsword over the spear — and, within that, the bigger die.
 *
 * **A two-handed weapon and a shield are not a legal pair**, and this is the
 * one place that is decided: the shield stays where the kit put it (worn, for
 * the cleric, druid and paladin), and a two-handed weapon is simply not a
 * candidate while one is equipped. The recommended paladin walks in with the
 * soldier's shortbow and never readies it, which is the rule, not a gap.
 *
 * "Ranged" is answered generously: a kit with no bow (a paladin, a barbarian,
 * a monk) readies a thrown weapon instead — the javelins, the handaxes, the
 * spear — because "what do I roll from over here" is a question a level-1
 * table asks on its first night, and the thrown weapon is the honest answer.
 *
 * Returns the weapon indexes to mark `equipped`, in the order they were
 * chosen. Empty when the character carries no SRD weapon at all — a wizard
 * whose only "weapon" is the unindexed Arcane Focus, or a fighter who took the
 * coin.
 */
export function weaponsToReady(
  items: readonly ReadinessItem[],
  character: ReadinessCharacter,
): string[] {
  const ability = preferredAbility(character)
  const shielded = items.some(
    (item) => item.equipped && item.equipmentIndex !== null && isShieldIndex(item.equipmentIndex),
  )

  const legal = carriedWeapons(items).filter(
    (weapon) => !(shielded && weapon.properties.includes('two-handed')),
  )

  const melee = best(
    legal.filter((weapon) => weapon.kind === 'melee'),
    ability,
  )
  const ranged =
    best(
      legal.filter((weapon) => weapon.kind === 'ranged'),
      ability,
    ) ??
    best(
      legal.filter(
        (weapon) => weapon.kind === 'melee' && isThrown(weapon.index) && weapon !== melee,
      ),
      ability,
    )

  return [melee, ranged]
    .filter((weapon): weapon is SrdWeapon => weapon !== null)
    .map((weapon) => weapon.index)
}

/**
 * The spell slots a fresh character of this class and level starts with —
 * the standard table, all unspent — or `{}` for a class that casts nothing.
 *
 * Every level-1 caster gets a row here, paladin and ranger included (2024:
 * half casters cast from 1st), and the warlock gets pact slots as its own
 * table gives them. The sheet used to offer these from a button on the
 * Spells segment; that button stays for characters made before this shipped
 * and for a DM's ruling, but a new character never needs it.
 */
export function startingSpellSlots(classIndex: string, level = 1): SpellSlotState {
  return standardSpellSlots(classIndex, level)
}

/**
 * Which weapons this character has Weapon Mastery with, chosen from the kit:
 * up to `weaponMasteryCount` of the weapons they carry that have a mastery
 * property (every SRD weapon does), readied weapons first, then whatever else
 * is equipped, then the rest of the backpack in order.
 *
 * `null` for a class without the feature, and `null` rather than `[]` when a
 * mastery class carries nothing to master — the column is nullable and
 * `normaliseOriginSelections` treats an empty list the same way.
 *
 * Chosen even while the `weaponMastery` gate hides it
 * (`first-table/weapon-mastery-gate`): the choice should already exist when
 * the gate opens, so what a player sees then is a finished choice rather than
 * an empty picker.
 */
export function startingMasteries(
  items: readonly ReadinessItem[],
  character: ReadinessCharacter & { level: number },
): string[] | null {
  const allowance = weaponMasteryCount(character.classIndex, character.level)
  if (allowance === null) return null

  const readied = weaponsToReady(items, character)
  const equipped = items
    .filter((item) => item.equipped && item.equipmentIndex !== null)
    .map((item) => item.equipmentIndex as string)
  const carried = carriedWeapons(items).map((weapon) => weapon.index)

  const ordered = Array.from(new Set([...readied, ...equipped, ...carried])).filter(
    (index) => WEAPONS.has(index) && masteryFor(index) !== null,
  )

  const chosen = ordered.slice(0, allowance)
  return chosen.length > 0 ? chosen : null
}

/** True when any equipped item is a weapon the attack rules can read. */
export function hasReadiedWeapon(items: readonly ReadinessItem[]): boolean {
  return items.some(
    (item) => item.equipped && item.equipmentIndex !== null && WEAPONS.has(item.equipmentIndex),
  )
}

/** The unequipped SRD weapons a character is carrying, by name, in inventory order. */
export function packedWeaponNames(
  items: readonly (ReadinessItem & { customName?: string | null })[],
): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  for (const item of items) {
    if (item.equipped || !item.equipmentIndex) continue
    const weapon = WEAPONS.get(item.equipmentIndex)
    if (!weapon || seen.has(weapon.index)) continue
    seen.add(weapon.index)
    names.push(item.customName ?? weapon.name)
  }

  return names
}

/** One line of the DM's readiness checklist: whether it applies, and whether it is done. */
export interface ReadinessLine {
  /** False when the rule has nothing to say — a non-caster's slots, a wizard's masteries. */
  applies: boolean
  ready: boolean
}

/** The checklist the DM's profile page reads, with the fix beside each line. */
export interface CharacterReadiness {
  weapon: ReadinessLine & {
    /** The weapon indexes a fix would mark equipped — empty when nothing is carried. */
    ready: boolean
    fix: string[]
  }
  spellSlots: ReadinessLine & { fix: SpellSlotState }
  masteries: ReadinessLine & { fix: string[] | null }
  skills: ReadinessLine
}

/**
 * The tutorial-night checklist for one character, each line a fact and each
 * fix the output of the rule above it — so the profile page never re-derives
 * what these functions decide.
 */
export function characterReadiness(
  character: ReadinessCharacter & {
    level: number
    spellSlots: SpellSlotState
    masteredWeaponIndexes: readonly string[] | null
    skillProficiencies: readonly string[]
  },
  items: readonly ReadinessItem[],
): CharacterReadiness {
  const weaponFix = weaponsToReady(items, character)
  const slotFix = startingSpellSlots(character.classIndex, character.level)
  const masteryFix = startingMasteries(items, character)

  return {
    weapon: {
      applies: weaponFix.length > 0 || hasReadiedWeapon(items),
      ready: hasReadiedWeapon(items),
      fix: weaponFix,
    },
    spellSlots: {
      applies: Object.keys(slotFix).length > 0,
      ready: Object.keys(character.spellSlots).length > 0,
      fix: slotFix,
    },
    masteries: {
      applies: masteryFix !== null,
      ready: (character.masteredWeaponIndexes?.length ?? 0) > 0,
      fix: masteryFix,
    },
    skills: {
      applies: true,
      ready: character.skillProficiencies.length > 0,
    },
  }
}
