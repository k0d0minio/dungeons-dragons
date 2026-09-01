// Regenerates the local SRD 5.2.1 data modules in `src/lib/srd/data/`.
//
// Run manually (`node scripts/srd/build-srd-data.mjs`), never at build or
// request time — the whole point of the local data layer is that a species trait or a
// weapon's mastery property is on disk before the process starts, not one
// network round trip away while a DM is asking someone to roll.
//
// There are two upstreams, because no single one carries the whole SRD 5.2.1.
//
//  - `dnd5eapi.co/api/2024` — species, backgrounds, classes, subclasses,
//    conditions, feats, equipment and magic items. Transcribed from SRD 5.2.1
//    (CC-BY-4.0), with the eleven corrections recorded below.
//  - `api.open5e.com` filtered to the `srd-2024` document ("System Reference
//    Document 5.2" by Wizards of the Coast, CC-BY-4.0) — spells and monsters,
//    which dnd5eapi's 2024 namespace still does not have: `/api/2024/spells` is
//    a 404 and absent from its index, and `/api/2024/monsters` holds 3 of 300+.
//    Re-probed 2026-08-30; see `.icm/docs/2026-08-30-dnd5eapi-2024-coverage.md`.
//
// Both are transcriptions, so neither is trusted blind: every correction below
// is the value printed in the SRD 5.2.1 PDF, and `data.test.ts` asserts each one
// so a regeneration that silently picks an upstream value back up fails CI.
//
// The output is deliberately *not* upstream's shape: it is camelCase, it drops
// the `url`/`updated_at` plumbing, and it flattens references to bare indexes.
// A regeneration therefore cannot quietly change the app's data contract — if
// upstream restructures, this script stops mapping and fails loudly.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = 'https://www.dnd5eapi.co/api/2024'
const OPEN5E = 'https://api.open5e.com/v2'
// Everything read from Open5e is filtered to this document. Without it the API
// answers with Kobold Press and EN Publishing material, which is not SRD and
// must never enter the data layer.
const OPEN5E_DOCUMENT = 'srd-2024'
const OPEN5E_KEY_PREFIX = `${OPEN5E_DOCUMENT}_`
const OUT = path.join(process.cwd(), 'src/lib/srd/data')

const ABILITY_BY_ABBREVIATION = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
}

// Two species do not have a single size in SRD 5.2.1 — Human and Tiefling are
// each "Medium … or Small …, chosen when you select this species" (SRD 5.2.1,
// Species). Upstream flattens the Tiefling's to null and the Human's to
// "Medium"; both are wrong for a creation flow that has to offer the choice, so
// the SRD's own answer is restored here.
const SIZE_OVERRIDES = {
  human: 'Medium or Small',
  tiefling: 'Medium or Small',
}

const cache = new Map()

async function get(pathname) {
  if (cache.has(pathname)) return cache.get(pathname)
  const response = await fetch(`${BASE}${pathname}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'D&D-Companion-App/1.0' },
  })
  if (!response.ok) throw new Error(`GET ${pathname} -> ${response.status}`)
  const body = await response.json()
  cache.set(pathname, body)
  return body
}

async function listIndexes(collection) {
  const { results } = await get(`/${collection}`)
  return results.map((entry) => entry.index)
}

async function getAll(collection) {
  const indexes = await listIndexes(collection)
  const out = []
  for (const index of indexes) out.push(await get(`/${collection}/${index}`))
  return out
}

/**
 * Every row of an Open5e v2 collection for the SRD 5.2.1 document, following
 * `next` to the end. The list endpoints return whole records, so unlike
 * dnd5eapi this needs no per-entry follow-up request.
 */
async function getOpen5e(collection) {
  const out = []
  let url = `${OPEN5E}/${collection}/?document__key=${OPEN5E_DOCUMENT}&limit=200`
  while (url) {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'D&D-Companion-App/1.0' },
    })
    if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`)
    const body = await response.json()
    for (const row of body.results) {
      // Belt and braces on the document filter: a row from another publisher's
      // book is not SRD and cannot ship, so stop rather than quietly include it.
      if (row.document?.key !== OPEN5E_DOCUMENT)
        throw new Error(`${collection}/${row.key} is not ${OPEN5E_DOCUMENT}`)
      out.push(row)
    }
    url = body.next
  }
  return out
}

