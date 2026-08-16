import {
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  CLASS_SKILL_OPTIONS,
  CONDITIONS,
  SKILLS,
  averageHitDieRoll,
  hitDie,
  initiativeModifier,
  isKnownCondition,
  passivePerception,
  preparedSpellLimit,
  proficiencyBonus,
  savingThrowProficiencies,
  savingThrows,
  skillChecks,
  spellAllowances,
  spellcastingAbility,
  spellcastingKind,
  spellPreparationModel,
  standardSpellSlots,
  type AbilityScores,
} from './rules'

const SCORES: AbilityScores = {
  strength: 8,
  dexterity: 16,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
}

describe('proficiencyBonus', () => {
  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])('is %i → +%i', (level, expected) => {
    expect(proficiencyBonus(level)).toBe(expected)
  })

  it('clamps a level outside 1–20 rather than extrapolating', () => {
    expect(proficiencyBonus(0)).toBe(2)
    expect(proficiencyBonus(99)).toBe(6)
  })
})

describe('savingThrows', () => {
  it('adds the proficiency bonus to exactly the class’s two saves', () => {
    const saves = savingThrows(SCORES, 'wizard', 5)
    const proficient = saves.filter((save) => save.proficient).map((save) => save.ability)

    expect(proficient).toEqual(['intelligence', 'wisdom'])
    // INT 18 → +4, plus a level 5 proficiency bonus of +3.
    expect(saves.find((save) => save.ability === 'intelligence')?.modifier).toBe(7)
    // DEX 16 → +3, unproficient.
    expect(saves.find((save) => save.ability === 'dexterity')?.modifier).toBe(3)
  })

  it('returns six unproficient saves for a class it does not know', () => {
    const saves = savingThrows(SCORES, 'artificer', 5)

    expect(saves).toHaveLength(6)
    expect(saves.every((save) => !save.proficient)).toBe(true)
    expect(savingThrowProficiencies('artificer')).toEqual([])
  })

  it('gives every SRD class exactly two save proficiencies', () => {
    for (const [classIndex, saves] of Object.entries(CLASS_SAVING_THROWS)) {
      expect([classIndex, saves.length]).toEqual([classIndex, 2])
    }
  })
})

