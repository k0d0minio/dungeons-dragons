// The shapes of the local SRD 5.2.1 data modules in `./data` (`srd-2024-migration/srd-data-layer`).
//
// These describe what `scripts/srd/build-srd-data.mjs` writes, not what
// dnd5eapi.co returns: the generator flattens upstream's `{ index, name, url }`
// references to bare index strings and drops its `url`/`updated_at` plumbing, so
// nothing here has to change when upstream restructures — the generator either
// still maps or fails loudly.
//
// Every index is a lowercase slug (`half-plate`, `path-of-the-berserker`) and is
// the value a character row stores, exactly as the 2014 data did — so a column
// holding `'fighter'` keeps its meaning across the migration.
import type { AbilityKey } from '@/lib/characters/schema'

/** A named piece of SRD prose: a trait, a condition, a weapon property. */
export interface SrdEntry {
  index: string
  name: string
  /**
   * SRD text, verbatim. `**Bold lead-ins.**` mark the sub-effects the SRD
   * prints in bold; a renderer may style them, but must not reword them.
   */
  description: string
}

/** A species trait, or a lineage trait gated behind a character level. */
export interface SrdTrait extends SrdEntry {
  /** Character level the trait comes online at. Absent means level 1. */
  level?: number
}

/** One of the sub-options a species offers — an Elven Lineage, a Giant Ancestry. */
export interface SrdLineage {
  index: string
  name: string
  traits: SrdTrait[]
}

export interface SrdSpecies {
  index: string
  name: string
  /** Always `Humanoid` across the nine SRD species, but the SRD prints it. */
  creatureType: string
  /**
   * The SRD's Size line. Two species offer a choice — Human and Tiefling are
   * each `'Medium or Small'` — so this is prose, not an enum.
   */
  size: string
  /** Walking speed in feet. */
  speed: number
  traits: SrdTrait[]
  /** Empty for the five species that offer no lineage choice. */
  lineages: SrdLineage[]
}

export interface SrdBackground {
  index: string
  name: string
  /**
   * The three abilities the background's +2/+1 (or +1/+1/+1) is spent among.
   * 2024 backgrounds, not species, are where ability scores come from.
   */
  abilityScores: AbilityKey[]
  /** The Origin feat the background grants; `note` narrows it (Magic Initiate: Cleric). */
  originFeat: { index: string; name: string; note?: string }
  /** Skill indexes as `@/lib/characters/schema` spells them. */
  skillProficiencies: string[]
  /**
   * The tool the background grants. `note` carries the SRD's instruction where
   * the grant is a choice — the Soldier's "Choose one kind of Gaming Set".
   */
  toolProficiency: { index: string; name: string; note?: string } | null
  /** The SRD's "Choose A or B" starting-equipment lines, one per choice. */
  equipment: string[]
}

/** A class feature, gained at `level` by every character of that class. */
export interface SrdClassFeature extends SrdEntry {
  level: number
}

/** One of a class's skill-proficiency choices: "Choose 2 from …". */
export interface SrdSkillChoice {
  choose: number
  description: string | null
  /** Skill indexes as `@/lib/characters/schema` spells them. */
  from: string[]
}

export interface SrdClass {
  index: string
  name: string
  /** Faces on the class's hit die: 6, 8, 10 or 12. */
  hitDie: number
  /** The SRD's Primary Ability line, e.g. `'Strength or Dexterity'`. */
  primaryAbility: string
  savingThrows: AbilityKey[]
  skillChoices: SrdSkillChoice[]
  /** Armour, weapon and saving-throw proficiencies as the SRD lists them. */
  proficiencies: { index: string; name: string }[]
  /** The SRD's starting-equipment options, one string per "(a) … (b) …" line. */
  startingEquipment: string[]
  /** 3 for every 2024 class — the uniform subclass level. */
  subclassLevel: number
  /** Indexes into `subclasses.json`. Exactly one per class in the SRD. */
  subclasses: string[]
  /** Class features only; a subclass's own features live on the subclass. */
  features: SrdClassFeature[]
}

/** A subclass feature, gained at `level` only by members of that subclass. */
export interface SrdSubclassFeature {
  name: string
  level: number
  description: string
}

export interface SrdSubclass {
  index: string
  name: string
  classIndex: string
  /** The SRD's one-line tagline, e.g. `'Pursue Physical Excellence in Combat'`. */
  summary: string | null
  description: string
  features: SrdSubclassFeature[]
}

export type SrdCondition = SrdEntry
export type SrdWeaponMastery = SrdEntry
export type SrdWeaponProperty = SrdEntry

/** An Origin feat — the four a 2024 background can grant. */
export interface SrdOriginFeat extends SrdEntry {
  /** The SRD's repeatability note, or `null` when the feat is once-only. */
  repeatable: string | null
}

export interface SrdCost {
  quantity: number
  /** `cp`, `sp` or `gp`. */
  unit: string
}

export interface SrdDamage {
  /** A dice expression (`1d8`, `2d6`) — or `1` for the Blowgun's flat point. */
  dice: string
  /** A damage-type index: `bludgeoning`, `piercing`, `slashing`. */
  type: string
}

/** Normal and long range in feet. */
export interface SrdRange {
  normal: number
  long?: number
}

export interface SrdWeapon {
  index: string
  name: string
  category: 'simple' | 'martial'
  kind: 'melee' | 'ranged'
  cost: SrdCost
  /** Pounds, or `null` where the SRD table prints an em dash (the Sling). */
  weight: number | null
  damage: SrdDamage | null
  /** The Versatile damage, or `null` when the weapon is not Versatile. */
  twoHandedDamage: SrdDamage | null
  range: SrdRange | null
  /** Thrown range, distinct from `range` for a melee weapon with Thrown. */
  throwRange: SrdRange | null
  /** Equipment index of the ammunition this weapon consumes, if any. */
  ammunition: string | null
  /** Indexes into `weapon-properties.json`. */
  properties: string[]
  /**
   * Index into `weapon-masteries.json`. Every SRD weapon has exactly one
   * mastery property; whether a character may *use* it is a class question.
   */
  mastery: string
}
