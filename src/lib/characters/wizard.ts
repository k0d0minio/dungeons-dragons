// The guided creation wizard's rules layer (`guided-creation/wizard-frame`).
//
// Everything the stepped flow at `/characters/new` decides *without* a player
// touching it lives here, as plain functions over the SRD 5.2.1 data and the
// 2024 rules engine: which class to put in front of someone who has never
// opened a rulebook, where the standard array goes, which two skills a fighter
// should take, what a level-1 cleric walks in carrying.
//
// Kept out of the components on purpose. A recommendation is a rule with an
// opinion attached, and rules in this app are unit-tested modules rather than
// defaults buried in JSX — `wizard.test.ts` holds every one of the twelve
// classes to having a guide, a legal ability priority and a startable build.
//
// Sibling stubs build directly on this file, and the seams are marked where
// they land. `vibe-quiz` has landed: `vibe-quiz.ts` is a second entry point
// beside {@link recommendedChoices} that starts from four answers rather than
// from a class, and reaches the same build through the same functions.
// `inline-consequences` has landed too: the authored one-liners this file used
// to hold now live beside the SRD data in `src/lib/srd/in-play.ts`, and the one
// thing it needed back from the rules layer is
// {@link equipmentOptionInPlay} — a gear bundle is parsed here, so the line
// that describes one is composed here. `derived-defaults` has landed as well:
// {@link derivedDefaults} is the one place the four numbers a player cannot
// know — hit points, armour class, speed, and the AC their gear will actually
// give them — are worked out, and the Advanced toggle's three overrides are the
// only way to type one by hand.
import {
  ABILITIES,
  type AbilityKey,
  CHARACTER_FORM_DEFAULTS,
  type CharacterFormValues,
} from '@/lib/characters/schema'
import {
  derivedArmorClass,
  isShield,
  type ArmorDetails,
  type DerivedArmorClass,
} from '@/lib/characters/attacks'
import { curatedSpellIndexes } from '@/lib/characters/curated-spells'
import { abilityModifier } from '@/lib/characters/display'
import {
  type AbilityScores,
  abilityScoresWithBackground,
  BACKGROUNDS,
  type BackgroundAbilitySpread,
  CLASS_SKILL_OPTIONS,
  classSkillChoices,
  hitDie,
  spellcastingAbility,
  speciesHitPointBonus,
  spellPreparationModel,
  preparedSpellLimit,
  unarmoredArmorClass,
} from '@/lib/characters/rules'
import { CLASSES } from '@/lib/srd/classes'
import { EQUIPMENT } from '@/lib/srd/equipment'
import { GEAR_IN_PLAY, WEAPON_GROUP_IN_PLAY } from '@/lib/srd/in-play'
import { SPECIES } from '@/lib/srd/species'
import { spellsForClass } from '@/lib/srd/spells'
import { WEAPONS, weaponGroupOf } from '@/lib/srd/weapons'

// ---------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------

/**
 * The eight steps, in order: **mechanics before flavour**, which is the whole
 * shape of the research this epic came out of. A first-time player who is asked
 * for a name before they know what a paladin is spends ten minutes on the name
 * and then finds out the class decides everything else.
 *
 * The background sits third because in the 2024 rules it is where ability score
 * increases come from — so it has to be answered before the scores are.
 */
export const WIZARD_STEPS = [
  { id: 'class', title: 'Pick a class', short: 'Class' },
  { id: 'species', title: 'Pick a species', short: 'Species' },
  { id: 'background', title: 'Pick a background', short: 'Background' },
  { id: 'abilities', title: 'Set your ability scores', short: 'Scores' },
  { id: 'skills', title: 'Choose your skills', short: 'Skills' },
  { id: 'equipment', title: 'Take your starting gear', short: 'Gear' },
  { id: 'spells', title: 'Choose your spells', short: 'Spells' },
  { id: 'identity', title: 'Name your character', short: 'Name' },
] as const

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id']

export const WIZARD_STEP_IDS = WIZARD_STEPS.map((step) => step.id) as WizardStepId[]

/**
 * The spells step is the one step that is not always there — seven of the
 * twelve classes cast nothing at level 1, and an empty "Spells" step reads as
 * something broken rather than something they do not get.
 *
 * Returned as a list rather than a predicate so the progress indicator, the
 * Next button and the draft's `stepId` all count the same steps.
 */
export function stepsFor(classIndex: string): readonly (typeof WIZARD_STEPS)[number][] {
  return WIZARD_STEPS.filter((step) => step.id !== 'spells' || spellcastingAbility(classIndex))
}

// ---------------------------------------------------------------------------
// What to say about a class, and what to recommend with it
// ---------------------------------------------------------------------------

/** How much a class asks a first-time player to hold in their head. */
export type ClassComplexity = 'simple' | 'involved'

export interface ClassGuide {
  complexity: ClassComplexity
  /**
   * All six abilities, best first, for this class. The standard array is
   * poured into this order, so position 0 takes the 15.
   *
   * Written out rather than derived from `primaryAbilities()`: the SRD's
   * Primary Ability line names one or two, and the array needs all six ranked.
   * `wizard.test.ts` holds the top of each list to agreeing with the SRD.
   */
  abilityPriority: readonly AbilityKey[]
  /** The species this class is offered with by default. */
  species: string
  /** The background this class is offered with by default. */
  background: string
}