describe('skillChecks', () => {
  it('is the bare ability modifier when no skill picks are supplied', () => {
    const skills = skillChecks(SCORES, 'wizard')

    // Arcana is INT-based and on the wizard list; without stored picks the
    // bonus stays +4 — no proficiency is invented.
    const arcana = skills.find((skill) => skill.index === 'arcana')
    expect(arcana).toMatchObject({ modifier: 4, classSkill: true, proficient: false })

    // Athletics is STR 8 → −1, and not a wizard skill.
    expect(skills.find((skill) => skill.index === 'athletics')).toMatchObject({
      modifier: -1,
      classSkill: false,
    })
  })

  it('adds the proficiency bonus to exactly the chosen skills (DND-015)', () => {
    const skills = skillChecks(SCORES, 'wizard', {
      level: 5,
      skillProficiencies: ['arcana'],
      skillExpertise: [],
    })

    // INT +4 with +3 proficiency at 5th level.
    expect(skills.find((skill) => skill.index === 'arcana')).toMatchObject({
      modifier: 7,
      proficient: true,
      expertise: false,
    })
    // History is INT too, but was not chosen.
    expect(skills.find((skill) => skill.index === 'history')).toMatchObject({
      modifier: 4,
      proficient: false,
    })
  })

  it('doubles the proficiency bonus for expertise (D21)', () => {
    const skills = skillChecks(SCORES, 'rogue', {
      level: 5,
      skillProficiencies: ['stealth', 'perception'],
      skillExpertise: ['stealth'],
    })

    // DEX +3 with double proficiency (+6).
    expect(skills.find((skill) => skill.index === 'stealth')).toMatchObject({
      modifier: 9,
      proficient: true,
      expertise: true,
    })
    // Proficient but no expertise: WIS +1 with +3.
    expect(skills.find((skill) => skill.index === 'perception')).toMatchObject({
      modifier: 4,
      expertise: false,
    })
  })

  it('gives a bard half proficiency everywhere from 2nd level — Jack of All Trades', () => {
    const selections = { skillProficiencies: ['performance'], skillExpertise: [] }

    // Level 1 bard: no Jack of All Trades yet, athletics stays STR −1.
    const atFirst = skillChecks(SCORES, 'bard', { level: 1, ...selections })
    expect(atFirst.find((skill) => skill.index === 'athletics')).toMatchObject({
      modifier: -1,
      proficient: false,
    })

    // Level 2 bard: +2 proficiency, half rounded down = +1 on unchosen skills.
    const atSecond = skillChecks(SCORES, 'bard', { level: 2, ...selections })
    expect(atSecond.find((skill) => skill.index === 'athletics')).toMatchObject({
      modifier: 0,
      proficient: false,
    })
    // Chosen skills still get the full bonus, not the half.
    expect(atSecond.find((skill) => skill.index === 'performance')).toMatchObject({
      modifier: 2,
      proficient: true,
    })

    // A non-bard never gets the half bonus.
    const fighter = skillChecks(SCORES, 'fighter', { level: 2, ...selections })
    expect(fighter.find((skill) => skill.index === 'athletics')?.modifier).toBe(-1)
  })

  it('does not stack expertise on top of Jack of All Trades or proficiency', () => {
    // Expertise is exactly 2× proficiency, not 2× + 1× or 2× + half.
    const skills = skillChecks(SCORES, 'bard', {
      level: 5,
      skillProficiencies: ['performance'],
      skillExpertise: ['performance'],
    })

    // CHA +0 with 2 × 3 = +6, nothing else.
    expect(skills.find((skill) => skill.index === 'performance')?.modifier).toBe(6)
  })

  it('covers all eighteen skills for any class', () => {
    expect(skillChecks(SCORES, 'homebrew-class')).toHaveLength(SKILLS.length)
    expect(SKILLS).toHaveLength(18)
  })

  it('only ever names skills that exist', () => {
    const known = new Set(SKILLS.map((skill) => skill.index))

    for (const [classIndex, options] of Object.entries(CLASS_SKILL_OPTIONS)) {
      for (const option of options) {
        expect([classIndex, option, known.has(option)]).toEqual([classIndex, option, true])
      }
    }
  })
})

describe('passivePerception', () => {
  it('is 10 plus the full Perception check bonus', () => {
    // WIS 12 → +1, unproficient: 11.
    expect(
      passivePerception(SCORES, 'fighter', {
        level: 5,
        skillProficiencies: [],
        skillExpertise: [],
      }),
    ).toBe(11)

    // Proficient at 5th level: 10 + 1 + 3.
    expect(
      passivePerception(SCORES, 'fighter', {
        level: 5,
        skillProficiencies: ['perception'],
        skillExpertise: [],
      }),
    ).toBe(14)

    // Expertise: 10 + 1 + 6.
    expect(
      passivePerception(SCORES, 'rogue', {
        level: 5,
        skillProficiencies: ['perception'],
        skillExpertise: ['perception'],
      }),
    ).toBe(17)
  })

  it('counts Jack of All Trades for an unproficient bard', () => {
    expect(
      passivePerception(SCORES, 'bard', { level: 2, skillProficiencies: [], skillExpertise: [] }),
    ).toBe(12)
  })
})

describe('initiativeModifier', () => {
  it('is the Dexterity modifier', () => {
    expect(initiativeModifier(SCORES)).toBe(3)
  })
})

describe('conditions', () => {
  it('lists the fifteen SRD conditions with a summary each', () => {
    expect(CONDITIONS).toHaveLength(15)
    expect(CONDITIONS.every((condition) => condition.summary.length > 0)).toBe(true)
  })

  it('recognises its own indexes and nothing else', () => {
    expect(isKnownCondition('prone')).toBe(true)
    expect(isKnownCondition('on-fire')).toBe(false)
  })
})

