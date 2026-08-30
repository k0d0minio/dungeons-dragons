// Regenerates the local SRD 5.2.1 data modules in `src/lib/srd/data/`.
//
// Run manually (`node scripts/srd/build-srd-data.mjs`), never at build or
// request time — the whole point of the local data layer is that a species trait or a
// weapon's mastery property is on disk before the process starts, not one
// network round trip away while a DM is asking someone to roll.
//
// Upstream is the `/api/2024` namespace of dnd5eapi.co, whose 2024 dataset is
// transcribed from SRD 5.2.1 (CC-BY-4.0). Only sets that namespace actually
// populates are read here; see `.icm/docs/2026-08-30-dnd5eapi-2024-coverage.md`
// for what it does not have and why the long tail is still on the 2014 proxy.
//
// The output is deliberately *not* upstream's shape: it is camelCase, it drops
// the `url`/`updated_at` plumbing, and it flattens references to bare indexes.
// A regeneration therefore cannot quietly change the app's data contract — if
// upstream restructures, this script stops mapping and fails loudly.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = 'https://www.dnd5eapi.co/api/2024'
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
      proficiencies: (entry.proficiencies ?? []).map((proficiency) => ({
        index: proficiency.index,
        name: proficiency.name,
      })),
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
}

await main()