/**
 * The twelve SRD 5.2.1 classes as a beginner meets them.
 *
 * The one-line summaries this table used to carry now live in
 * `src/lib/srd/in-play.ts` as `CLASS_IN_PLAY`, keyed by the same index
 * (`inline-consequences`) — beside the same line for every other option the
 * wizard shows, rather than in the one table that happened to have room. What
 * is left here is the recommendation itself: how much a class asks of a
 * first-timer, where its standard array goes, and what it is offered with.
 *
 * `complexity: 'simple'` is the research's steer, not a value judgement: the
 * Fighter and the Rogue put the fewest decisions between a new player and their
 * first turn, so they are the two the wizard leads with and badges.
 */
export const CLASS_GUIDES: Readonly<Record<string, ClassGuide>> = {
  fighter: {
    complexity: 'simple',
    abilityPriority: [
      'strength',
      'constitution',
      'dexterity',
      'wisdom',
      'charisma',
      'intelligence',
    ],
    species: 'human',
    background: 'soldier',
  },
  rogue: {
    complexity: 'simple',
    abilityPriority: [
      'dexterity',
      'constitution',
      'wisdom',
      'charisma',
      'intelligence',
      'strength',
    ],
    species: 'halfling',
    background: 'criminal',
  },
  barbarian: {
    complexity: 'simple',
    abilityPriority: [
      'strength',
      'constitution',
      'dexterity',
      'wisdom',
      'charisma',
      'intelligence',
    ],
    species: 'goliath',
    background: 'soldier',
  },
  cleric: {
    complexity: 'involved',
    abilityPriority: [
      'wisdom',
      'constitution',
      'strength',
      'charisma',
      'dexterity',
      'intelligence',
    ],
    species: 'dwarf',
    background: 'acolyte',
  },
  wizard: {
    complexity: 'involved',
    abilityPriority: [
      'intelligence',
      'constitution',
      'dexterity',
      'wisdom',
      'charisma',
      'strength',
    ],
    species: 'human',
    background: 'sage',
  },
  ranger: {
    complexity: 'involved',
    abilityPriority: [
      'dexterity',
      'wisdom',
      'constitution',
      'strength',
      'intelligence',
      'charisma',
    ],
    species: 'elf',
    background: 'criminal',
  },
  paladin: {
    complexity: 'involved',
    abilityPriority: [
      'strength',
      'charisma',
      'constitution',
      'wisdom',
      'dexterity',
      'intelligence',
    ],
    species: 'human',
    background: 'soldier',
  },
  bard: {
    complexity: 'involved',
    abilityPriority: [
      'charisma',
      'dexterity',
      'constitution',
      'wisdom',
      'intelligence',
      'strength',
    ],
    species: 'human',
    background: 'acolyte',
  },
  druid: {
    complexity: 'involved',
    abilityPriority: [
      'wisdom',
      'constitution',
      'dexterity',
      'intelligence',
      'charisma',
      'strength',
    ],
    species: 'elf',
    background: 'sage',
  },
  monk: {
    complexity: 'involved',
    abilityPriority: [
      'dexterity',
      'wisdom',
      'constitution',
      'strength',
      'charisma',
      'intelligence',
    ],
    species: 'human',
    background: 'soldier',
  },
  sorcerer: {
    complexity: 'involved',
    abilityPriority: [
      'charisma',
      'constitution',
      'dexterity',
      'wisdom',
      'intelligence',
      'strength',
    ],
    species: 'dragonborn',
    background: 'acolyte',
  },
  warlock: {
    complexity: 'involved',
    abilityPriority: [
      'charisma',
      'constitution',
      'dexterity',
      'wisdom',
      'intelligence',
      'strength',
    ],
    species: 'tiefling',
    background: 'acolyte',
  },
}

/** The class the wizard opens on — the lowest-cognitive-load one (research §3). */
export const DEFAULT_CLASS_INDEX = 'fighter'

/**
 * The two classes the research names outright — Champion Fighter and Thief
 * Rogue, the lowest cognitive load in the game — which is a stronger claim than
 * `complexity: 'simple'` and so is its own list. The Barbarian is simple too,
 * and is badged for it; it is not one of the two a hesitant player is steered
 * to first.
 */
const LEAD_CLASSES = ['fighter', 'rogue'] as const

/**
 * The twelve classes in the order the first step shows them: the two the
 * research steers hesitant players toward, then the rest in SRD order. A
 * beginner reads the top of a list and stops.
 */
export function classCardOrder(): string[] {
  const all = CLASSES.all.map((entry) => entry.index)
  const lead = LEAD_CLASSES.filter((index) => all.includes(index))

  return [...lead, ...all.filter((index) => !lead.includes(index as (typeof LEAD_CLASSES)[number]))]
}

/** The guide for a class, or `null` for one the SRD data does not carry. */
export function classGuide(classIndex: string): ClassGuide | null {
  return CLASS_GUIDES[classIndex] ?? null
}

// ---------------------------------------------------------------------------
// Ability scores: the standard array
// ---------------------------------------------------------------------------