describe('standardSpellSlots', () => {
  it('gives a full caster the standard table', () => {
    expect(standardSpellSlots('wizard', 1)).toEqual({ '1': { max: 2, used: 0 } })
    expect(standardSpellSlots('cleric', 5)).toEqual({
      '1': { max: 4, used: 0 },
      '2': { max: 3, used: 0 },
      '3': { max: 2, used: 0 },
    })
    expect(standardSpellSlots('sorcerer', 20)['9']).toEqual({ max: 1, used: 0 })
  })

  it('starts a half caster at 2nd level, on the half-level table', () => {
    expect(standardSpellSlots('paladin', 1)).toEqual({})
    expect(standardSpellSlots('paladin', 2)).toEqual({ '1': { max: 2, used: 0 } })
    // A level 5 paladin casts as a level 3 full caster: four 1st, two 2nd.
    expect(standardSpellSlots('ranger', 5)).toEqual({
      '1': { max: 4, used: 0 },
      '2': { max: 2, used: 0 },
    })
    expect(standardSpellSlots('paladin', 20)).toEqual({
      '1': { max: 4, used: 0 },
      '2': { max: 3, used: 0 },
      '3': { max: 3, used: 0 },
      '4': { max: 3, used: 0 },
      '5': { max: 2, used: 0 },
    })
  })

  it('gives a warlock pact magic — a few slots, all at the highest level', () => {
    expect(standardSpellSlots('warlock', 1)).toEqual({ '1': { max: 1, used: 0 } })
    expect(standardSpellSlots('warlock', 5)).toEqual({ '3': { max: 2, used: 0 } })
    expect(standardSpellSlots('warlock', 20)).toEqual({ '5': { max: 4, used: 0 } })
  })

  it('gives a non-caster nothing to set up', () => {
    expect(standardSpellSlots('fighter', 10)).toEqual({})
    expect(standardSpellSlots('homebrew-class', 10)).toEqual({})
    expect(spellcastingKind('barbarian')).toBeNull()
    expect(spellcastingKind('bard')).toBe('full')
  })

  it('never suggests a slot level outside 1–9', () => {
    for (let level = 1; level <= 20; level += 1) {
      for (const classIndex of ['wizard', 'paladin', 'warlock']) {
        for (const slotLevel of Object.keys(standardSpellSlots(classIndex, level))) {
          expect(Number(slotLevel)).toBeGreaterThanOrEqual(1)
          expect(Number(slotLevel)).toBeLessThanOrEqual(9)
        }
      }
    }
  })
})

describe('hit dice', () => {
  it('knows every SRD class’s die', () => {
    expect(Object.keys(CLASS_HIT_DICE).sort()).toEqual(Object.keys(CLASS_SAVING_THROWS).sort())
    expect(hitDie('barbarian')).toBe(12)
    expect(hitDie('fighter')).toBe(10)
    expect(hitDie('rogue')).toBe(8)
    expect(hitDie('wizard')).toBe(6)
  })

  it('says nothing rather than guessing for a class it has never heard of', () => {
    expect(hitDie('homebrew-class')).toBeNull()
  })

  it('takes half the die plus one as the average, which is what 5e prints', () => {
    expect(averageHitDieRoll(6)).toBe(4)
    expect(averageHitDieRoll(8)).toBe(5)
    expect(averageHitDieRoll(10)).toBe(6)
    expect(averageHitDieRoll(12)).toBe(7)
  })
})