/** `srd-2024_fireball` -> `fireball`. Indexes are what character rows store. */
function open5eIndex(key) {
  if (!key.startsWith(OPEN5E_KEY_PREFIX)) throw new Error(`unexpected Open5e key "${key}"`)
  return key.slice(OPEN5E_KEY_PREFIX.length)
}

/** Upstream writes "\n  " where the SRD has a paragraph break. */
function text(value) {
  if (typeof value !== 'string') throw new Error(`expected a string, got ${typeof value}`)
  return value.replace(/\n\s+/g, '\n').trim()
}

function require(value, what) {
  if (value === undefined || value === null) throw new Error(`missing ${what}`)
  return value
}

function ability(abbreviation) {
  const key = ABILITY_BY_ABBREVIATION[String(abbreviation).toLowerCase()]
  if (!key) throw new Error(`unknown ability score "${abbreviation}"`)
  return key
}

function trait(entry, description) {
  const shaped = { index: entry.index, name: entry.name, description }
  if (typeof entry.level === 'number') shaped.level = entry.level
  return shaped
}

async function traitDescription(index) {
  return text(require((await get(`/traits/${index}`)).description, `traits/${index} description`))
}

// --- species -----------------------------------------------------------------

async function buildSpecies() {
  const species = await getAll('species')
  const out = []
  for (const entry of species) {
    const traits = []
    for (const ref of entry.traits) traits.push(trait(ref, await traitDescription(ref.index)))

    const lineages = []
    for (const ref of entry.subspecies ?? []) {
      const lineage = await get(`/subspecies/${ref.index}`)
      const lineageTraits = []
      for (const t of lineage.traits) lineageTraits.push(trait(t, await traitDescription(t.index)))
      lineages.push({
        index: lineage.index,
        // Upstream prefixes the species ("Elven Lineage: Drow"); the app shows
        // these under their species already, so the prefix is noise on a phone.
        name: lineage.name.includes(': ')
          ? lineage.name.split(': ').slice(1).join(': ')
          : lineage.name,
        traits: lineageTraits,
      })
    }

    out.push({
      index: entry.index,
      name: entry.name,
      creatureType: require(entry.type, `species/${entry.index} type`),
      size: SIZE_OVERRIDES[entry.index] ?? require(entry.size, `species/${entry.index} size`),
      speed: require(entry.speed, `species/${entry.index} speed`),
      traits,
      lineages,
    })
  }
  return out
}

// --- backgrounds -------------------------------------------------------------

// The Soldier's tool proficiency is a choice — "Choose one kind of Gaming Set"
// (SRD 5.2.1, Backgrounds) — and upstream drops the row rather than modelling
// it, leaving the background with no tool at all. Restored here as the category
// plus the SRD's own instruction, so a creation flow can offer the choice.
const BACKGROUND_TOOL_CORRECTIONS = {
  soldier: { index: 'gaming-set', name: 'Gaming Set', note: 'Choose one kind of Gaming Set' },
}

async function buildBackgrounds() {
  const backgrounds = await getAll('backgrounds')
  return backgrounds.map((entry) => {
    const skills = []
    let tool = null
    for (const proficiency of entry.proficiencies ?? []) {
      if (proficiency.index.startsWith('skill-')) {
        skills.push(proficiency.index.replace(/^skill-/, ''))
      } else if (proficiency.index.startsWith('tool-')) {
        tool = {
          index: proficiency.index.replace(/^tool-/, ''),
          name: proficiency.name.replace(/^Tool:\s*/, ''),
        }
      }
    }
    const equipment = (entry.equipment_options ?? [])
      .map((option) => option.desc)
      .filter(Boolean)
      .map(text)

    return {
      index: entry.index,
      name: entry.name,
      abilityScores: require(entry.ability_scores, `backgrounds/${entry.index} ability_scores`).map(
        (score) => ability(score.index),
      ),
      originFeat: {
        index: require(entry.feat, `backgrounds/${entry.index} feat`).index,
        name: entry.feat.name,
        ...(entry.feat.note ? { note: entry.feat.note } : {}),
      },
      skillProficiencies: skills,
      toolProficiency: BACKGROUND_TOOL_CORRECTIONS[entry.index] ?? tool,
      equipment,
    }
  })
}

