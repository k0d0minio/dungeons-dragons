import type { Character } from '@/lib/db/schema'

import {
  hasAdjustedSpellSlots,
  hitPointsForLevel,
  levelChangeSchema,
  levelledSpellSlots,
  normaliseLevelChange,
  planHitPoints,
  spellAllowanceChanges,
  spellSlotsWouldChange,
} from './level-up'

const CHARACTER: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 4,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 26,
  currentHitPoints: 26,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  exhaustion: 0,
  hitDiceUsed: 0,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  skillProficiencies: [],
  skillExpertise: [],
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: [],
  concentration: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

/** The fixture with a few columns moved — a level-up's whole input surface. */
function character(overrides: Partial<Character> = {}): Character {
  return { ...CHARACTER, ...overrides }
}

describe('hitPointsForLevel', () => {
  it('takes the die average plus the Constitution modifier by default', () => {
    // A d6 averages 4; CON 14 is +2.
    expect(hitPointsForLevel(6, 14)).toBe(6)
    expect(hitPointsForLevel(12, 14)).toBe(9)
  })

  it('uses a roll when one is given, bounded by the die', () => {
    expect(hitPointsForLevel(6, 14, 1)).toBe(3)
    expect(hitPointsForLevel(6, 14, 6)).toBe(8)
    // A "9" on a d6 is not a roll that happened.
    expect(hitPointsForLevel(6, 14, 9)).toBe(8)
    expect(hitPointsForLevel(6, 14, 0)).toBe(3)
  })

  it('falls back to the average for an emptied roll field', () => {
    expect(hitPointsForLevel(8, 14, Number.NaN)).toBe(7)
  })

  it('never takes less than a hit point a level, however dumped Constitution is', () => {
    // CON 3 is −4, which would otherwise shrink a d6 wizard by a point a level.
    expect(hitPointsForLevel(6, 3)).toBe(1)
    expect(hitPointsForLevel(6, 3, 1)).toBe(1)
  })
})

describe('planHitPoints', () => {
  it('adds the average for each level gained', () => {
    const plan = planHitPoints(character(), 6)

    expect(plan.perLevel).toEqual([
      { level: 5, die: 6, hitPoints: 6 },
      { level: 6, die: 6, hitPoints: 6 },
    ])
    expect(plan.from).toBe(26)
    expect(plan.to).toBe(38)
    expect(plan.unknownHitDie).toBe(false)
  })

  it('uses the rolls the player typed, per level, when asked to', () => {
    const plan = planHitPoints(character(), 6, 'rolled', { 5: 1, 6: 6 })

    expect(plan.perLevel.map((entry) => entry.hitPoints)).toEqual([3, 8])
    expect(plan.to).toBe(37)
  })

  it('falls back to the average for a level the player has not typed a roll for', () => {
    const plan = planHitPoints(character(), 6, 'rolled', { 5: 6 })

    expect(plan.perLevel.map((entry) => entry.hitPoints)).toEqual([8, 6])
  })

  it('takes the average back off when levelling down, and never below 1', () => {
    expect(planHitPoints(character(), 2).to).toBe(14)
    expect(planHitPoints(character({ maxHitPoints: 4 }), 1).to).toBe(1)
    // Nothing is "gained" on the way down, so there is nothing to roll for.
    expect(planHitPoints(character(), 2).perLevel).toEqual([])
  })

  it('leaves the maximum alone when the level has not moved', () => {
    expect(planHitPoints(character(), 4)).toEqual({
      from: 26,
      to: 26,
      perLevel: [],
      unknownHitDie: false,
    })
  })

  it('will not guess for a class with no hit die on record', () => {
    const plan = planHitPoints(character({ classIndex: 'homebrew-class' }), 8)

    expect(plan.to).toBe(26)
    expect(plan.unknownHitDie).toBe(true)
  })
})

describe('hasAdjustedSpellSlots', () => {
  it('is false for a sheet whose slots have never been set up', () => {
    expect(hasAdjustedSpellSlots(character({ spellSlots: {} }))).toBe(false)
  })

  it('is false when the stored maxima are exactly the standard table', () => {
    const slots = { '1': { max: 4, used: 2 }, '2': { max: 3, used: 0 } }

    expect(hasAdjustedSpellSlots(character({ spellSlots: slots }))).toBe(false)
  })

  it('is true when a maximum has been changed by hand', () => {
    const slots = { '1': { max: 5, used: 0 }, '2': { max: 3, used: 0 } }

    expect(hasAdjustedSpellSlots(character({ spellSlots: slots }))).toBe(true)
  })

  it('is true when a whole level has been added or removed by hand', () => {
    expect(hasAdjustedSpellSlots(character({ spellSlots: { '1': { max: 4, used: 0 } } }))).toBe(
      true,
    )
    expect(
      hasAdjustedSpellSlots(
        character({
          spellSlots: {
            '1': { max: 4, used: 0 },
            '2': { max: 3, used: 0 },
            '3': { max: 2, used: 0 },
          },
        }),
      ),
    ).toBe(true)
  })

  it('is true for an Eldritch Knight, whose third-caster slots no table here describes', () => {
    const knight = character({
      classIndex: 'fighter',
      level: 7,
      spellSlots: { '1': { max: 4, used: 0 }, '2': { max: 2, used: 0 } },
    })

    expect(hasAdjustedSpellSlots(knight)).toBe(true)
  })
})

