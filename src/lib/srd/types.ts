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

/** Which of SRD 5.2.1's four feat lists a feat is on. */
export type SrdFeatCategory = 'origin' | 'general' | 'fighting-style' | 'epic-boon'

/** A feat — all seventeen SRD 5.2.1 publishes, across the four categories. */
export interface SrdFeat extends SrdEntry {
  category: SrdFeatCategory
  /**
   * The character level the SRD requires before this feat can be taken: 4 for a
   * General feat, 19 for an Epic Boon, 1 for the rest. The one prerequisite
   * that is a number, and so the one a level planner can enforce.
   */
  minimumLevel: number
  /** A feature the feat requires — `'Fighting Style'`, `'Spellcasting'` — or `null`. */
  requiresFeature: string | null
  /** The SRD's ability prerequisite in its own words (Grappler's "Strength or Dexterity 13+"), or `null`. */
  abilityPrerequisite: string | null
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

// --- the long tail -----------------------------------------------------------
// Spells, monsters, magic items and equipment: what the reference browser exists
// to serve (`srd-2024-migration/long-tail-reference-data`). These arrived later
// than the creation sets and from two upstreams, but they are shaped by the same
// rules — camelCase, no `url` plumbing, references flattened to bare indexes.

/** A spell's ability-check-free component letters: `V`, `S`, `M`. */
export type SrdSpellComponent = 'V' | 'S' | 'M'

/** One row of a spell's "At Higher Levels" damage table. */
export interface SrdHigherLevelDamage {
  /** `Level 4` for a slot, `Character Level 5` for a cantrip that scales. */
  label: string
  /** A dice expression, e.g. `9d6`. */
  damage: string
}

export interface SrdSpell {
  index: string
  name: string
  /** 0 for a cantrip, 1–9 for a levelled spell. */
  level: number
  /** A school index: `evocation`, `abjuration`, … */
  school: string
  /** The SRD's Casting Time line: `Action`, `Bonus Action`, `1 Minute`, … */
  castingTime: string
  /** What triggers a Reaction spell, or `null` for every other casting time. */
  reactionCondition: string | null
  /** The SRD's Range line: `Self`, `Touch`, `150 feet`. */
  range: string
  components: SrdSpellComponent[]
  /** The material component, or `null` when the spell has no `M`. */
  material: string | null
  /** The SRD's Duration line: `Instantaneous`, `1 Minute`, `Until Dispelled`. */
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  /** The SRD's "Using a Higher-Level Spell Slot" note, where it prints one. */
  higherLevel: string | null
  /** The damage that note works out to, slot by slot. Empty for most spells. */
  higherLevelDamage: SrdHigherLevelDamage[]
  /** Class indexes into `classes.json` — what a class's spell list filters on. */
  classes: string[]
  /** Damage-type indexes: `fire`, `necrotic`, … Empty for a spell that deals none. */
  damageTypes: string[]
  /** The ability the spell's save is made with, or `null` when it forces none. */
  savingThrow: string | null
  attackRoll: boolean
}

/** The six ability scores of a monster, or its modifiers, keyed the long way. */
export type SrdAbilityBlock = Record<AbilityKey, number>

/** A named block of a stat block's prose: a trait, an action, a reaction. */
export interface SrdMonsterEntry {
  name: string
  description: string
}

/** The movement modes a stat block prints, in feet. */
export interface SrdSpeed {
  walk?: number
  burrow?: number
  climb?: number
  fly?: number
  swim?: number
  /** Set only on the creatures whose Fly speed the SRD marks as hovering. */
  hover?: boolean
}

/** The senses a stat block prints, in feet. `null` where it prints none. */
export interface SrdSenses {
  darkvision: number | null
  blindsight: number | null
  tremorsense: number | null
  truesight: number | null
}

export interface SrdMonster {
  index: string
  name: string
  /** `Tiny` … `Gargantuan`. */
  size: string
  /** The creature type the SRD prints: `Fey`, `Dragon`, `Construct`, … */
  type: string
  alignment: string | null
  armorClass: number
  /** What the AC comes from — `natural armor`, `chain mail, shield`. */
  armorDetail: string | null
  hitPoints: number
  /** The hit dice expression, e.g. `3d6`. */
  hitDice: string | null
  /**
   * Only the movement modes the stat block names, in feet. A mode the creature
   * does not have is absent, not 0 — `speed_all` upstream fills the gaps with
   * derived zeroes that no stat block prints.
   */
  speed: SrdSpeed
  abilityScores: SrdAbilityBlock
  modifiers: SrdAbilityBlock
  initiativeBonus: number | null
  /** Only the saves the creature is proficient in; the rest are its modifiers. */
  savingThrows: Partial<SrdAbilityBlock>
  /** Only the skills the stat block prints a bonus for. */
  skillBonuses: Partial<Record<string, number>>
  passivePerception: number | null
  senses: SrdSenses
  /** The Languages line as printed, or `null` for a creature with none. */
  languages: string | null
  /** 0, 0.125, 0.25, 0.5, then whole numbers. */
  challengeRating: number
  /** The same value as the SRD prints it: `1/4`, `12`. */
  challengeRatingText: string
  experiencePoints: number
  /** Derived from Challenge Rating — upstream leaves it null on every creature. */
  proficiencyBonus: number
  damageVulnerabilities: string | null
  damageResistances: string | null
  damageImmunities: string | null
  conditionImmunities: string | null
  traits: SrdMonsterEntry[]
  actions: SrdMonsterEntry[]
  bonusActions: SrdMonsterEntry[]
  reactions: SrdMonsterEntry[]
  legendaryActions: SrdMonsterEntry[]
}

export interface SrdMagicItem {
  index: string
  name: string
  /** An index into `equipment-categories.json`: `wondrous-items`, `rings`, … */
  category: string
  /** That category as the SRD names it, e.g. `Wondrous Items`. */
  categoryName: string
  /** `Uncommon`, `Very Rare`, and the handful of per-bonus rarity sentences. */
  rarity: string
  /** 2024 upstream models attunement as a flag, so nothing parses prose for it. */
  attunement: boolean
  /** True when this item is a specific version of a generic one (`+1 Longsword`). */
  variant: boolean
  /** Magic-item indexes of this item's specific versions. */
  variants: string[]
  description: string
}

/** The AC an armour grants, and how Dexterity feeds into it. */
export interface SrdArmorClass {
  base: number
  dexBonus: boolean
  /** The cap on that Dexterity bonus (2 for medium armour), or `null`. */
  maxBonus: number | null
}

/** One line of an item's SRD "Utilize" entry. */
export interface SrdUtilize {
  name: string
  /** The ability the check uses (`INT`), or `null` where the SRD names none. */
  ability: string | null
  dc: number | null
}

export interface SrdEquipment {
  index: string
  name: string
  /** Category indexes, broad to narrow: `['armor', 'medium-armor']`. */
  categories: string[]
  cost: SrdCost | null
  /** Pounds, or `null` where the SRD table prints an em dash. */
  weight: number | null
  /** Prose paragraphs. Empty for a row the SRD gives only a table line. */
  description: string[]
  utilize: SrdUtilize[]
  /** Table footnotes, e.g. the Lance's "Two-handed unless mounted". */
  notes: string[]
  /** Armour only; `null` for everything else. */
  armorClass: SrdArmorClass | null
  /** The Strength score heavy armour needs, or `null` when it needs none. */
  strengthMinimum: number | null
  /** Armour only: `true` when wearing it imposes Stealth disadvantage. */
  stealthDisadvantage: boolean | null
  donTime: string | null
  doffTime: string | null
  /** What an equipment pack holds, as equipment indexes. */
  contents: { index: string; quantity: number }[]
}
