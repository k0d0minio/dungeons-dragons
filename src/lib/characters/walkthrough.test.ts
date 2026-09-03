// The one thing these tests exist to prove: a walkthrough never invents a
// number (`learn-to-play/roll-walkthroughs`).
//
// Two properties, checked over real SRD 5.2.1 data rather than fixtures:
//
// 1. **The total is the engine's.** Every `total` is compared against the same
//    function the character sheet prints from — `weaponAttack`, `unarmedStrike`,
//    `spellAttackBonus`, `spellSaveDc`, `skillChecks`, `savingThrows`.
// 2. **The breakdown adds up to it.** If the lines summed to something other
//    than the engine's answer, the explanation would be teaching arithmetic
//    that does not reach the number printed beside it — which is worse than no
//    explanation at all.
//
// Property 2 is the one that catches a future divergence: change how the engine
// derives a bonus and forget the walkthrough, and the sum stops matching.
import { SPELLS } from '@/lib/srd/spells'
import { WEAPONS } from '@/lib/srd/weapons'

import { spellAttackBonus, spellSaveDc, unarmedStrike, weaponAttack } from './attacks'
import { abilityModifier } from './display'
import { savingThrows, skillChecks, type AbilityKey } from './rules'
import {
  savingThrowWalkthrough,
  skillCheckWalkthrough,
  spellAttackWalkthrough,
  spellWalkthrough,
  unarmedStrikeWalkthrough,
  weaponAttackWalkthrough,
  type RollWalkthrough,
  type WalkthroughFields,
} from './walkthrough'

/** The sum of a breakdown — what the player is being told to add up. */
function sum(walkthrough: RollWalkthrough): number {
  return walkthrough.modifiers.reduce((total, line) => total + line.value, 0)
}

function character(overrides: Partial<WalkthroughFields> = {}): WalkthroughFields {
  return {
    classIndex: 'fighter',
    level: 5,
    exhaustion: 0,
    strength: 16,
    dexterity: 14,
    constitution: 14,
    intelligence: 10,
    wisdom: 12,
    charisma: 8,
    skillProficiencies: [],
    skillExpertise: [],
    ...overrides,
  }
}

function weapon(index: string) {
  const found = WEAPONS.get(index)
  if (!found) throw new Error(`no SRD weapon "${index}"`)
  return found
}

function spell(index: string) {
  const found = SPELLS.get(index)
  if (!found) throw new Error(`no SRD spell "${index}"`)
  return found
}

describe('weaponAttackWalkthrough', () => {
  it('takes its total from weaponAttack and breaks it down to the same number', () => {
    const fighter = character()
    const longsword = weapon('longsword')

    const walkthrough = weaponAttackWalkthrough(fighter, longsword)

    expect(walkthrough.total).toBe(weaponAttack(fighter, longsword).attackBonus)
    expect(sum(walkthrough)).toBe(walkthrough.total)
    // STR +3, proficiency +3 at level 5.
    expect(walkthrough.total).toBe(6)
  })

  it('says the d20 first, and names the target as their AC', () => {
    const walkthrough = weaponAttackWalkthrough(character(), weapon('longsword'))

    expect(walkthrough.die?.notation).toBe('d20')
    expect(walkthrough.target?.label).toBe("The target's Armour Class")
    // The DM holds the number: the sheet must not pretend to know it.
    expect(walkthrough.target?.value).toBeNull()
  })

  it('explains a finesse weapon as the choice it is, and takes the better score', () => {
    // DEX 18 beats STR 8, so a rapier is a Dexterity attack.
    const rogue = character({ classIndex: 'rogue', strength: 8, dexterity: 18 })
    const rapier = weapon('rapier')

    const walkthrough = weaponAttackWalkthrough(rogue, rapier)

    expect(walkthrough.total).toBe(weaponAttack(rogue, rapier).attackBonus)
    expect(sum(walkthrough)).toBe(walkthrough.total)
    expect(walkthrough.modifiers[0].label).toBe('Dexterity')
    expect(walkthrough.modifiers[0].why).toContain('Finesse')
  })

  it('explains a ranged weapon as Dexterity, without the finesse wording', () => {
    const ranger = character({ classIndex: 'ranger' })
    const bow = weapon('longbow')

    const walkthrough = weaponAttackWalkthrough(ranger, bow)

    expect(walkthrough.total).toBe(weaponAttack(ranger, bow).attackBonus)
    expect(walkthrough.modifiers[0].label).toBe('Dexterity')
    expect(walkthrough.modifiers[0].why).not.toContain('Finesse')
  })

  it('carries the exhaustion penalty as its own line, and still adds up', () => {
    const tired = character({ exhaustion: 3 })
    const longsword = weapon('longsword')

    const walkthrough = weaponAttackWalkthrough(tired, longsword)

    expect(walkthrough.total).toBe(weaponAttack(tired, longsword).attackBonus)
    expect(sum(walkthrough)).toBe(walkthrough.total)

    const line = walkthrough.modifiers.find((entry) => entry.label === 'Exhaustion')
    expect(line?.value).toBe(-6)
  })

  it('leaves the exhaustion line out entirely when there is none', () => {
    const walkthrough = weaponAttackWalkthrough(character(), weapon('longsword'))

    expect(walkthrough.modifiers.map((line) => line.label)).toEqual(['Strength', 'Proficiency'])
  })

  it('offers the versatile damage as a second line, from the engine row', () => {
    const fighter = character()
    const longsword = weapon('longsword')
    const attack = weaponAttack(fighter, longsword)

    const walkthrough = weaponAttackWalkthrough(fighter, longsword)
    const versatile = walkthrough.outcomes.find((entry) => entry.label === 'Held in two hands')

    expect(versatile?.dice).toBe(attack.versatileDamage)
    expect(walkthrough.outcomes.find((entry) => entry.label === 'On a hit')?.dice).toBe(
      attack.damage,
    )
  })

  it('names a mastery the class cannot use as a caveat, not as an outcome', () => {
    const wizard = character({ classIndex: 'wizard' })

    const walkthrough = weaponAttackWalkthrough(wizard, weapon('longsword'))

    expect(walkthrough.outcomes.some((entry) => entry.label.startsWith('Mastery'))).toBe(false)
    expect(walkthrough.notes.some((note) => note.includes('Weapon Mastery feature'))).toBe(true)
  })

  it('gives a mastery the class does have its own outcome line', () => {
    const walkthrough = weaponAttackWalkthrough(character(), weapon('longsword'))

    expect(walkthrough.outcomes.some((entry) => entry.label.startsWith('Mastery'))).toBe(true)
  })

  it('uses the item name the sheet shows, not the weapon table name', () => {
    const walkthrough = weaponAttackWalkthrough(
      character(),
      weapon('longsword'),
      "Grandfather's blade",
    )

    expect(walkthrough.title).toBe("Grandfather's blade")
  })
})

