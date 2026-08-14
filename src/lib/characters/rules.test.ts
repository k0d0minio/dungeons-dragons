import {
  CLASS_SAVING_THROWS,
  CLASS_SKILL_OPTIONS,
  CONDITIONS,
  SKILLS,
  initiativeModifier,
  isKnownCondition,
  proficiencyBonus,
  savingThrowProficiencies,
  savingThrows,
  skillChecks,
  spellcastingKind,
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
  it('is the ability modifier, with no proficiency invented', () => {
    const skills = skillChecks(SCORES, 'wizard')

    // Arcana is INT-based and on the wizard list; the bonus stays +4 all the
    // same, because which skills were chosen is not stored.
    const arcana = skills.find((skill) => skill.index === 'arcana')
    expect(arcana).toMatchObject({ modifier: 4, classSkill: true })

    // Athletics is STR 8 → −1, and not a wizard skill.
    expect(skills.find((skill) => skill.index === 'athletics')).toMatchObject({
      modifier: -1,
      classSkill: false,
    })
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