/**
 * The standard array — the only score method the wizard offers. Point buy is a
 * budget a first-timer has to understand before they can spend it, and rolling
 * is a conversation with the DM; a fixed set of six numbers to place is neither.
 * The Advanced toggle on the step opens plain entry for anyone who wants it.
 */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const

/**
 * Which ability takes which of the six numbers, best first — the class's own
 * priority order, so a fighter's 15 lands on Strength without being asked.
 */
export function recommendedAbilityAssignment(classIndex: string): AbilityKey[] {
  const guide = classGuide(classIndex)
  if (guide) return [...guide.abilityPriority]

  // A class this build has never heard of still has to place six numbers.
  return ABILITIES.map((ability) => ability.key)
}

/**
 * The six scores an assignment produces, before the background's increases.
 *
 * An assignment shorter than six — or one naming an ability twice, which the
 * step's swap cannot produce but a hand-edited draft can — leaves the missing
 * abilities on the array's lowest value rather than on nothing.
 */
export function abilityScoresFromAssignment(assignment: readonly AbilityKey[]): AbilityScores {
  const lowest = STANDARD_ARRAY[STANDARD_ARRAY.length - 1]
  const scores = Object.fromEntries(
    ABILITIES.map((ability) => [ability.key, lowest]),
  ) as AbilityScores

  const taken = new Set<AbilityKey>()

  assignment.forEach((ability, position) => {
    if (position >= STANDARD_ARRAY.length || taken.has(ability)) return
    taken.add(ability)
    scores[ability] = STANDARD_ARRAY[position]
  })

  return scores
}

/**
 * Where the background's +2/+1 goes: on the two highest-priority abilities of
 * the three the background offers.
 *
 * The order is the order the spread spends its increases, which is what
 * `abilityScoresWithBackground` and the `background_abilities` column both
 * expect. Empty for a background the SRD data does not carry — which
 * `normaliseOriginSelections` then stores as `null`, not as a guess.
 */
export function recommendedBackgroundAbilities(
  classIndex: string,
  backgroundIndex: string,
): AbilityKey[] {
  const background = BACKGROUNDS.get(backgroundIndex)
  if (!background) return []

  const priority = recommendedAbilityAssignment(classIndex)

  return [...background.abilityScores]
    .sort((a, b) => priority.indexOf(a) - priority.indexOf(b))
    .slice(0, 2)
}

/**
 * The scores as the row will hold them: the array assignment with the
 * background's increases already added.
 *
 * This is the one place in the app where scores are a *base* rather than a
 * finished total — everywhere else the six columns are what the player typed —
 * which is why `abilityScoresWithBackground` has waited for this stub to have a
 * call site at all (`srd-2024-migration/breakdown.md`). Applying it once, here,
 * is what keeps the sheet from double-counting a +2 it cannot tell from a roll.
 */