describe('unarmedStrikeWalkthrough', () => {
  it('takes its total from unarmedStrike and breaks it down to the same number', () => {
    const fighter = character()

    const walkthrough = unarmedStrikeWalkthrough(fighter)

    expect(walkthrough.total).toBe(unarmedStrike(fighter).attackBonus)
    expect(sum(walkthrough)).toBe(walkthrough.total)
  })

  it('quotes the engine grapple DC rather than working one out', () => {
    const fighter = character()
    const grapple = unarmedStrikeWalkthrough(fighter).outcomes.find((entry) =>
      entry.label.includes('Grapple'),
    )

    expect(grapple?.detail).toContain(`DC ${unarmedStrike(fighter).saveDc}`)
  })

  it('is flat damage, with no die attached to the hit', () => {
    const weak = character({ strength: 8 })
    const hit = unarmedStrikeWalkthrough(weak).outcomes.find((entry) => entry.label === 'On a hit')

    // 1 + (−1) = 0, and the engine floors it there.
    expect(hit?.detail).toContain('0 bludgeoning')
    expect(hit?.dice).toBeUndefined()
  })
})

describe('spellAttackWalkthrough', () => {
  it('takes its total from spellAttackBonus and breaks it down to the same number', () => {
    const wizard = character({ classIndex: 'wizard', intelligence: 18 })

    const walkthrough = spellAttackWalkthrough(wizard)

    expect(walkthrough?.total).toBe(spellAttackBonus(wizard))
    expect(walkthrough && sum(walkthrough)).toBe(walkthrough?.total)
    expect(walkthrough?.modifiers[0].label).toBe('Intelligence')
  })

  it('mentions the save DC the engine gives, for the spells that make others roll', () => {
    const wizard = character({ classIndex: 'wizard', intelligence: 18 })

    const walkthrough = spellAttackWalkthrough(wizard)

    expect(walkthrough?.notes.some((note) => note.includes(`${spellSaveDc(wizard)}`))).toBe(true)
  })

  it('is nothing at all for a class that casts nothing', () => {
    expect(spellAttackWalkthrough(character({ classIndex: 'fighter' }))).toBeNull()
  })
})