// --- classes and subclasses --------------------------------------------------

const SUBCLASS_LEVEL = 3

// SRD 5.2.1 states the Monk's and Rogue's martial-weapon proficiency as a
// *rule*, not a list: "Martial weapons that have the Light property" (Monk) and
// "Martial weapons that have the Finesse or Light property" (Rogue). Upstream
// flattens each into an enumeration, and the Rogue's is wrong — it includes
// Longswords, which has neither property (its only one is Versatile). Flagged
// by `rules-chapters-2024` for whoever next touched this generator.
//
// Restored as the SRD's own sentence rather than a corrected enumeration,
// because the rule is what a player needs and a list would silently go stale if
// the weapon table ever changed. `data.test.ts` asserts both.
const CLASS_WEAPON_PROFICIENCY_CORRECTIONS = {
  monk: {
    replaces: ['scimitars', 'shortswords', 'hand-crossbows'],
    with: {
      index: 'martial-weapons-light',
      name: 'Martial weapons that have the Light property',
    },
  },
  rogue: {
    replaces: ['longswords', 'rapiers', 'scimitars', 'shortswords', 'whips', 'hand-crossbows'],
    with: {
      index: 'martial-weapons-finesse-or-light',
      name: 'Martial weapons that have the Finesse or Light property',
    },
  },
}

function classProficiencies(entry) {
  const listed = (entry.proficiencies ?? []).map((proficiency) => ({
    index: proficiency.index,
    name: proficiency.name,
  }))

  const correction = CLASS_WEAPON_PROFICIENCY_CORRECTIONS[entry.index]
  if (!correction) return listed

  const missing = correction.replaces.filter(
    (index) => !listed.some((proficiency) => proficiency.index === index),
  )
  if (missing.length > 0)
    throw new Error(`classes/${entry.index}: nothing to correct (${missing.join(', ')})`)

  // The rule takes the place of the first enumerated weapon, keeping the SRD's
  // order: armour, simple weapons, then the martial rule.
  const out = []
  let inserted = false
  for (const proficiency of listed) {
    if (!correction.replaces.includes(proficiency.index)) {
      out.push(proficiency)
      continue
    }
    if (!inserted) {
      out.push(correction.with)
      inserted = true
    }
  }
  return out
}

