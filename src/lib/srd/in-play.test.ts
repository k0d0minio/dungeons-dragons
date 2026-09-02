// The lint pass on the authored "in play" copy (`guided-creation/inline-consequences`).
//
// This is not a test of behaviour — there is barely any behaviour to test. It is
// the thing that makes the copy a *contract*: every option the wizard can put in
// front of a first-time player has a line saying what picking it means at the
// table, and adding an option without one fails CI rather than shipping a card
// that is half-blank next to eleven that are not.
//
// It runs both ways. Every published index needs a line (nothing is missed), and
// every line needs a published index (nothing is orphaned) — so a species the
// SRD drops upstream takes its copy with it instead of leaving a key nobody can
// reach.
import { BACKGROUNDS } from './backgrounds'
import { CLASSES } from './classes'
import {
  ABILITY_IN_PLAY,
  BACKGROUND_IN_PLAY,
  CLASS_IN_PLAY,
  GEAR_IN_PLAY,
  SKILL_IN_PLAY,
  SPECIES_IN_PLAY,
  SPELL_IN_PLAY,
  WEAPON_GROUP_IN_PLAY,
} from './in-play'
import { SPECIES } from './species'
import { SPELLS } from './spells'
import { WEAPON_GROUPS, WEAPONS, weaponGroupOf } from './weapons'
import { ABILITIES, SKILLS } from '@/lib/characters/schema'
import {
  backgroundEquipmentOptions,
  classEquipmentOptions,
  curatedSpells,
  equipmentOptionInPlay,
} from '@/lib/characters/wizard'

/** Every table above, with the indexes the wizard is allowed to ask it for. */
const TABLES: { name: string; lines: Readonly<Record<string, string>>; indexes: string[] }[] = [
  { name: 'classes', lines: CLASS_IN_PLAY, indexes: [...CLASSES.indexes] },
  { name: 'species', lines: SPECIES_IN_PLAY, indexes: [...SPECIES.indexes] },
  { name: 'backgrounds', lines: BACKGROUND_IN_PLAY, indexes: [...BACKGROUNDS.indexes] },
  { name: 'skills', lines: SKILL_IN_PLAY, indexes: SKILLS.map((skill) => skill.index) },
  { name: 'abilities', lines: ABILITY_IN_PLAY, indexes: ABILITIES.map((ability) => ability.key) },
  { name: 'weapon groups', lines: WEAPON_GROUP_IN_PLAY, indexes: [...WEAPON_GROUPS] },
  {
    name: 'curated spells',
    lines: SPELL_IN_PLAY,
    // The set the spells step suggests, not the 339 the class lists hold: the
    // rest arrive behind an Advanced tap and deliberately carry no line.
    indexes: [
      ...new Set(
        CLASSES.indexes.flatMap((index) => {
          const curated = curatedSpells(index)
          return [...curated.cantrips, ...curated.level1]
        }),
      ),
    ].sort(),
  },
]

describe.each(TABLES)('every $name option says what it means in play', ({ lines, indexes }) => {
  it('has a line for every option the wizard can show', () => {
    expect(indexes.filter((index) => !lines[index])).toEqual([])
  })

  it('has no line for an option that no longer exists', () => {
    expect(Object.keys(lines).filter((key) => !indexes.includes(key))).toEqual([])
  })
})

describe('the house style', () => {
  const everyLine = [
    ...TABLES.flatMap((table) => Object.entries(table.lines)),
    ...Object.entries(GEAR_IN_PLAY),
  ]

  it('writes a sentence, not a fragment or an essay', () => {
    for (const [key, line] of everyLine) {
      // One or two short sentences: long enough to say something, short enough
      // to read on a phone without the card growing a scrollbar.
      expect([key, line.length >= 30 && line.length <= 140]).toEqual([key, true])
      expect([key, line.trim()]).toEqual([key, line])
      expect([key, /[.?]$/.test(line)]).toEqual([key, true])
      expect([key, /^[A-Z“]/.test(line)]).toEqual([key, true])
    }
  })

  it('uses the app’s typographic apostrophe, never the straight one', () => {
    for (const [key, line] of everyLine) {
      expect([key, line.includes("'")]).toEqual([key, false])
    }
  })

  it('never repeats a line between two options', () => {
    const seen = new Map<string, string>()

    for (const [key, line] of everyLine) {
      expect([key, seen.get(line) ?? null]).toEqual([key, null])
      seen.set(line, key)
    }
  })
})

describe('the copy is the app’s own words, not the SRD’s', () => {
  it('never reuses a sentence from the SRD entry it describes', () => {
    // Mechanics are not copyrightable and phrasing is: a line that has drifted
    // into quoting the entry it sits under is the failure mode this catches.
    for (const [index, line] of Object.entries(SPELL_IN_PLAY)) {
      const description = SPELLS.get(index)?.description ?? ''
      expect([index, description.includes(line)]).toEqual([index, false])
    }
  })
})

describe('starting gear, which is composed rather than authored', () => {
  it('puts every SRD weapon in exactly one of the four groups', () => {
    for (const weapon of WEAPONS.all) {
      expect([weapon.index, weaponGroupOf(weapon.index)]).toEqual([
        weapon.index,
        `${weapon.category}-${weapon.kind}`,
      ])
    }

    expect(weaponGroupOf('chain-mail')).toBeNull()
  })

  it('gives every gear bundle either class or background offers a line', () => {
    const options = [
      ...CLASSES.indexes.flatMap((index) => classEquipmentOptions(index)),
      ...BACKGROUNDS.indexes.flatMap((index) => backgroundEquipmentOptions(index)),
    ]

    // Not an empty list masquerading as coverage: every class and background in
    // SRD 5.2.1 offers at least one bundle.
    expect(options.length).toBeGreaterThanOrEqual(CLASSES.indexes.length)

    for (const option of options) {
      expect(equipmentOptionInPlay(option).length).toBeGreaterThan(0)
    }
  })

  it('describes a bundle by the weapon in it, and a purse by the purse', () => {
    // The Fighter's first bundle is armour and blades; its last is 155 GP.
    const fighter = classEquipmentOptions('fighter')

    expect(equipmentOptionInPlay(fighter[0])).toBe(WEAPON_GROUP_IN_PLAY['martial-melee'])
    expect(equipmentOptionInPlay(fighter[fighter.length - 1])).toBe(GEAR_IN_PLAY.goldInstead)
  })

  it('falls back to the tools line for a bundle carrying no weapon', () => {
    // The Acolyte walks in with calligraphy supplies, a holy symbol and a robe.
    expect(equipmentOptionInPlay(backgroundEquipmentOptions('acolyte')[0])).toBe(
      GEAR_IN_PLAY.noWeapon,
    )
  })
})
