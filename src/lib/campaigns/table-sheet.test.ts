import { tableSheet, type TableSheetSource } from './table-sheet'

// A character sheet as the room may read it (`dm-run-suite/table-screen-cast`).
// The projection is the widest view of a character in the app — it answers to a
// token, not a session — so the test that matters most is the negative one: the
// list of what a cast sheet does *not* carry.

const VEX: TableSheetSource = {
  name: 'Vex Ashbrand',
  level: 5,
  speciesIndex: 'elf',
  classIndex: 'rogue',
  subclassIndex: 'thief',
  backgroundIndex: 'criminal',
  strength: 10,
  dexterity: 18,
  constitution: 14,
  intelligence: 12,
  wisdom: 13,
  charisma: 8,
  armorClass: 12,
  currentHitPoints: 21,
  maxHitPoints: 38,
  temporaryHitPoints: 3,
  speed: 30,
  conditions: ['prone'],
  exhaustion: 0,
  skillProficiencies: ['stealth', 'perception'],
  skillExpertise: ['stealth'],
}

const LEATHER = {
  index: 'leather-armor',
  name: 'Leather Armor',
  categories: ['armor', 'light-armor'],
  armorClass: { base: 11, dexBonus: true, maxBonus: null },
}

describe('tableSheet', () => {
  it('carries the front page of the paper sheet', () => {
    const sheet = tableSheet(VEX, [], null)

    expect(sheet.name).toBe('Vex Ashbrand')
    expect(sheet.speciesLabel).toBe('Elf')
    expect(sheet.classLabel).toBe('Rogue')
    expect(sheet.subclassLabel).toBe('Thief')
    expect(sheet.backgroundLabel).toBe('Criminal')
    expect(sheet.hitPoints).toEqual({ current: 21, max: 38, temp: 3 })
    expect(sheet.proficiencyBonus).toBe(3)
    expect(sheet.initiative).toBe(4)
    expect(sheet.speed).toBe(30)
    expect(sheet.abilities).toHaveLength(6)
    expect(sheet.savingThrows).toHaveLength(6)
    expect(sheet.skills).toHaveLength(18)
  })

  it('carries nothing that is the owner’s business', () => {
    // The safety property, written as an assertion rather than only as a
    // comment: a column added to the selection upstream would show up here.
    const sheet = tableSheet(VEX, [], null) as unknown as Record<string, unknown>

    for (const absent of [
      'gp',
      'cp',
      'sp',
      'ep',
      'pp',
      'items',
      'notes',
      'dmNotes',
      'ownerId',
      'experience',
      'knownSpellIndexes',
      'preparedSpellIndexes',
      'spellSlots',
      'classResources',
      'deathSaveSuccesses',
      'deathSaveFailures',
      'hitDiceUsed',
    ]) {
      expect(sheet).not.toHaveProperty(absent)
    }
  })

  it('derives armour class from what is worn, like the owner’s own sheet does', () => {
    // 11 base + 4 Dex, and the stored `armorClass` column of 12 is ignored the
    // moment body armour is equipped (DND-035).
    expect(tableSheet(VEX, [LEATHER], null).armorClass).toBe(15)
    expect(tableSheet(VEX, [], null).armorClass).toBe(12)
  })

  it('doubles proficiency where there is expertise, and says which is which', () => {
    const sheet = tableSheet(VEX, [], null)

    const stealth = sheet.skills.find((skill) => skill.label === 'Stealth')
    const perception = sheet.skills.find((skill) => skill.label === 'Perception')
    const arcana = sheet.skills.find((skill) => skill.label === 'Arcana')

    expect(stealth).toEqual({ label: 'Stealth', modifier: 10, proficient: true, expertise: true })
    expect(perception).toEqual({
      label: 'Perception',
      modifier: 4,
      proficient: true,
      expertise: false,
    })
    expect(arcana).toEqual({ label: 'Arcana', modifier: 1, proficient: false, expertise: false })
    expect(sheet.passivePerception).toBe(14)
  })

  it('prints what the character can actually do right now, exhaustion included', () => {
    // The columns hold the unexhausted numbers; a screen that printed those
    // beside a visible Exhaustion badge would be lying.
    const sheet = tableSheet({ ...VEX, exhaustion: 2 }, [], null)

    expect(sheet.speed).toBe(20)
    expect(sheet.initiative).toBe(0)
    expect(sheet.exhaustion).toBe(2)
    expect(sheet.passivePerception).toBe(10)
  })

  it('prints an index the SRD has never heard of as itself, never as blank', () => {
    const sheet = tableSheet({ ...VEX, speciesIndex: 'tabaxi', subclassIndex: null }, [], null)

    expect(sheet.speciesLabel).toBe('tabaxi')
    expect(sheet.subclassLabel).toBeNull()
  })

  it('says that there is a portrait, never where it lives', () => {
    const sheet = tableSheet(VEX, [], '2026-09-06T10:00:00.000Z')

    expect(sheet.portraitUploadedAt).toBe('2026-09-06T10:00:00.000Z')
    expect(JSON.stringify(sheet)).not.toContain('pathname')
  })
})