describe('spellWalkthrough', () => {
  const wizard = character({ classIndex: 'wizard', intelligence: 18, level: 5 })

  it('an attack-roll spell rolls the d20 against AC, on the engine bonus', () => {
    const walkthrough = spellWalkthrough(wizard, spell('fire-bolt'))

    expect(walkthrough.kind).toBe('spell-attack')
    expect(walkthrough.die?.notation).toBe('d20')
    expect(walkthrough.total).toBe(spellAttackBonus(wizard))
    expect(sum(walkthrough)).toBe(walkthrough.total)
    expect(walkthrough.target?.label).toBe("The target's Armour Class")
  })

  it('a save spell has the caster roll nothing, and prints the engine DC', () => {
    const walkthrough = spellWalkthrough(wizard, spell('fireball'), 3)

    expect(walkthrough.kind).toBe('spell-save')
    // The thing new players get wrong: on a save spell the caster picks up no die.
    expect(walkthrough.die).toBeNull()
    expect(walkthrough.total).toBe(spellSaveDc(wizard))
    expect(sum(walkthrough)).toBe(walkthrough.total)
    expect(walkthrough.target?.value).toBe(spellSaveDc(wizard))
    expect(walkthrough.target?.label).toBe('Their Dexterity saving throw')
  })

  it('says a save DC does not move with exhaustion, because the engine does not move it', () => {
    const tired = { ...wizard, exhaustion: 2 }

    const walkthrough = spellWalkthrough(tired, spell('fireball'), 3)

    expect(walkthrough.total).toBe(spellSaveDc(tired))
    expect(walkthrough.modifiers.some((line) => line.label === 'Exhaustion')).toBe(false)
  })

  it('reads the upcast damage off the SRD table for the slot actually chosen', () => {
    const fireball = spell('fireball')

    const atThree = spellWalkthrough(wizard, fireball, 3)
    const atFive = spellWalkthrough(wizard, fireball, 5)

    expect(atThree.outcomes.find((entry) => entry.label === 'Damage')?.dice).toBe('8d6 fire')
    expect(atFive.outcomes.find((entry) => entry.label === 'Damage at level 5')?.dice).toBe(
      '10d6 fire',
    )
  })

  it('tells a levelled cast which slot to mark off', () => {
    const walkthrough = spellWalkthrough(wizard, spell('fireball'), 4)
    const slot = walkthrough.outcomes.find((entry) => entry.label === 'Slot cost')

    expect(slot?.detail).toContain('level-4 spell slot')
  })

  it('tells a cantrip it costs nothing, whatever slot level is passed', () => {
    const walkthrough = spellWalkthrough(wizard, spell('fire-bolt'), 3)
    const slot = walkthrough.outcomes.find((entry) => entry.label === 'Slot cost')

    expect(slot?.detail).toContain('None')
  })

  it('reminds a concentration spell what concentration costs', () => {
    const walkthrough = spellWalkthrough(wizard, spell('hold-person'), 2)

    expect(walkthrough.outcomes.some((entry) => entry.label === 'Concentration')).toBe(true)
  })

  it('leaves the concentration line off a spell that does not need it', () => {
    const walkthrough = spellWalkthrough(wizard, spell('fireball'), 3)

    expect(walkthrough.outcomes.some((entry) => entry.label === 'Concentration')).toBe(false)
  })

  it('a spell with neither an attack nor a save has no roll and no total', () => {
    const cleric = character({ classIndex: 'cleric', wisdom: 16 })

    const walkthrough = spellWalkthrough(cleric, spell('cure-wounds'), 1)

    expect(walkthrough.kind).toBe('spell-effect')
    expect(walkthrough.die).toBeNull()
    // A "+0" here would invent a d20 test the spell does not have.
    expect(walkthrough.total).toBeNull()
    expect(walkthrough.modifiers).toEqual([])
  })

  it('notes the ritual option where the spell has one', () => {
    const walkthrough = spellWalkthrough(wizard, spell('detect-magic'), 1)

    expect(walkthrough.notes.some((note) => note.startsWith('Ritual'))).toBe(true)
  })
})