describe('spellAllowances', () => {
  it('gives a known caster the class table’s count', () => {
    // A level 5 bard: three cantrips, eight spells known.
    expect(spellAllowances('bard', 5, SCORES)).toEqual([
      { key: 'cantrips', label: 'Cantrips known', count: 3 },
      { key: 'known', label: 'Spells known', count: 8 },
    ])
  })

  it('grows a wizard’s spellbook by two a level and prepares INT + level', () => {
    // INT 18 → +4, so a level 5 wizard prepares nine and holds fourteen.
    expect(spellAllowances('wizard', 5, SCORES)).toEqual([
      { key: 'cantrips', label: 'Cantrips known', count: 4 },
      { key: 'spellbook', label: 'Spells in the spellbook', count: 14 },
      { key: 'prepared', label: 'Spells prepared', count: 9 },
    ])
  })

  it('prepares half a paladin’s level, and never fewer than one spell', () => {
    // CHA 10 → +0, so a level 5 paladin prepares two.
    expect(spellAllowances('paladin', 5, SCORES)).toEqual([
      { key: 'prepared', label: 'Spells prepared', count: 2 },
    ])
    expect(spellAllowances('paladin', 2, SCORES)).toEqual([
      { key: 'prepared', label: 'Spells prepared', count: 1 },
    ])
  })

  it('gives a paladin or ranger nothing at 1st level, where they do not cast', () => {
    expect(spellAllowances('paladin', 1, SCORES)).toEqual([])
    expect(spellAllowances('ranger', 1, SCORES)).toEqual([])
    expect(spellAllowances('ranger', 2, SCORES)).toEqual([
      { key: 'known', label: 'Spells known', count: 2 },
    ])
  })

  it('gives a non-caster nothing at all', () => {
    expect(spellAllowances('fighter', 20, SCORES)).toEqual([])
    expect(spellAllowances('homebrew-class', 20, SCORES)).toEqual([])
    expect(spellcastingAbility('warlock')).toBe('charisma')
    expect(spellcastingAbility('barbarian')).toBeNull()
  })

  it('has a twenty-row table for every class that has one', () => {
    for (const classIndex of ['bard', 'ranger', 'sorcerer', 'warlock', 'wizard', 'cleric']) {
      for (let level = 1; level <= 20; level += 1) {
        for (const allowance of spellAllowances(classIndex, level, SCORES)) {
          expect(allowance.count).toBeGreaterThan(0)
          expect(Number.isInteger(allowance.count)).toBe(true)
        }
      }
    }
  })
})

describe('spell preparation (DND-036, D22)', () => {
  it('splits the classes into class-list, spellbook and known-casters', () => {
    expect(spellPreparationModel('cleric')).toBe('class-list')
    expect(spellPreparationModel('druid')).toBe('class-list')
    expect(spellPreparationModel('paladin')).toBe('class-list')
    expect(spellPreparationModel('wizard')).toBe('spellbook')

    for (const knownCaster of ['bard', 'sorcerer', 'warlock', 'ranger', 'fighter', 'homebrew']) {
      expect(spellPreparationModel(knownCaster)).toBeNull()
    }
  })

  it('prepares casting modifier + level for cleric, druid and wizard', () => {
    // WIS 12 → +1 at level 5.
    expect(preparedSpellLimit('cleric', 5, SCORES)).toBe(6)
    expect(preparedSpellLimit('druid', 5, SCORES)).toBe(6)
    // INT 18 → +4.
    expect(preparedSpellLimit('wizard', 5, SCORES)).toBe(9)
  })

  it('prepares casting modifier + half level for a paladin, and none at 1st', () => {
    // CHA 10 → +0 at level 5.
    expect(preparedSpellLimit('paladin', 5, SCORES)).toBe(2)
    expect(preparedSpellLimit('paladin', 1, SCORES)).toBeNull()
  })

  it('never prepares fewer than one spell, however dumped the ability', () => {
    expect(preparedSpellLimit('cleric', 1, { ...SCORES, wisdom: 3 })).toBe(1)
  })

  it('is null for classes that do not prepare', () => {
    expect(preparedSpellLimit('bard', 5, SCORES)).toBeNull()
    expect(preparedSpellLimit('warlock', 5, SCORES)).toBeNull()
    expect(preparedSpellLimit('fighter', 5, SCORES)).toBeNull()
  })

  it('agrees with the level-up summary’s prepared count', () => {
    const prepared = spellAllowances('wizard', 7, SCORES).find((a) => a.key === 'prepared')

    expect(prepared?.count).toBe(preparedSpellLimit('wizard', 7, SCORES))
  })
})