describe('levelledSpellSlots', () => {
  it('gives a full caster the new level’s table, keeping what is already spent', () => {
    const wizard = character({
      spellSlots: { '1': { max: 4, used: 3 }, '2': { max: 3, used: 1 } },
    })

    expect(levelledSpellSlots(wizard, 5)).toEqual({
      '1': { max: 4, used: 3 },
      '2': { max: 3, used: 1 },
      '3': { max: 2, used: 0 },
    })
  })

  it('moves a warlock’s single pact pool up a slot level rather than adding one', () => {
    const warlock = character({
      classIndex: 'warlock',
      level: 5,
      spellSlots: { '3': { max: 2, used: 1 } },
    })

    // Two 3rd-level slots at 5th become two 4th-level slots at 7th — the 3rd
    // level pool is gone, not kept alongside.
    expect(levelledSpellSlots(warlock, 7)).toEqual({ '4': { max: 2, used: 0 } })
    // And more of them, still at one level, at 11th.
    expect(levelledSpellSlots(warlock, 11)).toEqual({ '5': { max: 3, used: 0 } })
  })

  it('clamps what is spent to a maximum that has just come down', () => {
    const wizard = character({
      level: 5,
      spellSlots: { '1': { max: 4, used: 4 }, '2': { max: 3, used: 2 }, '3': { max: 2, used: 2 } },
    })

    expect(levelledSpellSlots(wizard, 2)).toEqual({ '1': { max: 3, used: 3 } })
  })

  it('leaves a non-caster with nothing', () => {
    expect(levelledSpellSlots(character({ classIndex: 'fighter' }), 8)).toEqual({})
  })

  it('knows when the table has nothing new to say', () => {
    const wizard = character({
      level: 11,
      spellSlots: levelledSpellSlots(character({ classIndex: 'wizard', level: 11 }), 11),
    })

    // A full caster's 11th and 12th levels are the same row.
    expect(spellSlotsWouldChange(wizard, 12)).toBe(false)
    expect(spellSlotsWouldChange(wizard, 13)).toBe(true)
  })
})

describe('spellAllowanceChanges', () => {
  it('pairs the counts either side of a level change', () => {
    const bard = character({ classIndex: 'bard', level: 4 })

    expect(spellAllowanceChanges(bard, 5)).toEqual([
      { key: 'cantrips', label: 'Cantrips known', from: 3, to: 3 },
      { key: 'known', label: 'Spells known', from: 7, to: 8 },
    ])
  })

  it('reads a count the character does not have yet as zero', () => {
    const paladin = character({ classIndex: 'paladin', level: 1, charisma: 16 })

    expect(spellAllowanceChanges(paladin, 2)).toEqual([
      { key: 'prepared', label: 'Spells prepared', from: 0, to: 4 },
    ])
  })

  it('says nothing about a class that has no spells', () => {
    expect(spellAllowanceChanges(character({ classIndex: 'barbarian' }), 8)).toEqual([])
  })
})

describe('levelChangeSchema', () => {
  it('accepts a level and a maximum on their own', () => {
    expect(levelChangeSchema.safeParse({ level: 5, maxHitPoints: 32 }).success).toBe(true)
  })

  it('refuses a body that tries to smuggle in another column', () => {
    const parsed = levelChangeSchema.safeParse({
      level: 5,
      maxHitPoints: 32,
      currentHitPoints: 999,
    })

    expect(parsed.success).toBe(false)
  })

  it('refuses a level outside 1–20 and a slot level outside 1–9', () => {
    expect(levelChangeSchema.safeParse({ level: 21, maxHitPoints: 32 }).success).toBe(false)
    expect(levelChangeSchema.safeParse({ level: 0, maxHitPoints: 32 }).success).toBe(false)
    expect(
      levelChangeSchema.safeParse({
        level: 5,
        maxHitPoints: 32,
        spellSlots: { '10': { max: 1, used: 0 } },
      }).success,
    ).toBe(false)
  })
})

describe('normaliseLevelChange', () => {
  it('brings current hit points down with a maximum that has dropped', () => {
    const normalised = normaliseLevelChange(
      { level: 2, maxHitPoints: 14 },
      character({ currentHitPoints: 26 }),
    )

    expect(normalised.currentHitPoints).toBe(14)
  })

  it('leaves current hit points alone when the maximum only goes up', () => {
    const normalised = normaliseLevelChange(
      { level: 5, maxHitPoints: 32 },
      character({ currentHitPoints: 11 }),
    )

    expect(normalised.currentHitPoints).toBeUndefined()
  })

  it('drops empty slot pools and clamps what is spent', () => {
    const normalised = normaliseLevelChange(
      {
        level: 5,
        maxHitPoints: 32,
        spellSlots: { '1': { max: 0, used: 0 }, '2': { max: 2, used: 5 } },
      },
      character(),
    )

    expect(normalised.spellSlots).toEqual({ '2': { max: 2, used: 2 } })
  })

  it('drops duplicate spell indexes a hand-rolled request could send', () => {
    const normalised = normaliseLevelChange(
      { level: 5, maxHitPoints: 32, knownSpellIndexes: ['fireball', 'fireball', 'shield'] },
      character(),
    )

    expect(normalised.knownSpellIndexes).toEqual(['fireball', 'shield'])
  })

  it('leaves slots and spells untouched when the change does not name them', () => {
    const normalised = normaliseLevelChange({ level: 5, maxHitPoints: 32 }, character())

    expect(normalised.spellSlots).toBeUndefined()
    expect(normalised.knownSpellIndexes).toBeUndefined()
  })
})
