import { CLASSES } from '@/lib/srd/classes'
import { CONDITIONS as SRD_CONDITIONS } from '@/lib/srd/conditions'
import { WEAPONS } from '@/lib/srd/weapons'

import {
  ACTIONS,
  CLASS_HIT_DICE,
  CLASS_SAVING_THROWS,
  CLASS_SKILL_OPTIONS,
  CONDITIONS,
  HEROIC_INSPIRATION,
  MAX_EXHAUSTION_LEVEL,
  SKILLS,
  SUBCLASS_LEVEL,
  WEAPON_MASTERY_PROPERTIES,
  abilityScoresWithBackground,
  averageHitDieRoll,
  classSkillChoices,
  effectiveSpeed,
  exhaustionD20Penalty,
  featLevels,
  featLevelsBetween,
  featuresUpTo,
  hasSubclass,
  hasWeaponMastery,
  hitDie,
  initiativeModifier,
  isFeatLevel,
  isKnownCondition,
  MAX_FEAT_LEVELS,
  primaryAbilities,
  normaliseOriginSelections,
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
  subclassLevelFor,
  subclassOptions,
  weaponMastery,
  weaponMasteryCount,
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

/** Every class the SRD data ships, for the "no row is missing" sweeps below. */
const CLASS_INDEXES = CLASSES.indexes

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
    for (const classIndex of CLASS_INDEXES) {
      expect([classIndex, CLASS_SAVING_THROWS[classIndex].length]).toEqual([classIndex, 2])
    }
  })

  it('takes 2 per exhaustion level off every save (2024)', () => {
    const saves = savingThrows(SCORES, 'wizard', 5, 2)

    // INT +4 +3 proficiency, then −4 for two levels of exhaustion.
    expect(saves.find((save) => save.ability === 'intelligence')?.modifier).toBe(3)
    // The penalty is not limited to proficient saves.
    expect(saves.find((save) => save.ability === 'dexterity')?.modifier).toBe(-1)
    // Proficiency itself is untouched — only the roll is.
    expect(saves.find((save) => save.ability === 'intelligence')?.proficient).toBe(true)
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

  it('takes 2 per exhaustion level off every check (2024)', () => {
    const selections = { level: 5, skillProficiencies: ['arcana'], skillExpertise: [] }

    const rested = skillChecks(SCORES, 'wizard', selections)
    const spent = skillChecks(SCORES, 'wizard', { ...selections, exhaustion: 3 })

    expect(rested.find((skill) => skill.index === 'arcana')?.modifier).toBe(7)
    expect(spent.find((skill) => skill.index === 'arcana')?.modifier).toBe(1)
    // Unproficient skills lose exactly the same amount.
    expect(spent.find((skill) => skill.index === 'history')?.modifier).toBe(-2)
  })

  it('covers all eighteen skills for any class', () => {
    expect(skillChecks(SCORES, 'homebrew-class')).toHaveLength(SKILLS.length)
    expect(SKILLS).toHaveLength(18)
  })

  it('only ever names skills that exist', () => {
    const known = new Set(SKILLS.map((skill) => skill.index))

    for (const [classIndex, options] of Object.entries(CLASS_SKILL_OPTIONS)) {
      expect([classIndex, options.length > 0]).toEqual([classIndex, true])

      for (const option of options) {
        expect([classIndex, option, known.has(option)]).toEqual([classIndex, option, true])
      }
    }
  })

  it('carries the SRD’s "choose N" alongside the flattened option list', () => {
    // A 2024 bard chooses any three; a rogue chooses four from eleven.
    expect(classSkillChoices('bard')[0]).toMatchObject({ choose: 3 })
    expect(CLASS_SKILL_OPTIONS.bard).toHaveLength(18)
    expect(classSkillChoices('rogue')[0]).toMatchObject({ choose: 4 })
    expect(classSkillChoices('homebrew-class')).toEqual([])
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

  it('includes exhaustion, which is a modifier that applies to the check', () => {
    expect(
      passivePerception(SCORES, 'fighter', {
        level: 5,
        skillProficiencies: ['perception'],
        skillExpertise: [],
        exhaustion: 2,
      }),
    ).toBe(10)
  })
})

describe('initiativeModifier', () => {
  it('is the Dexterity modifier', () => {
    expect(initiativeModifier(SCORES)).toBe(3)
  })

  it('is a D20 Test, so exhaustion drags it down too', () => {
    expect(initiativeModifier(SCORES, 1)).toBe(1)
    expect(initiativeModifier(SCORES, 4)).toBe(-5)
  })
})

describe('exhaustion (2024)', () => {
  it('is −2 per level to a d20 test, cumulative to six', () => {
    expect(exhaustionD20Penalty(0)).toBe(0)
    expect(exhaustionD20Penalty(1)).toBe(-2)
    expect(exhaustionD20Penalty(6)).toBe(-12)
    expect(MAX_EXHAUSTION_LEVEL).toBe(6)
  })

  it('takes 5 ft of speed per level, never below zero', () => {
    expect(effectiveSpeed(30)).toBe(30)
    expect(effectiveSpeed(30, 2)).toBe(20)
    expect(effectiveSpeed(30, 6)).toBe(0)
    // A slow character is stopped, not sent backwards.
    expect(effectiveSpeed(10, 5)).toBe(0)
  })
})

describe('conditions', () => {
  it('lists the fifteen SRD 5.2.1 conditions with a summary each', () => {
    expect(CONDITIONS).toHaveLength(15)
    expect(CONDITIONS.every((condition) => condition.summary.length > 0)).toBe(true)
  })

  it('carries a hand-written summary for every condition the data ships', () => {
    // A condition whose summary fell through to the full SRD prose would still
    // render, but as a paragraph in a chip — so the fallback is a failure here.
    for (const condition of CONDITIONS) {
      const srd = SRD_CONDITIONS.get(condition.index)
      expect([condition.index, condition.label]).toEqual([condition.index, srd?.name])
      expect([condition.index, condition.summary === srd?.description]).toEqual([
        condition.index,
        false,
      ])
    }
  })

  it('describes exhaustion as the 2024 rule rather than the old ladder', () => {
    const exhaustion = CONDITIONS.find((condition) => condition.index === 'exhaustion')

    expect(exhaustion?.summary).toContain('−2')
    expect(exhaustion?.summary).not.toContain('halved')
  })

  it('recognises its own indexes and nothing else', () => {
    expect(isKnownCondition('prone')).toBe(true)
    expect(isKnownCondition('on-fire')).toBe(false)
  })
})

describe('subclasses (2024: level 3, uniformly)', () => {
  it('gives every SRD class its subclass at level 3', () => {
    expect(SUBCLASS_LEVEL).toBe(3)

    for (const classIndex of CLASS_INDEXES) {
      expect([classIndex, subclassLevelFor(classIndex)]).toEqual([classIndex, 3])
      expect([classIndex, hasSubclass(classIndex, 2)]).toEqual([classIndex, false])
      expect([classIndex, hasSubclass(classIndex, 3)]).toEqual([classIndex, true])
    }
  })

  it('publishes exactly one subclass per class — the licensing boundary', () => {
    for (const classIndex of CLASS_INDEXES) {
      expect([classIndex, subclassOptions(classIndex).length]).toEqual([classIndex, 1])
    }

    expect(subclassOptions('fighter')[0]?.index).toBe('champion')
    expect(subclassOptions('homebrew-class')).toEqual([])
    expect(subclassLevelFor('homebrew-class')).toBeNull()
  })

  it('holds subclass features back until the subclass exists', () => {
    const champion = subclassOptions('fighter')[0].index

    const atSecond = featuresUpTo('fighter', champion, 2)
    expect(atSecond.some((feature) => feature.subclass)).toBe(false)

    const atThird = featuresUpTo('fighter', champion, 3)
    expect(atThird.some((feature) => feature.subclass)).toBe(true)
    // The class's own "Fighter Subclass" feature is at 3 too, and is not a
    // subclass feature — it is the class telling you to pick one.
    expect(
      atThird.some((feature) => feature.name === 'Fighter Subclass' && !feature.subclass),
    ).toBe(true)
  })

  it('lists class features alone for a character with no subclass chosen', () => {
    const features = featuresUpTo('wizard', null, 10)

    expect(features.length).toBeGreaterThan(0)
    expect(features.every((feature) => !feature.subclass)).toBe(true)
  })
})

describe('weapon mastery (2024)', () => {
  it('gives the five martial classes a count and everyone else none', () => {
    for (const classIndex of ['barbarian', 'fighter', 'paladin', 'ranger', 'rogue']) {
      expect([classIndex, hasWeaponMastery(classIndex)]).toEqual([classIndex, true])
    }

    for (const classIndex of ['bard', 'cleric', 'druid', 'monk', 'sorcerer', 'warlock', 'wizard']) {
      expect([classIndex, hasWeaponMastery(classIndex)]).toEqual([classIndex, false])
      expect([classIndex, weaponMasteryCount(classIndex, 20)]).toEqual([classIndex, null])
    }
  })

  it('follows the Barbarian and Fighter tables, and holds the rest at two', () => {
    // Barbarian: 2 at 1–3, 3 at 4–9, 4 from 10.
    expect([1, 3, 4, 9, 10, 20].map((level) => weaponMasteryCount('barbarian', level))).toEqual([
      2, 2, 3, 3, 4, 4,
    ])
    // Fighter: 3 at 1–3, 4 at 4–9, 5 at 10–15, 6 from 16.
    expect([1, 4, 10, 15, 16, 20].map((level) => weaponMasteryCount('fighter', level))).toEqual([
      3, 4, 5, 5, 6, 6,
    ])
    // Paladin, ranger and rogue have no Weapon Mastery column: two, always.
    for (const classIndex of ['paladin', 'ranger', 'rogue']) {
      for (const level of [1, 10, 20]) {
        expect([classIndex, level, weaponMasteryCount(classIndex, level)]).toEqual([
          classIndex,
          level,
          2,
        ])
      }
    }
  })

  it('has a mastery property for every SRD weapon, drawn from the eight', () => {
    const properties = new Set(WEAPON_MASTERY_PROPERTIES.map((mastery) => mastery.index))
    expect(properties.size).toBe(8)

    for (const weapon of WEAPONS.all) {
      const mastery = weaponMastery(weapon.index)
      expect([weapon.index, mastery !== null]).toEqual([weapon.index, true])
      expect([weapon.index, properties.has(mastery!.index)]).toEqual([weapon.index, true])
    }

    expect(weaponMastery('battleaxe')?.name).toBe('Topple')
    expect(weaponMastery('my-uncles-axe')).toBeNull()
  })
})

describe('the 2024 action list', () => {
  it('is the twelve of the Actions table', () => {
    expect(ACTIONS.map((action) => action.index)).toEqual([
      'attack',
      'dash',
      'disengage',
      'dodge',
      'help',
      'hide',
      'influence',
      'magic',
      'ready',
      'search',
      'study',
      'utilize',
    ])
    expect(ACTIONS.every((action) => action.summary.length > 0)).toBe(true)
  })

  it('has dropped the 2014 actions the revision folded away', () => {
    const indexes = new Set(ACTIONS.map((action) => action.index))

    for (const gone of ['cast-a-spell', 'use-an-object', 'grapple', 'shove']) {
      expect([gone, indexes.has(gone)]).toEqual([gone, false])
    }
  })
})

describe('heroic inspiration', () => {
  it('is a flag you either have or do not', () => {
    expect(HEROIC_INSPIRATION.max).toBe(1)
    expect(HEROIC_INSPIRATION.label).toBe('Heroic Inspiration')
    expect(HEROIC_INSPIRATION.summary).toMatch(/reroll/i)
  })
})

describe('ability scores from a background (2024)', () => {
  it('spends +2 and +1 among the background’s three abilities', () => {
    // Soldier: Strength, Dexterity, Constitution.
    expect(
      abilityScoresWithBackground(SCORES, 'soldier', 'two-and-one', ['strength', 'constitution']),
    ).toMatchObject({ strength: 10, constitution: 15, dexterity: 16 })
  })

  it('spends +1 to each on the other spread', () => {
    expect(
      abilityScoresWithBackground(SCORES, 'soldier', 'one-each', [
        'strength',
        'dexterity',
        'constitution',
      ]),
    ).toMatchObject({ strength: 9, dexterity: 17, constitution: 15 })
  })

  it('caps an increase at 20', () => {
    const nearly = { ...SCORES, intelligence: 19 }

    expect(
      abilityScoresWithBackground(nearly, 'sage', 'two-and-one', ['intelligence', 'wisdom']),
    ).toMatchObject({ intelligence: 20, wisdom: 13 })
  })

  it('applies nothing at all for a choice the background does not allow', () => {
    // Charisma is not one of the Soldier's three.
    expect(
      abilityScoresWithBackground(SCORES, 'soldier', 'two-and-one', ['strength', 'charisma']),
    ).toEqual(SCORES)
    // The same ability twice is not two increases.
    expect(
      abilityScoresWithBackground(SCORES, 'soldier', 'two-and-one', ['strength', 'strength']),
    ).toEqual(SCORES)
    // Wrong number of abilities for the spread.
    expect(abilityScoresWithBackground(SCORES, 'soldier', 'one-each', ['strength'])).toEqual(SCORES)
    // A background this build has never heard of.
    expect(
      abilityScoresWithBackground(SCORES, 'pirate', 'two-and-one', ['strength', 'dexterity']),
    ).toEqual(SCORES)
  })
})

describe('normaliseOriginSelections (srd-2024-migration/character-model-migration)', () => {
  /** A 5th-level fighter — three weapon masteries, and past the subclass level. */
  const FIGHTER = { classIndex: 'fighter', level: 5 }

  const SOLDIER = {
    backgroundIndex: 'soldier',
    backgroundAbilitySpread: 'two-and-one',
    backgroundAbilities: ['strength', 'constitution'],
    originFeatIndex: 'savage-attacker',
    subclassIndex: 'champion',
    masteredWeaponIndexes: ['longsword', 'greataxe'],
  }

  it('keeps a set that agrees with itself and with the class', () => {
    expect(normaliseOriginSelections(SOLDIER, FIGHTER)).toEqual(SOLDIER)
  })

  it('reads absent, blank and null as the same "not chosen"', () => {
    const none = {
      backgroundIndex: null,
      backgroundAbilitySpread: null,
      backgroundAbilities: null,
      originFeatIndex: null,
      subclassIndex: null,
      masteredWeaponIndexes: null,
    }

    expect(normaliseOriginSelections({}, FIGHTER)).toEqual(none)
    expect(
      normaliseOriginSelections(
        { backgroundIndex: '', originFeatIndex: '', masteredWeaponIndexes: [] },
        FIGHTER,
      ),
    ).toEqual(none)
  })

  it('drops the spread and its abilities with an unknown background', () => {
    const result = normaliseOriginSelections({ ...SOLDIER, backgroundIndex: 'pirate' }, FIGHTER)

    expect(result).toMatchObject({
      backgroundIndex: null,
      backgroundAbilitySpread: null,
      backgroundAbilities: null,
      // The feat is the character's, not the background's — it survives.
      originFeatIndex: 'savage-attacker',
    })
  })

  it('drops an ability choice the background does not offer', () => {
    // Charisma is not one of the Soldier's three.
    expect(
      normaliseOriginSelections(
        { ...SOLDIER, backgroundAbilities: ['strength', 'charisma'] },
        FIGHTER,
      ).backgroundAbilities,
    ).toBeNull()

    // Two abilities is not what `one-each` spends.
    expect(
      normaliseOriginSelections({ ...SOLDIER, backgroundAbilitySpread: 'one-each' }, FIGHTER)
        .backgroundAbilities,
    ).toBeNull()
  })

  it('drops a subclass that belongs to another class', () => {
    expect(
      normaliseOriginSelections({ ...SOLDIER, subclassIndex: 'thief' }, FIGHTER).subclassIndex,
    ).toBeNull()
  })

  it('drops a subclass the character is too low to have', () => {
    expect(
      normaliseOriginSelections(SOLDIER, { classIndex: 'fighter', level: 2 }).subclassIndex,
    ).toBeNull()
    expect(
      normaliseOriginSelections(SOLDIER, { classIndex: 'fighter', level: SUBCLASS_LEVEL })
        .subclassIndex,
    ).toBe('champion')
  })

  it('trims weapon masteries to what the class grants at that level', () => {
    const four = ['longsword', 'greataxe', 'shortbow', 'dagger']

    // A 1st-level fighter has three of them; a 4th-level one has four.
    expect(
      normaliseOriginSelections(
        { masteredWeaponIndexes: four },
        { classIndex: 'fighter', level: 1 },
      ).masteredWeaponIndexes,
    ).toEqual(['longsword', 'greataxe', 'shortbow'])
    expect(
      normaliseOriginSelections(
        { masteredWeaponIndexes: four },
        { classIndex: 'fighter', level: 4 },
      ).masteredWeaponIndexes,
    ).toEqual(four)
  })

  it('drops duplicates and things that are not weapons', () => {
    expect(
      normaliseOriginSelections(
        { masteredWeaponIndexes: ['longsword', 'longsword', 'topple', 'plate-armor'] },
        FIGHTER,
      ).masteredWeaponIndexes,
    ).toEqual(['longsword'])
  })

  it('gives a class without the feature no masteries at all', () => {
    expect(
      normaliseOriginSelections(
        { masteredWeaponIndexes: ['longsword'] },
        { classIndex: 'wizard', level: 20 },
      ).masteredWeaponIndexes,
    ).toBeNull()
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

  it('starts a half caster at 1st level now, on the half-level table (2024)', () => {
    // The 2024 Paladin and Ranger both take Spellcasting at level 1.
    expect(standardSpellSlots('paladin', 1)).toEqual({ '1': { max: 2, used: 0 } })
    expect(standardSpellSlots('ranger', 2)).toEqual({ '1': { max: 2, used: 0 } })
    expect(standardSpellSlots('paladin', 3)).toEqual({ '1': { max: 3, used: 0 } })
    // A level 5 half caster casts as a level 3 full caster: four 1st, two 2nd.
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
    expect(Object.keys(CLASS_HIT_DICE).sort()).toEqual([...CLASS_INDEXES].sort())
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
  it('gives a 2024 caster cantrips and a prepared count, never "spells known"', () => {
    // A level 5 bard: three cantrips, nine spells prepared.
    expect(spellAllowances('bard', 5)).toEqual([
      { key: 'cantrips', label: 'Cantrips known', count: 3 },
      { key: 'prepared', label: 'Spells prepared', count: 9 },
    ])
  })

  it('grows a wizard’s spellbook by two a level, prepared from the table', () => {
    expect(spellAllowances('wizard', 5)).toEqual([
      { key: 'cantrips', label: 'Cantrips known', count: 4 },
      { key: 'spellbook', label: 'Spells in the spellbook', count: 14 },
      { key: 'prepared', label: 'Spells prepared', count: 9 },
    ])
  })

  it('gives a half caster a prepared count from 1st level, and no cantrips', () => {
    expect(spellAllowances('paladin', 1)).toEqual([
      { key: 'prepared', label: 'Spells prepared', count: 2 },
    ])
    expect(spellAllowances('ranger', 1)).toEqual([
      { key: 'prepared', label: 'Spells prepared', count: 2 },
    ])
    expect(spellAllowances('paladin', 5)).toEqual([
      { key: 'prepared', label: 'Spells prepared', count: 6 },
    ])
  })

  it('does not move when an ability score does — the 2024 count is by level', () => {
    // The 2014 rule was "casting modifier + level"; the 2024 tables are fixed,
    // which is why `preparedSpellLimit` no longer takes ability scores at all.
    expect(preparedSpellLimit('cleric', 5)).toBe(9)
    expect(preparedSpellLimit('druid', 5)).toBe(9)
    expect(preparedSpellLimit('wizard', 5)).toBe(9)
  })

  it('gives a non-caster nothing at all', () => {
    expect(spellAllowances('fighter', 20)).toEqual([])
    expect(spellAllowances('homebrew-class', 20)).toEqual([])
    expect(spellcastingAbility('warlock')).toBe('charisma')
    expect(spellcastingAbility('barbarian')).toBeNull()
  })

  it('has a twenty-row table for every class that casts', () => {
    const casters = CLASS_INDEXES.filter((classIndex) => spellcastingAbility(classIndex) !== null)
    expect(casters).toHaveLength(8)

    for (const classIndex of casters) {
      for (let level = 1; level <= 20; level += 1) {
        // A nineteen-row table would hand a 20th-level character `undefined`.
        expect([classIndex, level, typeof preparedSpellLimit(classIndex, level)]).toEqual([
          classIndex,
          level,
          'number',
        ])

        for (const allowance of spellAllowances(classIndex, level)) {
          expect(allowance.count).toBeGreaterThan(0)
          expect(Number.isInteger(allowance.count)).toBe(true)
        }
      }
    }
  })

  it('never lets a prepared count fall as a character levels up', () => {
    const casters = CLASS_INDEXES.filter((classIndex) => spellcastingAbility(classIndex) !== null)

    for (const classIndex of casters) {
      for (let level = 2; level <= 20; level += 1) {
        const previous = preparedSpellLimit(classIndex, level - 1)!
        const current = preparedSpellLimit(classIndex, level)!

        expect([classIndex, level, current >= previous]).toEqual([classIndex, level, true])
      }
    }
  })
})

describe('spell preparation (DND-036, D22 — on the 2024 tables)', () => {
  it('makes every caster a preparer, with the wizard on their spellbook', () => {
    for (const classIndex of [
      'bard',
      'cleric',
      'druid',
      'paladin',
      'ranger',
      'sorcerer',
      'warlock',
    ]) {
      expect([classIndex, spellPreparationModel(classIndex)]).toEqual([classIndex, 'class-list'])
    }

    expect(spellPreparationModel('wizard')).toBe('spellbook')

    for (const nonCaster of ['barbarian', 'fighter', 'monk', 'rogue', 'homebrew']) {
      expect([nonCaster, spellPreparationModel(nonCaster)]).toEqual([nonCaster, null])
    }
  })

  it('matches the SRD Prepared Spells column at the levels it changes shape', () => {
    // Bard, cleric and druid share one column; sorcerer differs only at 1–2.
    expect([1, 2, 9, 12, 20].map((level) => preparedSpellLimit('bard', level))).toEqual([
      4, 5, 14, 16, 22,
    ])
    expect([1, 2, 3].map((level) => preparedSpellLimit('sorcerer', level))).toEqual([2, 4, 6])
    // The wizard's column pulls ahead from level 14.
    expect([13, 14, 20].map((level) => preparedSpellLimit('wizard', level))).toEqual([17, 18, 25])
    // Warlock and the half casters have columns of their own.
    expect([1, 10, 20].map((level) => preparedSpellLimit('warlock', level))).toEqual([2, 10, 15])
    expect([1, 9, 20].map((level) => preparedSpellLimit('ranger', level))).toEqual([2, 9, 15])
  })

  it('is null for a class with no spells', () => {
    expect(preparedSpellLimit('fighter', 5)).toBeNull()
    expect(preparedSpellLimit('homebrew-class', 5)).toBeNull()
  })

  it('agrees with the level-up summary’s prepared count', () => {
    const prepared = spellAllowances('wizard', 7).find((allowance) => allowance.key === 'prepared')

    expect(prepared?.count).toBe(preparedSpellLimit('wizard', 7))
  })
})

describe('feat levels (2024 Ability Score Improvements)', () => {
  it('gives every class 4th, 8th, 12th, 16th and 19th', () => {
    for (const characterClass of CLASSES.all) {
      expect([characterClass.index, featLevels(characterClass.index)]).toEqual([
        characterClass.index,
        expect.arrayContaining([4, 8, 12, 16, 19]),
      ])
    }
  })

  it('gives the Fighter 6th and 14th as well, and the Rogue 10th', () => {
    expect(featLevels('fighter')).toEqual([4, 6, 8, 12, 14, 16, 19])
    expect(featLevels('rogue')).toEqual([4, 8, 10, 12, 16, 19])
  })

  it('gives every other class exactly the five, in order', () => {
    for (const characterClass of CLASSES.all) {
      if (characterClass.index === 'fighter' || characterClass.index === 'rogue') continue

      expect([characterClass.index, featLevels(characterClass.index)]).toEqual([
        characterClass.index,
        [4, 8, 12, 16, 19],
      ])
    }
  })

  // A homebrew class on a sheet still levels up, and 4/8/12/16/19 is the rule
  // for all twelve — silently granting nothing is the failure that matters.
  it('falls back to the five every class shares for a class it does not know', () => {
    expect(featLevels('homebrew-class')).toEqual([4, 8, 12, 16, 19])
  })

  it('answers whether one level is a feat level', () => {
    expect(isFeatLevel('wizard', 4)).toBe(true)
    expect(isFeatLevel('wizard', 6)).toBe(false)
    expect(isFeatLevel('fighter', 6)).toBe(true)
    expect(isFeatLevel('rogue', 10)).toBe(true)
    expect(isFeatLevel('wizard', 10)).toBe(false)
  })

  it('lists the levels a change crosses, and nothing when it goes down', () => {
    expect(featLevelsBetween('wizard', 3, 4)).toEqual([4])
    expect(featLevelsBetween('wizard', 3, 12)).toEqual([4, 8, 12])
    expect(featLevelsBetween('fighter', 5, 14)).toEqual([6, 8, 12, 14])
    expect(featLevelsBetween('wizard', 4, 4)).toEqual([])
    expect(featLevelsBetween('wizard', 12, 3)).toEqual([])
    // The level you are on is already spent; the one you reach is not.
    expect(featLevelsBetween('wizard', 4, 8)).toEqual([8])
  })

  it('bounds the wire at the most feat levels any class has', () => {
    expect(MAX_FEAT_LEVELS).toBe(featLevels('fighter').length)
  })
})

describe('primaryAbilities', () => {
  it('parses every SRD class into ability keys', () => {
    for (const characterClass of CLASSES.all) {
      const { abilities } = primaryAbilities(characterClass.index)

      expect([characterClass.index, abilities.length > 0]).toEqual([characterClass.index, true])
    }
  })

  it('tells a choice between two abilities from a class that wants both', () => {
    expect(primaryAbilities('wizard')).toEqual({ abilities: ['intelligence'], join: 'single' })
    expect(primaryAbilities('fighter')).toEqual({
      abilities: ['strength', 'dexterity'],
      join: 'or',
    })
    expect(primaryAbilities('monk')).toEqual({ abilities: ['dexterity', 'wisdom'], join: 'and' })
  })

  it('has nothing to say about a class it does not know', () => {
    expect(primaryAbilities('homebrew-class')).toEqual({ abilities: [], join: 'single' })
  })
})