export function finalAbilityScores(choices: WizardChoices): AbilityScores {
  const base = choices.manualScores ?? abilityScoresFromAssignment(choices.abilityAssignment)

  if (!choices.backgroundIndex) return base

  return abilityScoresWithBackground(
    base,
    choices.backgroundIndex,
    choices.backgroundAbilitySpread,
    choices.backgroundAbilities,
  )
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * The eighteen skills ranked by how often they come up at a table, best first.
 *
 * A ranking rather than a per-class list because the class already narrows the
 * options to five or eight; all this has to do is break the tie sensibly, and
 * "Perception is the most rolled skill in the game" is true for every class
 * that can take it.
 */
export const SKILL_PRIORITY: readonly string[] = [
  'perception',
  'stealth',
  'athletics',
  'insight',
  'persuasion',
  'investigation',
  'acrobatics',
  'survival',
  'arcana',
  'deception',
  'intimidation',
  'sleight-of-hand',
  'medicine',
  'history',
  'nature',
  'religion',
  'animal-handling',
  'performance',
]

/**
 * Where a skill sits in the ranking, with `emphasis` jumped to the front of it.
 *
 * `vibe-quiz` is what passes an emphasis: the quiz's answers name a handful of
 * skills the player has just told you they care about, and the class list is
 * still what says which of them are theirs to take. Everything not emphasised
 * falls back to the general ranking, so a short or irrelevant emphasis narrows
 * nothing.
 */
function skillRank(index: string, emphasis: readonly string[] = []): number {
  const emphasised = emphasis.indexOf(index)
  if (emphasised !== -1) return emphasised - emphasis.length

  const rank = SKILL_PRIORITY.indexOf(index)
  return rank === -1 ? SKILL_PRIORITY.length : rank
}

/** How many skills the class says to choose — the SRD's "Choose 2", "Choose 4". */
export function classSkillCount(classIndex: string): number {
  return classSkillChoices(classIndex).reduce((total, choice) => total + choice.choose, 0)
}

/**
 * The skills a character of this class and background starts proficient in:
 * the two the background grants outright, plus the class's own choices filled
 * from the top of the ranking.
 *
 * The background's skills are not a choice, so they are added first and the
 * class's count is spent on skills the character does not already have — a
 * Soldier Fighter would otherwise "choose" Athletics they were given.
 *
 * `emphasis` is the quiz's contribution: skills the player's answers asked for,
 * taken ahead of the general ranking wherever the class offers them.
 */
export function recommendedSkills(
  classIndex: string,
  backgroundIndex: string,
  emphasis: readonly string[] = [],
): string[] {
  const granted = BACKGROUNDS.get(backgroundIndex)?.skillProficiencies ?? []
  const chosen = new Set<string>(granted)

  const options = [...(CLASS_SKILL_OPTIONS[classIndex] ?? [])].sort(
    (a, b) => skillRank(a, emphasis) - skillRank(b, emphasis),
  )

  for (const skill of options) {
    if (chosen.size >= granted.length + classSkillCount(classIndex)) break
    chosen.add(skill)
  }

  return [...chosen]
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

/** Cantrips known at 1st level, by class — the SRD Features tables' first row. */
const CANTRIPS_AT_LEVEL_ONE: Readonly<Record<string, number>> = {
  bard: 2,
  cleric: 3,
  druid: 2,
  sorcerer: 4,
  warlock: 2,
  wizard: 3,
}

/** How many spells a 1st-level character of this class starts with, by kind. */
export function startingSpellCounts(classIndex: string): {
  cantrips: number
  spellbook: number
  prepared: number
} {
  return {
    cantrips: CANTRIPS_AT_LEVEL_ONE[classIndex] ?? 0,
    // A wizard's book starts at six spells; nobody else has one.
    spellbook: classIndex === 'wizard' ? 6 : 0,
    prepared: spellcastingAbility(classIndex) ? (preparedSpellLimit(classIndex, 1) ?? 0) : 0,
  }
}

/** The curated suggestions for a class, filtered to spells the SRD data has. */
export function curatedSpells(classIndex: string): { cantrips: string[]; level1: string[] } {
  const curated = curatedSpellIndexes(classIndex)

  const castable = new Set(spellsForClass(classIndex).map((spell) => spell.index))

  return {
    cantrips: curated.cantrips.filter((index) => castable.has(index)),
    level1: curated.level1.filter((index) => castable.has(index)),
  }
}

/**
 * The two spell columns as a 1st-level character of this class starts them.
 *
 * The split follows the app's two-list model (D22) rather than inventing a
 * third: cantrips are *known* — they are never prepared and must not count
 * against the prepared limit the sheet prints — while the leveled spells a
 * character walks in with are *prepared*. A wizard's book is `known` as well,
 * because for a spellbook class that column is the book.
 */
export function startingSpells(
  classIndex: string,
  picks: { cantrips: readonly string[]; level1: readonly string[] },
): { knownSpellIndexes: string[]; preparedSpellIndexes: string[] } {
  if (!spellcastingAbility(classIndex)) {
    return { knownSpellIndexes: [], preparedSpellIndexes: [] }
  }

  const counts = startingSpellCounts(classIndex)
  const cantrips = [...new Set(picks.cantrips)].slice(0, counts.cantrips)
  const spellbook = spellPreparationModel(classIndex) === 'spellbook'
  const leveled = [...new Set(picks.level1)].slice(
    0,
    spellbook ? counts.spellbook : counts.prepared,
  )

  return {
    knownSpellIndexes: spellbook ? [...cantrips, ...leveled] : cantrips,
    // The book can hold more than the day's preparation, so a wizard prepares
    // from the top of their own list rather than all of it.
    preparedSpellIndexes: spellbook ? leveled.slice(0, counts.prepared) : leveled,
  }
}

// ---------------------------------------------------------------------------
// Starting equipment
// ---------------------------------------------------------------------------

/** One line of a starting-equipment option, as the inventory will hold it. */
export interface StartingItem {
  /** SRD equipment or weapon index, or `null` for something only the SRD names. */
  equipmentIndex: string | null
  name: string
  quantity: number
  /** Armour and shields arrive worn — which is what makes the sheet derive AC. */
  equipped: boolean
}

export interface EquipmentOption {
  /** `'A'`, `'B'`, `'C'` — assigned by position, not read off the SRD's letters. */
  label: string
  items: StartingItem[]
  /** Gold pieces the option comes with. */
  gold: number
}

/** `’` is what the SRD data uses; every index in it was built from `'`. */
function normaliseName(name: string): string {
  return name.replace(/[‘’]/g, "'").trim()
}

/**
 * The SRD index for an item named in a starting-equipment line, or `null`.
 *
 * Tries the plural forms the equipment lists print ("8 Javelins", "2 Pouches")
 * against the singular entries they resolve to. A miss is not a failure: the
 * item is still stored, by name, exactly as `character_items` allows — a
 * "Musical Instrument of your choice" is a real thing to be carrying and a
 * thing the SRD deliberately does not pin to one index.
 */
export function equipmentIndexFor(name: string): string | null {
  const cleaned = normaliseName(name)
  const candidates = [cleaned]

  if (/s$/i.test(cleaned)) candidates.push(cleaned.slice(0, -1))
  if (/es$/i.test(cleaned)) candidates.push(cleaned.slice(0, -2))

  for (const candidate of candidates) {
    const slug = candidate
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (EQUIPMENT.has(slug)) return slug
    if (WEAPONS.has(slug)) return slug
  }

  // The generated indexes drop the possessive apostrophe in some names and keep
  // the word in others, so fall back to matching on the printed name.
  const wanted = cleaned.toLowerCase()
  const byName =
    EQUIPMENT.all.find((entry) => normaliseName(entry.name).toLowerCase() === wanted) ??
    WEAPONS.all.find((entry) => normaliseName(entry.name).toLowerCase() === wanted)

  return byName?.index ?? null
}

/** True for an SRD entry that is body armour or a shield — the things worn. */
function isWearable(index: string | null): boolean {
  if (!index) return false
  return EQUIPMENT.get(index)?.categories.includes('armor') ?? false
}

/**
 * One "(a) Chain Mail, Greatsword, …, and 4 GP" clause, as items and gold.
 *
 * The SRD prints these as prose, and the data layer carries the prose verbatim
 * — so this is a parser, and it is written to degrade rather than throw: a
 * phrase it cannot resolve becomes an item with that name and no index, which
 * is a row the inventory renders and a player can rename.
 */
function parseEquipmentClause(clause: string): { items: StartingItem[]; gold: number } {
  const items: StartingItem[] = []
  let gold = 0

  for (const raw of clause.split(',')) {
    const entry = normaliseName(raw).replace(/^and\s+/i, '')
    if (!entry) continue

    const counted = /^(\d+)\s+(.+)$/.exec(entry)
    const quantity = counted ? Number(counted[1]) : 1
    const name = counted ? normaliseName(counted[2]) : entry

    if (/^gp$/i.test(name)) {
      gold += quantity
      continue
    }

    const equipmentIndex = equipmentIndexFor(name)

    items.push({
      equipmentIndex,
      name: equipmentIndex
        ? ((EQUIPMENT.get(equipmentIndex) ?? WEAPONS.get(equipmentIndex))?.name ?? name)
        : name,
      quantity: Math.min(Math.max(quantity, 1), 999),
      equipped: isWearable(equipmentIndex),
    })
  }

  return { items, gold }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

/**
 * Split an SRD starting-equipment line into its "(a) … (b) … or (c) …" options.
 *
 * Labels come from the position, not from the letters the SRD printed: the
 * Druid's line labels both of its options "(a)", and a wizard that offers two
 * choices both called A is worse than one that renames them.
 */
function parseEquipmentLine(line: string): EquipmentOption[] {
  // Drop a "Choose A or B:" lead-in, which the backgrounds carry and the
  // classes do not.
  const body = line.replace(/^[^:(]*:\s*/, '')

  return body
    .split(/\([A-Za-z]\)/)
    .slice(1)
    .map((clause) => clause.replace(/[;,]?\s*(?:or)?\s*$/i, ''))
    .filter((clause) => clause.trim().length > 0)
    .map((clause, position) => ({
      label: OPTION_LABELS[position] ?? String(position + 1),
      ...parseEquipmentClause(clause),
    }))
}

/**
 * The consequence line for one bundle of starting gear
 * (`guided-creation/inline-consequences`).
 *
 * Composed rather than authored, because the options themselves are: the SRD
 * writes them as prose, {@link classEquipmentOptions} parses that prose, and
 * "Chain Mail, Greatsword, Flail, 8 Javelins" is not a row anybody can write a
 * line against ahead of time. So the line comes from the weapon the bundle
 * hands you — which is the part of a starting kit that decides how the first
 * fight goes — and falls back to the two authored lines for the bundles that
 * hand you none: the SRD's "or 50 GP" clause, and the kits that are tools and
 * clothes.
 */
export function equipmentOptionInPlay(option: EquipmentOption): string {
  for (const item of option.items) {
    const group = item.equipmentIndex ? weaponGroupOf(item.equipmentIndex) : null
    if (group) return WEAPON_GROUP_IN_PLAY[group]
  }

  return option.items.length === 0 ? GEAR_IN_PLAY.goldInstead : GEAR_IN_PLAY.noWeapon
}

/** What a class walks in with — one entry per "(a) / (b) / (c)" the SRD offers. */
export function classEquipmentOptions(classIndex: string): EquipmentOption[] {
  return (CLASSES.get(classIndex)?.startingEquipment ?? []).flatMap(parseEquipmentLine)
}

/** What a background adds to it — the SRD's "Choose A or B". */
export function backgroundEquipmentOptions(backgroundIndex: string): EquipmentOption[] {
  return (BACKGROUNDS.get(backgroundIndex)?.equipment ?? []).flatMap(parseEquipmentLine)
}

/**
 * The items and gold a finished set of choices produces.
 *
 * Out-of-range option numbers fall back to the first option rather than to
 * nothing: a character created from a stale draft should walk in carrying the
 * class's kit, not empty-handed.
 */
export function startingEquipmentOf(choices: {
  classIndex: string
  backgroundIndex: string
  classEquipmentOption: number
  backgroundEquipmentOption: number
}): { items: StartingItem[]; gold: number } {
  const pick = (options: EquipmentOption[], position: number) =>
    options[position] ?? options[0] ?? null

  const chosen = [
    pick(classEquipmentOptions(choices.classIndex), choices.classEquipmentOption),
    pick(backgroundEquipmentOptions(choices.backgroundIndex), choices.backgroundEquipmentOption),
  ].filter((option): option is EquipmentOption => option !== null)

  return {
    items: chosen.flatMap((option) => option.items),
    gold: chosen.reduce((total, option) => total + option.gold, 0),
  }
}

/** One starting item in the shape `character_items` stores it. */
export interface StartingItemRow {
  equipmentIndex: string | null
  customName: string | null
  quantity: number
  equipped: boolean
}

/** The cap `itemInputSchema` puts on a stored item name. */
const ITEM_NAME_LIMIT = 80

/**
 * The inventory a finished set of choices walks in with, ready to insert.
 *
 * A resolved SRD item is stored by index with no name of its own, so the sheet
 * renders whatever the reference data calls it today and can tap through to the
 * detail view. Everything else — "Musical Instrument of your choice", an
 * Arcane Focus the SRD leaves open — is stored as a named row, which is exactly
 * the homebrew half `character_items` was built with.
 */
export function startingInventory(choices: {
  classIndex: string
  backgroundIndex: string
  classEquipmentOption: number
  backgroundEquipmentOption: number
}): { items: StartingItemRow[]; gold: number } {
  const { items, gold } = startingEquipmentOf(choices)

  return {
    gold,
    items: items.map((item) => ({
      equipmentIndex: item.equipmentIndex,
      customName: item.equipmentIndex ? null : item.name.slice(0, ITEM_NAME_LIMIT),
      quantity: item.quantity,
      equipped: item.equipped,
    })),
  }
}

// ---------------------------------------------------------------------------
// Derived numbers
// ---------------------------------------------------------------------------

/**
 * Maximum hit points at 1st level: the whole hit die, the Constitution
 * modifier, and whatever the species adds — which is what every 5e character
 * starts with, no roll and no choice.
 *
 * The three parts come from three owners and are only added up here: the die is
 * the class's (`hitDie`), the species bonus is the species' trait table
 * (`speciesHitPointBonus` — Dwarven Toughness is the SRD's one), and the
 * modifier is arithmetic. The level planner adds the same two things per level
 * gained, so a dwarf keeps their point a level rather than only having it at
 * first.
 *
 * A class the data does not describe falls back to a d8, the commonest die, and
 * the class's own part never drops below 1 — a wretched Constitution costs hit
 * points, it does not remove them.
 */
export function derivedMaxHitPoints(
  classIndex: string,
  speciesIndex: string,
  constitution: number,
): number {
  const die = hitDie(classIndex) ?? 8

  return Math.max(1, die + abilityModifier(constitution)) + speciesHitPointBonus(speciesIndex)
}

/**
 * The armour details of everything the starting gear arrives *wearing*, in the
 * shape the sheet's own AC derivation takes.
 *
 * The gear is parsed out of SRD prose into equipment indexes
 * ({@link startingEquipmentOf}), and the SRD rows carry the armour columns — so
 * the wizard can answer "what will this character's AC be" from local data,
 * without the sheet's fetch and without a second copy of the armour table.
 */
export function startingArmorDetails(choices: {
  classIndex: string
  backgroundIndex: string
  classEquipmentOption: number
  backgroundEquipmentOption: number
}): ArmorDetails[] {
  return startingEquipmentOf(choices)
    .items.filter((item) => item.equipped && item.equipmentIndex)
    .flatMap((item) => {
      const entry = EQUIPMENT.get(item.equipmentIndex as string)
      if (!entry?.armorClass) return []

      return [
        {
          index: entry.index,
          name: entry.name,
          categories: entry.categories,
          armorClass: entry.armorClass,
        },
      ]
    })
}

/**
 * The stored armour class column: the number that applies with *no body armour
 * on*, which for most classes is 10 + Dexterity and for a barbarian or a monk
 * is their Unarmored Defense (`unarmoredArmorClass` in the rules engine).
 *
 * Deliberately not the armour the wizard just handed out. The sheet derives AC
 * from equipped armour and falls back to this column when there is none
 * (`derivedArmorClass` in `attacks.ts`), so a chain-mailed fighter reads 16 on
 * their sheet from the item and 12 here for the day they take it off. Writing
 * 16 into the column instead would double-count the moment anything else
 * touched it.
 *
 * The one thing the gear changes here is a shield carried *without* body
 * armour — a barbarian's Unarmored Defense keeps working under one. The sheet
 * adds nothing to a manual column on purpose ("the player has already counted
 * their shield"), so this is where that +2 has to be counted, and it is skipped
 * the moment there is body armour to derive from instead.
 */
export function derivedArmorClassColumn(
  classIndex: string,
  scores: AbilityScores,
  wearing: readonly ArmorDetails[] = [],
): number {
  const bodyArmor = wearing.some((armor) => !isShield(armor) && armor.armorClass)
  const shield = wearing.some(isShield)

  return unarmoredArmorClass(classIndex, scores) + (shield && !bodyArmor ? 2 : 0)
}

/** Walking speed comes from the species and nowhere else at 1st level in the
 * 2024 rules — a monk's Unarmored Movement is a 2nd-level feature, so nothing
 * a wizard-built character has yet moves this number. */
export function derivedSpeed(speciesIndex: string): number {
  return SPECIES.get(speciesIndex)?.speed ?? 30
}

/**
 * Every number the wizard writes without asking for it, plus the AC the sheet
 * will actually show once the starting gear is worn.
 *
 * One function because the four numbers share their inputs and the screens want
 * them together: the summary card prints all of them, and {@link
 * wizardFormValues} writes three of them into columns. `armorClassInPlay` is
 * the fourth and is *not* stored — it is `derivedArmorClass` from the sheet,
 * asked the same question with the same armour, so what the last step promises
 * is literally what the first sheet render computes.
 *
 * An override, where the player has typed one behind the Advanced toggle,
 * replaces the derived number here rather than at the call sites — so there is
 * one answer to "where did this figure come from" and `overridden` is how a
 * screen says which.
 */
export interface DerivedDefaults {
  maxHitPoints: number
  /** The `armorClass` column: what applies with no body armour on. */
  armorClass: number
  speed: number
  /** AC as the sheet will render it, gear included. */
  armorClassInPlay: DerivedArmorClass
  overridden: { maxHitPoints: boolean; armorClass: boolean; speed: boolean }
}

export function derivedDefaults(choices: WizardChoices): DerivedDefaults {
  const scores = finalAbilityScores(choices)
  const wearing = startingArmorDetails(choices)

  const maxHitPoints =
    choices.manualMaxHitPoints ??
    derivedMaxHitPoints(choices.classIndex, choices.speciesIndex, scores.constitution)
  const armorClass =
    choices.manualArmorClass ?? derivedArmorClassColumn(choices.classIndex, scores, wearing)
  const speed = choices.manualSpeed ?? derivedSpeed(choices.speciesIndex)

  return {
    maxHitPoints,
    armorClass,
    speed,
    armorClassInPlay: derivedArmorClass({ armorClass, dexterity: scores.dexterity }, wearing),
    overridden: {
      maxHitPoints: choices.manualMaxHitPoints !== null,
      armorClass: choices.manualArmorClass !== null,
      speed: choices.manualSpeed !== null,
    },
  }
}

// ---------------------------------------------------------------------------
// The choices, start to finish
// ---------------------------------------------------------------------------

/**
 * Everything the eight steps collect.
 *
 * Wider than `CharacterFormValues` in two places and narrower in several: the
 * assignment and the equipment option numbers are how the *wizard* holds a
 * choice, and neither survives into a column — what the row stores is the
 * scores they produce and the items they buy. {@link wizardFormValues} is the
 * one place the two shapes meet.
 */
export interface WizardChoices {
  classIndex: string
  speciesIndex: string
  backgroundIndex: string
  /** Ability keys in standard-array order: position 0 takes the 15. */
  abilityAssignment: AbilityKey[]
  /** Scores typed by hand behind the Advanced toggle, or `null` for the array. */
  manualScores: AbilityScores | null
  backgroundAbilitySpread: BackgroundAbilitySpread
  /** Which of the background's three abilities the spread is spent on, in order. */
  backgroundAbilities: AbilityKey[]
  skillProficiencies: string[]
  /** Doubled skills — a 1st-level rogue's or bard's feature, and only theirs (D21). */
  skillExpertise: string[]
  classEquipmentOption: number
  backgroundEquipmentOption: number
  cantripIndexes: string[]
  levelOneSpellIndexes: string[]
  /**
   * Numbers typed by hand behind the Advanced toggle, or `null` for the derived
   * ones — which is what they are for every build nobody has overridden.
   *
   * They are three fields rather than one flag because they are three separate
   * escapes: a player copying a sheet off paper may know their maximum and not
   * care about the rest. {@link derivedDefaults} is the only place they are
   * read, so nothing else has to know an override is possible.
   */
  manualMaxHitPoints: number | null
  manualArmorClass: number | null
  manualSpeed: number | null
  name: string
}

/**
 * The complete recommended build for a class — every step answered, ready to be
 * accepted one tap at a time or in one go.
 *
 * One of two entry points, and the one that starts from a class: `vibe-quiz.ts`
 * starts from four answers instead and produces the same shape through the same
 * functions, so the wizard never has to know which of the two filled it in.
 */
export function recommendedChoices(classIndex: string): WizardChoices {
  const guide = classGuide(classIndex) ?? classGuide(DEFAULT_CLASS_INDEX)!
  const backgroundIndex = guide.background
  const curated = curatedSpells(classIndex)
  const counts = startingSpellCounts(classIndex)

  return {
    classIndex,
    speciesIndex: guide.species,
    backgroundIndex,
    abilityAssignment: recommendedAbilityAssignment(classIndex),
    manualScores: null,
    // The +2/+1 spread is the one that makes a 17 out of a 15, which is the
    // difference a first-level character actually feels.
    backgroundAbilitySpread: 'two-and-one',
    backgroundAbilities: recommendedBackgroundAbilities(classIndex, backgroundIndex),
    skillProficiencies: recommendedSkills(classIndex, backgroundIndex),
    // Expertise is offered — a rogue and a bard both have it at 1st level — but
    // never pre-picked: doubling a skill is a choice about how this character
    // plays, and there is no default that is right more often than not.
    skillExpertise: [],
    classEquipmentOption: 0,
    backgroundEquipmentOption: 0,
    cantripIndexes: curated.cantrips.slice(0, counts.cantrips),
    levelOneSpellIndexes: curated.level1.slice(0, Math.max(counts.spellbook, counts.prepared)),
    // Nothing is overridden by default, and there is no recommendation to make
    // about a number the rules already decide: HP, AC and speed are derived
    // until somebody opens the Advanced toggle and says otherwise.
    manualMaxHitPoints: null,
    manualArmorClass: null,
    manualSpeed: null,
    name: '',
  }
}

/**
 * Re-seat every downstream choice on a new class, keeping only the name.
 *
 * The class is the first step and it decides the rest: a wizard's spellbook, a
 * fighter's chain mail and a rogue's four skills are all answers to "what class
 * is this". Carrying them across a change would leave a barbarian holding a
 * spellbook — so going back and changing the class starts the recommendation
 * again, which is also the only behaviour that can be explained in one line on
 * the screen.
 */
export function withClass(choices: WizardChoices, classIndex: string): WizardChoices {
  if (classIndex === choices.classIndex) return choices

  return { ...recommendedChoices(classIndex), name: choices.name }
}

/** Species drives speed and nothing else in the 2024 rules — nothing to re-seat. */
export function withSpecies(choices: WizardChoices, speciesIndex: string): WizardChoices {
  return { ...choices, speciesIndex }
}

/**
 * A new background re-seats what it grants: the ability increases are spent
 * among *its* three abilities, and its two skills are part of the recommended
 * set. Anything the player chose by hand on those steps is chosen again — the
 * old spread names abilities this background may not even offer.
 */
export function withBackground(choices: WizardChoices, backgroundIndex: string): WizardChoices {
  if (backgroundIndex === choices.backgroundIndex) return choices

  return {
    ...choices,
    backgroundIndex,
    backgroundAbilities: recommendedBackgroundAbilities(choices.classIndex, backgroundIndex),
    backgroundEquipmentOption: 0,
    skillProficiencies: recommendedSkills(choices.classIndex, backgroundIndex),
    skillExpertise: [],
  }
}

/**
 * Put the ability holding `position` and the one holding `target`'s number in
 * each other's places — how the scores step reassigns the array without ever
 * letting two abilities hold the same number.
 */
export function swapAbilityAssignment(
  assignment: readonly AbilityKey[],
  position: number,
  ability: AbilityKey,
): AbilityKey[] {
  const next = [...assignment]
  const current = next.indexOf(ability)
  if (position < 0 || position >= next.length || current === -1) return next

  ;[next[position], next[current]] = [next[current], next[position]]

  return next
}

/**
 * The wizard's choices as the character POST wants them.
 *
 * Level is fixed at 1 and is not a step: the whole flow is written for someone
 * making their first character, and the level planner (DND-032) is what a
 * character who has played uses. A player copying a level-5 build off paper
 * wants the one-page form at `/characters/[id]/edit`, which is exactly why that
 * form stayed.
 */
export function wizardFormValues(choices: WizardChoices): CharacterFormValues {
  const scores = finalAbilityScores(choices)
  const derived = derivedDefaults(choices)
  const spells = startingSpells(choices.classIndex, {
    cantrips: choices.cantripIndexes,
    level1: choices.levelOneSpellIndexes,
  })
  const background = BACKGROUNDS.get(choices.backgroundIndex)

  return {
    ...CHARACTER_FORM_DEFAULTS,
    name: choices.name.trim(),
    classIndex: choices.classIndex,
    speciesIndex: choices.speciesIndex,
    level: 1,
    ...scores,
    maxHitPoints: derived.maxHitPoints,
    armorClass: derived.armorClass,
    speed: derived.speed,
    knownSpellIndexes: spells.knownSpellIndexes,
    skillProficiencies: [...choices.skillProficiencies],
    // Held to its invariant here as well as on the wire: expertise ⊆
    // proficiencies (D21), and the Advanced picker is the only place either is
    // widened.
    skillExpertise: choices.skillExpertise.filter((skill) =>
      choices.skillProficiencies.includes(skill),
    ),
    backgroundIndex: choices.backgroundIndex || null,
    backgroundAbilitySpread: choices.backgroundIndex ? choices.backgroundAbilitySpread : null,
    backgroundAbilities: choices.backgroundIndex ? [...choices.backgroundAbilities] : null,
    originFeatIndex: background?.originFeat.index ?? null,
    // A 1st-level character has no subclass and no weapon mastery choices to
    // record beyond what the class hands them; `normaliseOriginSelections`
    // would clear a subclass here anyway, so nothing pretends otherwise.
    subclassIndex: null,
    masteredWeaponIndexes: null,
  }
}

/** What the wizard sends `POST /api/characters` — the form values plus its own three. */
export function wizardCreateBody(
  choices: WizardChoices,
  campaignId: string | null,
): Record<string, unknown> {
  const spells = startingSpells(choices.classIndex, {
    cantrips: choices.cantripIndexes,
    level1: choices.levelOneSpellIndexes,
  })

  return {
    ...wizardFormValues(choices),
    preparedSpellIndexes: spells.preparedSpellIndexes,
    classEquipmentOption: choices.classEquipmentOption,
    backgroundEquipmentOption: choices.backgroundEquipmentOption,
    campaignId,
  }
}