describe('skillCheckWalkthrough', () => {
  it('takes its total from skillChecks and breaks it down to the same number', () => {
    const rogue = character({
      classIndex: 'rogue',
      dexterity: 18,
      skillProficiencies: ['stealth'],
      skillExpertise: [],
    })

    const walkthrough = skillCheckWalkthrough(rogue, 'stealth')
    const engine = skillChecks(
      {
        strength: rogue.strength,
        dexterity: rogue.dexterity,
        constitution: rogue.constitution,
        intelligence: rogue.intelligence,
        wisdom: rogue.wisdom,
        charisma: rogue.charisma,
      },
      rogue.classIndex,
      rogue,
    ).find((skill) => skill.index === 'stealth')

    expect(walkthrough?.total).toBe(engine?.modifier)
    expect(walkthrough && sum(walkthrough)).toBe(walkthrough?.total)
  })

  it('calls expertise expertise, and doubles by the engine ladder', () => {
    const rogue = character({
      classIndex: 'rogue',
      dexterity: 18,
      skillProficiencies: ['stealth'],
      skillExpertise: ['stealth'],
    })

    const walkthrough = skillCheckWalkthrough(rogue, 'stealth')
    const line = walkthrough?.modifiers.find((entry) => entry.label === 'Expertise')

    // Level 5 proficiency is +3; expertise makes it +6.
    expect(line?.value).toBe(6)
    expect(sum(walkthrough as RollWalkthrough)).toBe(walkthrough?.total)
  })

  it('names Jack of All Trades where a bard gets it', () => {
    const bard = character({ classIndex: 'bard', charisma: 16 })

    const walkthrough = skillCheckWalkthrough(bard, 'arcana')
    const line = walkthrough?.modifiers.find((entry) => entry.label === 'Jack of All Trades')

    // Half of +3, rounded down.
    expect(line?.value).toBe(1)
    expect(sum(walkthrough as RollWalkthrough)).toBe(walkthrough?.total)
  })

  it('keeps a zero proficiency line rather than hiding it — "nothing, because" teaches', () => {
    const walkthrough = skillCheckWalkthrough(character(), 'arcana')
    const line = walkthrough?.modifiers.find((entry) => entry.label === 'Proficiency')

    expect(line?.value).toBe(0)
    expect(line?.why).toContain('not proficient')
  })

  it('leaves the DC to the DM', () => {
    const walkthrough = skillCheckWalkthrough(character(), 'athletics')

    expect(walkthrough?.target?.value).toBeNull()
    expect(walkthrough?.target?.label).toBe('The DC your DM sets')
  })

  it('is nothing at all for a skill SRD 5.2.1 does not have', () => {
    expect(skillCheckWalkthrough(character(), 'basket-weaving')).toBeNull()
  })
})

describe('savingThrowWalkthrough', () => {
  const engineSave = (fields: WalkthroughFields, ability: AbilityKey) =>
    savingThrows(
      {
        strength: fields.strength,
        dexterity: fields.dexterity,
        constitution: fields.constitution,
        intelligence: fields.intelligence,
        wisdom: fields.wisdom,
        charisma: fields.charisma,
      },
      fields.classIndex,
      fields.level,
      fields.exhaustion,
    ).find((save) => save.ability === ability)

  it('takes its total from savingThrows and breaks it down to the same number', () => {
    const fighter = character()

    const walkthrough = savingThrowWalkthrough(fighter, 'strength')

    expect(walkthrough?.total).toBe(engineSave(fighter, 'strength')?.modifier)
    expect(walkthrough && sum(walkthrough)).toBe(walkthrough?.total)
  })

  it('says out loud which saves the class is not proficient in', () => {
    const fighter = character()

    const proficient = savingThrowWalkthrough(fighter, 'strength')
    const not = savingThrowWalkthrough(fighter, 'charisma')

    expect(proficient?.modifiers[1].value).toBe(3)
    expect(not?.modifiers[1].value).toBe(0)
    expect(not?.modifiers[1].why).toContain('not proficient')
    expect(sum(not as RollWalkthrough)).toBe(not?.total)
  })

  it('carries exhaustion the way the engine does', () => {
    const tired = character({ exhaustion: 2 })

    const walkthrough = savingThrowWalkthrough(tired, 'constitution')

    expect(walkthrough?.total).toBe(engineSave(tired, 'constitution')?.modifier)
    expect(walkthrough && sum(walkthrough)).toBe(walkthrough?.total)
  })

  it('uses the ability modifier the engine would, not the raw score', () => {
    const walkthrough = savingThrowWalkthrough(character({ strength: 16 }), 'strength')

    expect(walkthrough?.modifiers[0].value).toBe(abilityModifier(16))
  })
})

describe('every walkthrough', () => {
  const all: RollWalkthrough[] = [
    weaponAttackWalkthrough(character(), weapon('longsword')),
    unarmedStrikeWalkthrough(character()),
    spellWalkthrough(character({ classIndex: 'wizard' }), spell('fireball'), 3),
    spellWalkthrough(character({ classIndex: 'wizard' }), spell('fire-bolt')),
    spellWalkthrough(character({ classIndex: 'cleric' }), spell('cure-wounds'), 1),
    skillCheckWalkthrough(character(), 'athletics') as RollWalkthrough,
    savingThrowWalkthrough(character(), 'dexterity') as RollWalkthrough,
  ]

  it('adds up to its own total wherever it claims one', () => {
    for (const walkthrough of all) {
      if (walkthrough.total === null) continue
      expect(sum(walkthrough)).toBe(walkthrough.total)
    }
  })

  it('always says what happens next', () => {
    for (const walkthrough of all) {
      expect(walkthrough.outcomes.length).toBeGreaterThan(0)
    }
  })

  it('gives every modifier line a reason, never a bare number', () => {
    for (const walkthrough of all) {
      for (const line of walkthrough.modifiers) {
        expect(line.why.length).toBeGreaterThan(0)
      }
    }
  })
})