async function buildClassesAndSubclasses() {
  const classes = await getAll('classes')
  const subclasses = await getAll('subclasses')
  const features = await getAll('features')

  const shapedSubclasses = subclasses.map((entry) => ({
    index: entry.index,
    name: entry.name,
    classIndex: require(entry.class, `subclasses/${entry.index} class`).index,
    summary: entry.summary ? text(entry.summary) : null,
    description: text(require(entry.description, `subclasses/${entry.index} description`)),
    features: require(entry.features, `subclasses/${entry.index} features`)
      .map((feature) => ({
        name: feature.name,
        level: feature.level,
        description: text(feature.description),
      }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
  }))

  const shapedClasses = classes.map((entry) => {
    const skillChoices = (entry.proficiency_choices ?? [])
      .map((choice) => ({
        choose: choice.choose,
        description: choice.desc ? text(choice.desc) : null,
        from: (choice.from?.options ?? [])
          .map((option) => option.item?.index)
          .filter((index) => typeof index === 'string' && index.startsWith('skill-'))
          .map((index) => index.replace(/^skill-/, '')),
      }))
      .filter((choice) => choice.from.length > 0)

    const classFeatures = features
      // A subclass feature is filed upstream under its parent class as well, so
      // without this a plain Fighter would be shown the Champion's Improved
      // Critical. Subclass features live in `subclasses.json` instead.
      .filter((feature) => feature.class?.index === entry.index && !feature.subclass)
      .map((feature) => ({
        index: feature.index,
        name: feature.name,
        level: require(feature.level, `features/${feature.index} level`).name.split(' ').pop(),
        description: text(feature.description),
      }))
      .map((feature) => ({ ...feature, level: Number(feature.level) }))
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

    return {
      index: entry.index,
      name: entry.name,
      hitDie: require(entry.hit_die, `classes/${entry.index} hit_die`),
      primaryAbility: text(
        require(entry.primary_ability?.desc, `classes/${entry.index} primary_ability`),
      ),
      savingThrows: require(entry.saving_throws, `classes/${entry.index} saving_throws`).map(
        (save) => ability(save.index),
      ),
      skillChoices,
      proficiencies: classProficiencies(entry),
      startingEquipment: (entry.starting_equipment_options ?? [])
        .map((option) => option.desc)
        .filter(Boolean)
        .map(text),
      subclassLevel: SUBCLASS_LEVEL,
      subclasses: (entry.subclasses ?? []).map((subclass) => subclass.index),
      features: classFeatures,
    }
  })

  return { classes: shapedClasses, subclasses: shapedSubclasses }
}

// --- conditions, weapons, feats ---------------------------------------------

// Upstream paraphrases one line of the Charmed condition. Conditions are read at
// the table as rules text, and CC-BY covers the SRD's words rather than a
// summary of them, so the SRD 5.2.1 sentence is restored verbatim.
const CONDITION_CORRECTIONS = {
  charmed: [
    [
      'The charmer has Advantage on ability checks to interact socially with you.',
      'The charmer has Advantage on any ability check to interact with you socially.',
    ],
  ],
}

async function buildConditions() {
  return (await getAll('conditions')).map((entry) => {
    let description = text(require(entry.description, `conditions/${entry.index} description`))
    for (const [from, to] of CONDITION_CORRECTIONS[entry.index] ?? []) {
      if (!description.includes(from))
        throw new Error(`conditions/${entry.index}: nothing to correct`)
      description = description.replace(from, to)
    }
    return { index: entry.index, name: entry.name, description }
  })
}

function weaponCategory(entry) {
  const categories = new Set((entry.equipment_categories ?? []).map((category) => category.index))
  const rank = categories.has('martial-weapons')
    ? 'martial'
    : categories.has('simple-weapons')
      ? 'simple'
      : null
  const kind = categories.has('ranged-weapons')
    ? 'ranged'
    : categories.has('melee-weapons')
      ? 'melee'
      : null
  if (!rank || !kind) throw new Error(`equipment/${entry.index} is not categorised as a weapon`)
  return { category: rank, kind }
}

// Upstream's 2024 weapon rows disagree with the SRD 5.2.1 Weapons table in nine
// places — five prices, four physical stats, one damage type and one damage die.
// Each correction below is the value printed in that table (SRD 5.2.1, Weapons);
// `weapons.test.ts` asserts every one of them so a regeneration that silently
// picks upstream's number back up fails CI rather than reaching a character
// sheet. Costs are `{ quantity, unit }`, weights are pounds (`null` = the
// table's em dash).
const WEAPON_CORRECTIONS = {
  dart: { cost: { quantity: 5, unit: 'cp' } },
  'hand-crossbow': { cost: { quantity: 75, unit: 'gp' }, weight: 3 },
  javelin: { cost: { quantity: 5, unit: 'sp' } },
  longbow: { cost: { quantity: 50, unit: 'gp' } },
  mace: { weight: 4 },
  pike: { weight: 18 },
  sling: { damage: { dice: '1d4', type: 'bludgeoning' }, weight: null },
  spear: { cost: { quantity: 1, unit: 'gp' }, weight: 3 },
  trident: {
    damage: { dice: '1d8', type: 'piercing' },
    twoHandedDamage: { dice: '1d10', type: 'piercing' },
  },
}

async function buildWeapons() {
  // The `weapons` category is the only complete list upstream: the four
  // simple/martial × melee/ranged sub-categories are missing entries (the
  // longsword is absent from `martial-melee-weapons` but present here).
  const { equipment } = await get('/equipment-categories/weapons')
  const out = []
  for (const ref of equipment) {
    const entry = await get(`/equipment/${ref.index}`)
    const { category, kind } = weaponCategory(entry)
    out.push({
      index: entry.index,
      name: entry.name,
      category,
      kind,
      cost: require(entry.cost, `equipment/${entry.index} cost`),
      weight: entry.weight ?? null,
      damage: entry.damage
        ? { dice: entry.damage.damage_dice, type: entry.damage.damage_type.index }
        : null,
      twoHandedDamage: entry.two_handed_damage
        ? {
            dice: entry.two_handed_damage.damage_dice,
            type: entry.two_handed_damage.damage_type.index,
          }
        : null,
      range: entry.range ?? null,
      throwRange: entry.throw_range ?? null,
      ammunition: entry.ammunition?.index ?? null,
      properties: (entry.properties ?? []).map((property) => property.index),
      mastery: require(entry.mastery, `equipment/${entry.index} mastery`).index,
      ...(WEAPON_CORRECTIONS[entry.index] ?? {}),
    })
  }
  return out.sort((a, b) => a.index.localeCompare(b.index))
}

async function buildNamedDescriptions(collection) {
  return (await getAll(collection)).map((entry) => ({
    index: entry.index,
    name: entry.name,
    description: text(require(entry.description, `${collection}/${entry.index} description`)),
  }))
}

async function buildOriginFeats() {
  return (await getAll('feats'))
    .filter((entry) => entry.type === 'origin')
    .map((entry) => ({
      index: entry.index,
      name: entry.name,
      description: text(require(entry.description, `feats/${entry.index} description`)),
      repeatable: entry.repeatable ? text(entry.repeatable) : null,
    }))
}

// The general feats a character may take at an ASI level (4/8/12/16) in place of
// an ability score increase (`srd-2024-migration/asi-and-feats`). Same shape as
// the Origin feats — the SRD's 2024 data carries just two (`ability-score-
// improvement` and `grappler`).
async function buildGeneralFeats() {
  return (await getAll('feats'))
    .filter((entry) => entry.type === 'general')
    .map((entry) => ({
      index: entry.index,
      name: entry.name,
      description: text(require(entry.description, `feats/${entry.index} description`)),
      repeatable: entry.repeatable ? text(entry.repeatable) : null,
    }))
}

// --- spells ------------------------------------------------------------------

// Open5e stores the casting time as a slug; the SRD prints a phrase.
const CASTING_TIMES = {
  action: 'Action',
  'bonus-action': 'Bonus Action',
  reaction: 'Reaction',
  '1minute': '1 Minute',
  '10minutes': '10 Minutes',
  '1hour': '1 Hour',
}

// Open5e carries no description at all for Greater Invisibility — the field is
// null, not short — so the SRD 5.2.1 sentence is restored here (SRD 5.2.1,
// Spells). Applied only when upstream has nothing, so a later upstream fix wins
// rather than being overwritten; `data.test.ts` asserts every spell has text.
const SPELL_DESCRIPTION_FALLBACKS = {
  'greater-invisibility': 'A creature you touch has the Invisible condition until the spell ends.',
}

/** `until dispelled` -> `Until Dispelled`. The SRD prints these capitalised. */
function titleCase(value) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

/** `slot_level_8` -> `Level 8`; `player_level_5` -> `Character Level 5`. */
function castingOptionLabel(type) {
  const slot = /^slot_level_(\d+)$/.exec(type)
  if (slot) return `Level ${slot[1]}`
  const player = /^player_level_(\d+)$/.exec(type)
  if (player) return `Character Level ${player[1]}`
  return null
}

async function buildSpells() {
  const spells = await getOpen5e('spells')
  return spells
    .map((entry) => {
      const index = open5eIndex(entry.key)
      const components = []
      if (entry.verbal) components.push('V')
      if (entry.somatic) components.push('S')
      if (entry.material) components.push('M')

      // The SRD's damage-by-slot table. Upstream's `casting_options` carry only
      // the *higher* rows, so the spell's own level — which is `damage_roll`,
      // the number the SRD prints in the spell's body — is prepended. Without
      // it a player casting Fireball at level 3 would be told there is no
      // damage table for the level they actually chose.
      const scaledDamage = (entry.casting_options ?? [])
        .filter((option) => option.damage_roll)
        .map((option) => ({ label: castingOptionLabel(option.type), damage: option.damage_roll }))
        .filter((option) => option.label !== null)

      const baseDamageLabel = entry.level === 0 ? 'Character Level 1' : `Level ${entry.level}`
      const higherLevelDamage =
        entry.damage_roll && scaledDamage.length > 0
          ? [{ label: baseDamageLabel, damage: entry.damage_roll }, ...scaledDamage]
          : scaledDamage

      return {
        index,
        name: entry.name,
        level: require(entry.level, `spells/${index} level`),
        school: require(entry.school, `spells/${index} school`).key,
        castingTime: require(CASTING_TIMES[
          entry.casting_time
        ], `spells/${index} casting_time "${entry.casting_time}"`),
        // A Reaction spell prints the trigger beside the casting time.
        reactionCondition: entry.reaction_condition ? text(entry.reaction_condition) : null,
        range: text(require(entry.range_text, `spells/${index} range_text`)),
        components,
        material: entry.material_specified ? text(entry.material_specified) : null,
        duration: titleCase(text(require(entry.duration, `spells/${index} duration`))),
        concentration: Boolean(entry.concentration),
        ritual: Boolean(entry.ritual),
        description: text(
          require(entry.desc || SPELL_DESCRIPTION_FALLBACKS[index], `spells/${index} description`),
        ),
        higherLevel: entry.higher_level ? text(entry.higher_level) : null,
        higherLevelDamage,
        // Class indexes, matching `classes.json` — this is what the sheet's
        // spell list and the creation picker filter a class's spells by.
        classes: (entry.classes ?? []).map((cls) => open5eIndex(cls.key)).sort(),
        damageTypes: entry.damage_types ?? [],
        savingThrow: entry.saving_throw_ability || null,
        attackRoll: Boolean(entry.attack_roll),
      }
    })
    .sort((a, b) => a.index.localeCompare(b.index))
}

// --- monsters ----------------------------------------------------------------

// Open5e leaves `proficiency_bonus` null on every SRD 5.2.1 creature, but a 2024
// stat block prints one, and it is a pure function of Challenge Rating (SRD
// 5.2.1, Monsters — the Proficiency Bonus by CR table). Derived rather than
// dropped, so a DM reading a stat block at the table sees what the book shows.
function proficiencyBonusForCr(cr) {
  return 2 + Math.floor(Math.max(cr, 1) / 4.0001)
}

/** 0.125 -> `1/8`. The SRD prints fractional CRs as fractions. */
const CR_FRACTIONS = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }

function challengeRatingText(cr) {
  return CR_FRACTIONS[cr] ?? String(cr)
}

function namedEntries(actions, type) {
  return actions
    .filter((action) => action.action_type === type)
    .sort((a, b) => a.order_in_statblock - b.order_in_statblock)
    .map((action) => ({
      name: action.name,
      description: text(require(action.desc, `action ${action.name} desc`)),
    }))
}

async function buildMonsters() {
  const creatures = await getOpen5e('creatures')
  return creatures
    .map((entry) => {
      const index = open5eIndex(entry.key)
      const cr = require(entry.challenge_rating, `monsters/${index} challenge_rating`)
      const actions = entry.actions ?? []

      // `speed` is upstream's *printed* set — the walk speed plus whichever of
      // fly/swim/climb/burrow the stat block names. `speed_all` fills the rest
      // in with derived zeroes, which a stat block does not show.
      const speed = {}
      for (const [movement, distance] of Object.entries(entry.speed ?? {})) {
        if (movement === 'unit') continue
        if (movement === 'hover') {
          if (distance) speed.hover = true
          continue
        }
        if (typeof distance === 'number' && distance > 0) speed[movement] = distance
      }

      const immunities = entry.resistances_and_immunities ?? {}

      return {
        index,
        name: entry.name,
        size: require(entry.size, `monsters/${index} size`).name,
        type: require(entry.type, `monsters/${index} type`).name,
        alignment: entry.alignment || null,
        armorClass: require(entry.armor_class, `monsters/${index} armor_class`),
        armorDetail: entry.armor_detail || null,
        hitPoints: require(entry.hit_points, `monsters/${index} hit_points`),
        hitDice: entry.hit_dice || null,
        speed,
        abilityScores: require(entry.ability_scores, `monsters/${index} ability_scores`),
        modifiers: require(entry.modifiers, `monsters/${index} modifiers`),
        initiativeBonus: entry.initiative_bonus ?? null,
        // Only the saves that beat the bare modifier are proficient, and only
        // those are printed on a stat block.
        savingThrows: Object.fromEntries(
          Object.entries(entry.saving_throws ?? {}).filter(
            ([abilityKey, bonus]) => bonus !== entry.modifiers?.[abilityKey],
          ),
        ),
        skillBonuses: entry.skill_bonuses ?? {},
        passivePerception: entry.passive_perception ?? null,
        senses: {
          darkvision: entry.darkvision_range ?? null,
          blindsight: entry.blindsight_range ?? null,
          tremorsense: entry.tremorsense_range ?? null,
          truesight: entry.truesight_range ?? null,
        },
        languages: entry.languages?.as_string || null,
        challengeRating: cr,
        challengeRatingText: challengeRatingText(cr),
        experiencePoints: require(entry.experience_points, `monsters/${index} experience_points`),
        proficiencyBonus: proficiencyBonusForCr(cr),
        damageVulnerabilities: immunities.damage_vulnerabilities_display || null,
        damageResistances: immunities.damage_resistances_display || null,
        damageImmunities: immunities.damage_immunities_display || null,
        conditionImmunities: immunities.condition_immunities_display || null,
        traits: (entry.traits ?? []).map((entryTrait) => ({
          name: entryTrait.name,
          description: text(entryTrait.desc),
        })),
        actions: namedEntries(actions, 'ACTION'),
        bonusActions: namedEntries(actions, 'BONUS_ACTION'),
        reactions: namedEntries(actions, 'REACTION'),
        legendaryActions: namedEntries(actions, 'LEGENDARY_ACTION'),
      }
    })
    .sort((a, b) => a.index.localeCompare(b.index))
}

// --- magic items -------------------------------------------------------------

/**
 * Upstream slugs are almost always `[a-z0-9-]`, but not always: the Luckstone
 * arrives as `stone-of-good-luck-(luckstone)`. An index is a URL segment here
 * (`/api/srd/magic-items/{index}`) and the route rejects anything outside that
 * alphabet, so a bracket upstream would make the item unreachable rather than
 * merely ugly. `data.test.ts` asserts the alphabet across every collection.
 */
function slug(index) {
  return index
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function buildMagicItems() {
  return (await getAll('magic-items'))
    .map((entry) => ({
      index: slug(entry.index),
      name: entry.name,
      // `wondrous-items`, `rings`, `potions`, `weapons`, … — what the browser
      // groups by, and an index into `equipment-categories.json`.
      category: require(entry.equipment_category, `magic-items/${entry.index} category`).index,
      categoryName: entry.equipment_category.name,
      rarity: require(entry.rarity?.name, `magic-items/${entry.index} rarity`),
      // 2024 upstream models attunement as a flag. The 2014 data did not, which
      // is why the old detail view parsed "(requires attunement)" out of prose.
      attunement: Boolean(entry.attunement),
      variant: Boolean(entry.variant),
      variants: (entry.variants ?? []).map((variant) => slug(variant.index)),
      description: text(require(entry.desc, `magic-items/${entry.index} desc`)),
    }))
    .sort((a, b) => a.index.localeCompare(b.index))
}

// --- equipment ---------------------------------------------------------------

// The nine weapon corrections apply to the equipment rows as well: the Equipment
// tab and the Weapons table show the same Dart, and a Dart that costs 5 CP in
// one place and 5 GP in the other is worse than either being wrong alone.
// `data.test.ts` asserts the two agree.
const EQUIPMENT_CORRECTIONS = Object.fromEntries(
  Object.entries(WEAPON_CORRECTIONS).map(([index, correction]) => [
    index,
    {
      ...(correction.cost ? { cost: correction.cost } : {}),
      ...('weight' in correction ? { weight: correction.weight } : {}),
    },
  ]),
)

// Upstream files Hide Armor under `light-armor`. The SRD 5.2.1 Armor table
// prints it in the Medium Armor section — and upstream's own AC for it (12 +
// Dex, max 2) is the Medium rule, so only the category label is wrong. Left
// alone it would badge Hide as light armour in the Library while deriving its
// AC as medium; `data.test.ts` asserts the corrected category.
const EQUIPMENT_CATEGORY_CORRECTIONS = {
  'hide-armor': { 'light-armor': 'medium-armor' },
}

async function buildEquipment() {
  return (await getAll('equipment'))
    .map((entry) => ({
      index: entry.index,
      name: entry.name,
      categories: (entry.equipment_categories ?? []).map(
        (category) =>
          EQUIPMENT_CATEGORY_CORRECTIONS[entry.index]?.[category.index] ?? category.index,
      ),
      cost: entry.cost ?? null,
      weight: entry.weight ?? null,
      description: (entry.description ?? []).map(text).filter(Boolean),
      // The SRD's Utilize line: what the item can be used to do, and the check
      // it takes ("Identify a substance — DC 15 Intelligence").
      utilize: (entry.utilize ?? []).map((use) => ({
        name: use.name,
        ability: use.dc?.dc_type?.name ?? null,
        dc: use.dc?.dc_value ?? null,
      })),
      /** Table footnotes, e.g. the Lance's "Two-handed unless mounted". */
      notes: (entry.notes ?? []).map(text).filter(Boolean),
      armorClass: entry.armor_class
        ? {
            base: entry.armor_class.base,
            dexBonus: Boolean(entry.armor_class.dex_bonus),
            maxBonus: entry.armor_class.max_bonus ?? null,
          }
        : null,
      strengthMinimum: entry.str_minimum || null,
      stealthDisadvantage: entry.armor_class ? Boolean(entry.stealth_disadvantage) : null,
      donTime: entry.don_time ?? null,
      doffTime: entry.doff_time ?? null,
      contents: (entry.contents ?? []).map((item) => ({
        index: item.item.index,
        quantity: item.quantity,
      })),
      ...(EQUIPMENT_CORRECTIONS[entry.index] ?? {}),
    }))
    .sort((a, b) => a.index.localeCompare(b.index))
}

// --- main --------------------------------------------------------------------

async function write(name, data) {
  await writeFile(path.join(OUT, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  console.log(`${name}.json — ${Array.isArray(data) ? data.length : '?'} entries`)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const { classes, subclasses } = await buildClassesAndSubclasses()
  await write('species', await buildSpecies())
  await write('backgrounds', await buildBackgrounds())
  await write('classes', classes)
  await write('subclasses', subclasses)
  await write('conditions', await buildConditions())
  await write('weapons', await buildWeapons())
  await write('weapon-masteries', await buildNamedDescriptions('weapon-mastery-properties'))
  await write('weapon-properties', await buildNamedDescriptions('weapon-properties'))
  await write('origin-feats', await buildOriginFeats())
  await write('general-feats', await buildGeneralFeats())

  // The long tail: what the reference browser exists to serve
  // (`srd-2024-migration/long-tail-reference-data`).
  await write('spells', await buildSpells())
  await write('monsters', await buildMonsters())
  await write('magic-items', await buildMagicItems())
  await write('equipment', await buildEquipment())
}

await main()
