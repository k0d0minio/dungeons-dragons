import { BACKGROUNDS } from '@/lib/srd/backgrounds'
import { CLASSES } from '@/lib/srd/classes'
import { EQUIPMENT } from '@/lib/srd/equipment'
import { SPECIES } from '@/lib/srd/species'
import { spellsForClass } from '@/lib/srd/spells'

import { characterFormSchema } from './schema'
import {
  abilityScoresFromAssignment,
  backgroundEquipmentOptions,
  classCardOrder,
  classEquipmentOptions,
  classGuide,
  CLASS_GUIDES,
  curatedSpells,
  DEFAULT_CLASS_INDEX,
  derivedArmorClassColumn,
  derivedDefaults,
  derivedMaxHitPoints,
  derivedSpeed,
  startingArmorDetails,
  equipmentIndexFor,
  finalAbilityScores,
  recommendedAbilityAssignment,
  recommendedBackgroundAbilities,
  recommendedChoices,
  recommendedSkills,
  SKILL_PRIORITY,
  STANDARD_ARRAY,
  startingInventory,
  startingSpellCounts,
  startingSpells,
  stepsFor,
  swapAbilityAssignment,
  wizardCreateBody,
  wizardFormValues,
  withBackground,
  withClass,
  withSpecies,
  WIZARD_STEPS,
} from './wizard'
import { derivedArmorClass } from './attacks'
import { primaryAbilities, SKILLS, speciesHitPointBonus, type AbilityScores } from './rules'

const CLASS_INDEXES = CLASSES.all.map((entry) => entry.index)

describe('the guides behind the recommendations', () => {
  it('has one for every SRD class, and none for a class the SRD does not have', () => {
    expect(Object.keys(CLASS_GUIDES).sort()).toEqual([...CLASS_INDEXES].sort())
  })

  it('ranks all six abilities, without repeating one', () => {
    for (const index of CLASS_INDEXES) {
      const priority = CLASS_GUIDES[index].abilityPriority
      expect(new Set(priority).size).toBe(6)
    }
  })

  // The SRD's own Primary Ability line is the anchor: a guide that put a
  // wizard's 15 anywhere but Intelligence would be a recommendation this app
  // invented rather than one the rules support.
  it('opens each class on an ability the SRD calls primary', () => {
    for (const index of CLASS_INDEXES) {
      const { abilities } = primaryAbilities(index)
      expect(abilities).toContain(CLASS_GUIDES[index].abilityPriority[0])
    }
  })

  it('names a species and a background the SRD data carries', () => {
    for (const index of CLASS_INDEXES) {
      expect(SPECIES.has(CLASS_GUIDES[index].species)).toBe(true)
      expect(BACKGROUNDS.has(CLASS_GUIDES[index].background)).toBe(true)
    }
  })

  it('leads with the two lowest-cognitive-load classes', () => {
    expect(classCardOrder().slice(0, 2)).toEqual(['fighter', 'rogue'])
    expect(classCardOrder()).toHaveLength(CLASS_INDEXES.length)
  })

  it('falls back to the opening class for one the SRD does not carry', () => {
    const choices = recommendedChoices('artificer')

    expect(choices.classIndex).toBe('artificer')
    expect(choices.backgroundIndex).toBe(CLASS_GUIDES[DEFAULT_CLASS_INDEX].background)
  })

  it('opens on the class the research steers a hesitant player to', () => {
    expect(classGuide(DEFAULT_CLASS_INDEX)?.complexity).toBe('simple')
    expect(classGuide('nothing-like-this')).toBeNull()
  })
})

describe('steps', () => {
  it('drops the spells step for a class that casts nothing', () => {
    expect(stepsFor('fighter').map((step) => step.id)).not.toContain('spells')
    expect(stepsFor('wizard').map((step) => step.id)).toContain('spells')
    expect(stepsFor('wizard')).toHaveLength(WIZARD_STEPS.length)
  })

  it('asks the background before the scores it raises', () => {
    const ids = WIZARD_STEPS.map((step) => step.id)
    expect(ids.indexOf('background')).toBeLessThan(ids.indexOf('abilities'))
    // Mechanics before flavour: the name is last, whatever else moves.
    expect(ids[ids.length - 1]).toBe('identity')
  })
})

describe('the standard array', () => {
  it('pours the six numbers into the class priority order', () => {
    const scores = abilityScoresFromAssignment(recommendedAbilityAssignment('wizard'))

    expect(scores.intelligence).toBe(15)
    expect(Object.values(scores).sort((a, b) => b - a)).toEqual([...STANDARD_ARRAY])
  })

  it('falls back to sheet order for a class it has never heard of', () => {
    expect(recommendedAbilityAssignment('artificer')[0]).toBe('strength')
  })

  it('leaves an ability named twice on the lowest number rather than doubling one', () => {
    const scores = abilityScoresFromAssignment(['strength', 'strength'])

    expect(scores.strength).toBe(15)
    expect(scores.dexterity).toBe(8)
  })

  it('swaps two abilities rather than overwriting one', () => {
    const assignment = recommendedAbilityAssignment('fighter')
    const swapped = swapAbilityAssignment(assignment, 0, assignment[3])

    expect(swapped[0]).toBe(assignment[3])
    expect(swapped[3]).toBe(assignment[0])
    expect(new Set(swapped).size).toBe(6)
  })

  it('ignores a swap naming an ability that is not in the assignment', () => {
    const assignment = recommendedAbilityAssignment('fighter')
    expect(swapAbilityAssignment(assignment.slice(0, 2), 0, 'charisma')).toEqual(
      assignment.slice(0, 2),
    )
    expect(swapAbilityAssignment(assignment, 9, assignment[0])).toEqual(assignment)
  })
})

describe('the background’s ability increases', () => {
  it('spends the +2 and the +1 on the two the class wants most', () => {
    // Soldier raises Strength, Dexterity or Constitution; a fighter wants
    // Strength first and Constitution second.
    expect(recommendedBackgroundAbilities('fighter', 'soldier')).toEqual([
      'strength',
      'constitution',
    ])
  })

  it('has nothing to recommend for a background the SRD does not carry', () => {
    expect(recommendedBackgroundAbilities('fighter', 'space-marine')).toEqual([])
  })

  it('applies exactly once, on top of the array', () => {
    const choices = recommendedChoices('fighter')
    const base = abilityScoresFromAssignment(choices.abilityAssignment)
    const final = finalAbilityScores(choices)

    expect(final.strength).toBe(base.strength + 2)
    expect(final.constitution).toBe(base.constitution + 1)
    expect(final.charisma).toBe(base.charisma)
  })

  it('leaves manually entered scores as the base it adds to', () => {
    const choices = recommendedChoices('fighter')
    const manual = {
      strength: 12,
      dexterity: 12,
      constitution: 12,
      intelligence: 12,
      wisdom: 12,
      charisma: 12,
    }

    expect(finalAbilityScores({ ...choices, manualScores: manual }).strength).toBe(14)
  })

  it('adds nothing when no background has been chosen', () => {
    const choices = { ...recommendedChoices('fighter'), backgroundIndex: '' }

    expect(finalAbilityScores(choices)).toEqual(
      abilityScoresFromAssignment(choices.abilityAssignment),
    )
  })
})

describe('skills', () => {
  it('gives every class its background’s two plus its own count', () => {
    for (const index of CLASS_INDEXES) {
      const background = CLASS_GUIDES[index].background
      const granted = BACKGROUNDS.get(background)!.skillProficiencies
      const skills = recommendedSkills(index, background)

      for (const skill of granted) expect(skills).toContain(skill)
      expect(new Set(skills).size).toBe(skills.length)
    }
  })

  it('does not spend a class choice on a skill the background already granted', () => {
    // Soldier grants Athletics and Intimidation, both of which are also on the
    // fighter's own list — so the fighter still gets two picks of its own.
    expect(recommendedSkills('fighter', 'soldier')).toHaveLength(4)
  })

  it('still recommends the class’s skills without a background', () => {
    expect(recommendedSkills('wizard', '')).toHaveLength(2)
  })

  it('has nothing to recommend for a class the SRD does not carry', () => {
    expect(recommendedSkills('artificer', '')).toEqual([])
  })

  // `vibe-quiz` passes an emphasis: the skills the player's answers asked for
  // come out of the class's own list first, and a skill the class cannot take
  // is not made takeable by wanting it.
  it('takes the emphasised skills first, out of the class’s own list', () => {
    const emphasised = recommendedSkills('rogue', 'criminal', ['persuasion'])

    expect(emphasised).toContain('persuasion')
    expect(emphasised).toHaveLength(recommendedSkills('rogue', 'criminal').length)
  })

  it('ignores an emphasis on a skill the class does not offer', () => {
    expect(recommendedSkills('fighter', 'soldier', ['arcana'])).toEqual(
      recommendedSkills('fighter', 'soldier'),
    )
  })

  // The ranking is what breaks the tie inside a class's own option list, so a
  // skill missing from it would be picked last for no stated reason.
  it('ranks all eighteen skills', () => {
    expect(new Set(SKILL_PRIORITY)).toEqual(new Set(SKILLS.map((skill) => skill.index)))
  })
})

describe('starting spells', () => {
  it('suggests only spells the class can actually cast', () => {
    for (const index of CLASS_INDEXES) {
      const castable = new Set(spellsForClass(index).map((spell) => spell.index))
      const curated = curatedSpells(index)

      for (const spell of [...curated.cantrips, ...curated.level1]) {
        expect(castable.has(spell)).toBe(true)
      }
    }
  })

  it('suggests enough of each kind to fill what the class tables allow', () => {
    for (const index of CLASS_INDEXES) {
      const counts = startingSpellCounts(index)
      const curated = curatedSpells(index)

      expect(curated.cantrips.length).toBeGreaterThanOrEqual(counts.cantrips)
      expect(curated.level1.length).toBeGreaterThanOrEqual(
        Math.max(counts.spellbook, counts.prepared),
      )
    }
  })

  // Cantrips are known, never prepared — counting them against the prepared
  // limit would have every new caster's sheet open on "7 of 4 prepared".
  it('keeps cantrips out of the prepared list', () => {
    const choices = recommendedChoices('cleric')
    const spells = startingSpells('cleric', {
      cantrips: choices.cantripIndexes,
      level1: choices.levelOneSpellIndexes,
    })

    expect(spells.knownSpellIndexes).toEqual(choices.cantripIndexes)
    expect(spells.preparedSpellIndexes).toHaveLength(startingSpellCounts('cleric').prepared)
    for (const cantrip of choices.cantripIndexes) {
      expect(spells.preparedSpellIndexes).not.toContain(cantrip)
    }
  })

  it('puts a wizard’s book in the known list and prepares a subset of it', () => {
    const choices = recommendedChoices('wizard')
    const spells = startingSpells('wizard', {
      cantrips: choices.cantripIndexes,
      level1: choices.levelOneSpellIndexes,
    })
    const counts = startingSpellCounts('wizard')

    expect(spells.knownSpellIndexes).toHaveLength(counts.cantrips + counts.spellbook)
    expect(spells.preparedSpellIndexes).toHaveLength(counts.prepared)
    for (const prepared of spells.preparedSpellIndexes) {
      expect(spells.knownSpellIndexes).toContain(prepared)
    }
  })

  it('gives a non-caster neither list, whatever it is handed', () => {
    expect(startingSpells('fighter', { cantrips: ['fire-bolt'], level1: ['shield'] })).toEqual({
      knownSpellIndexes: [],
      preparedSpellIndexes: [],
    })
  })
})

describe('starting equipment', () => {
  it('splits every class’s SRD line into options with items or coin', () => {
    for (const index of CLASS_INDEXES) {
      const options = classEquipmentOptions(index)

      expect(options.length).toBeGreaterThanOrEqual(2)
      for (const option of options) {
        expect(option.items.length + option.gold).toBeGreaterThan(0)
      }
    }
  })

  it('reads the fighter’s three clauses, quantities and gold', () => {
    const [first, , third] = classEquipmentOptions('fighter')

    expect(first.label).toBe('A')
    expect(first.gold).toBe(4)
    expect(first.items).toContainEqual({
      equipmentIndex: 'javelin',
      name: 'Javelin',
      quantity: 8,
      equipped: false,
    })
    // The all-gold clause is a real option, not an empty one.
    expect(third).toEqual({ label: 'C', items: [], gold: 155 })
  })

  it('marks armour and shields as worn, and nothing else', () => {
    const [first] = classEquipmentOptions('cleric')
    const worn = first.items.filter((item) => item.equipped).map((item) => item.equipmentIndex)

    expect(worn).toEqual(['chain-shirt', 'shield'])
  })

  it('relabels the druid’s two clauses, which the SRD both calls “(a)”', () => {
    expect(classEquipmentOptions('druid').map((option) => option.label)).toEqual(['A', 'B'])
  })

  it('drops a background’s “Choose A or B:” lead-in', () => {
    const [first] = backgroundEquipmentOptions('criminal')

    expect(first.items[0]).toEqual({
      equipmentIndex: 'dagger',
      name: 'Dagger',
      quantity: 2,
      equipped: false,
    })
    expect(first.gold).toBe(16)
  })

  it('keeps something the SRD names but does not index, as a named item', () => {
    const [first] = classEquipmentOptions('sorcerer')
    const focus = first.items.find((item) => item.name.startsWith('Arcane Focus'))

    expect(focus?.equipmentIndex).toBeNull()
  })

  it('resolves plurals and typographic apostrophes to SRD indexes', () => {
    expect(equipmentIndexFor('Handaxes')).toBe('handaxe')
    expect(equipmentIndexFor('2 Pouches'.replace('2 ', ''))).toBe('pouch')
    expect(equipmentIndexFor('Dungeoneer’s Pack')).toBe('dungeoneer-pack')
    expect(equipmentIndexFor('Sword of Answering')).toBeNull()
  })

  it('adds the class’s and the background’s coin together', () => {
    const choices = recommendedChoices('fighter')
    const inventory = startingInventory(choices)

    // Fighter clause (a) is 4 gp, Soldier clause (A) is 14 gp.
    expect(inventory.gold).toBe(18)
    expect(inventory.items.some((item) => item.equipmentIndex === 'chain-mail')).toBe(true)
  })

  it('falls back to the first clause when a stale draft names one that is gone', () => {
    const choices = { ...recommendedChoices('wizard'), classEquipmentOption: 7 }

    expect(startingInventory(choices).items).toEqual(
      startingInventory({ ...choices, classEquipmentOption: 0 }).items,
    )
  })

  it('offers nothing for a class or background the SRD data does not carry', () => {
    expect(classEquipmentOptions('artificer')).toEqual([])
    expect(backgroundEquipmentOptions('space-marine')).toEqual([])
  })

  it('gives a character with no background only what their class hands out', () => {
    const choices = { ...recommendedChoices('fighter'), backgroundIndex: '' }

    expect(startingInventory(choices).gold).toBe(4)
  })

  it('stores a resolved item by index and an unresolved one by name', () => {
    const { items } = startingInventory(recommendedChoices('sorcerer'))
    const spear = items.find((item) => item.equipmentIndex === 'spear')
    const focus = items.find((item) => item.customName?.startsWith('Arcane Focus'))

    expect(spear?.customName).toBeNull()
    expect(focus?.equipmentIndex).toBeNull()
  })
})

describe('derived numbers', () => {
  describe('hit points, per class and species', () => {
    it('gives a 1st-level character the whole hit die plus their Constitution', () => {
      expect(derivedMaxHitPoints('barbarian', 'human', 14)).toBe(14)
      expect(derivedMaxHitPoints('wizard', 'human', 8)).toBe(5)
      // A class the data has never heard of gets a d8 rather than nothing.
      expect(derivedMaxHitPoints('artificer', 'human', 10)).toBe(8)
      // Never below one, however punishing the Constitution.
      expect(derivedMaxHitPoints('wizard', 'human', 1)).toBe(1)
    })

    it('adds the hit point Dwarven Toughness grants, and only for a dwarf', () => {
      expect(derivedMaxHitPoints('wizard', 'dwarf', 8)).toBe(6)
      // Above the floor as well as below it: a dwarf with Constitution 1 has 2.
      expect(derivedMaxHitPoints('wizard', 'dwarf', 1)).toBe(2)
      expect(derivedMaxHitPoints('wizard', 'goliath', 8)).toBe(5)
      expect(derivedMaxHitPoints('wizard', 'kobold', 8)).toBe(5)
    })

    it('is the class’s die plus the species’ bonus for all 108 combinations', () => {
      for (const characterClass of CLASSES.all) {
        for (const species of SPECIES.all) {
          const hitPoints = derivedMaxHitPoints(characterClass.index, species.index, 14)

          expect(hitPoints).toBe(characterClass.hitDie + 2 + speciesHitPointBonus(species.index))
          expect(hitPoints).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('the stored armour class column', () => {
    const scores: AbilityScores = {
      strength: 10,
      dexterity: 14,
      constitution: 16,
      intelligence: 10,
      wisdom: 12,
      charisma: 10,
    }

    it('is the unarmoured number, leaving the sheet to derive the rest', () => {
      expect(derivedArmorClassColumn('fighter', scores)).toBe(12)
    })

    it('carries a barbarian’s and a monk’s Unarmored Defense into the column', () => {
      // The number for the day they take the armour off — Constitution 16 is
      // +3 for the barbarian, Wisdom 12 is +1 for the monk.
      expect(derivedArmorClassColumn('barbarian', scores)).toBe(15)
      expect(derivedArmorClassColumn('monk', scores)).toBe(13)
    })

    it('ignores body armour, which the sheet derives from instead', () => {
      const chainMail = EQUIPMENT.get('chain-mail')!

      expect(
        derivedArmorClassColumn('fighter', scores, [
          {
            index: chainMail.index,
            categories: chainMail.categories,
            armorClass: chainMail.armorClass,
          },
        ]),
      ).toBe(12)
    })

    it('counts a shield carried without armour, because nothing else will', () => {
      const shield = EQUIPMENT.get('shield')!
      const carried = [
        { index: shield.index, categories: shield.categories, armorClass: shield.armorClass },
      ]

      // `derivedArmorClass` adds nothing to a manual column on purpose, so a
      // shield-and-no-armour barbarian would otherwise read two low.
      expect(derivedArmorClassColumn('barbarian', scores, carried)).toBe(17)
    })
  })

  it('takes speed from the species', () => {
    expect(derivedSpeed('goliath')).toBe(35)
    expect(derivedSpeed('halfling')).toBe(30)
    expect(derivedSpeed('kobold')).toBe(30)
  })

  it('gives every SRD species the speed its own row prints', () => {
    for (const species of SPECIES.all) {
      expect(derivedSpeed(species.index)).toBe(species.speed)
    }
  })
})

describe('derivedDefaults', () => {
  /** The armour class each class’s recommended build actually walks in with. */
  const STARTING_ARMOR_CLASS: Record<string, number> = {
    // Greataxe and no armour: Unarmored Defense, 10 + Dex 13 + Con 15.
    barbarian: 13,
    // Leather 11 + Dex 14.
    bard: 13,
    // Chain shirt 13 + Dex 10 + shield.
    cleric: 15,
    // Leather 11 + Dex 13 + shield.
    druid: 14,
    // Chain mail, which takes no Dexterity at all.
    fighter: 16,
    // No armour by design: 10 + Dex 17 + Wis 14.
    monk: 15,
    // Chain mail + shield, the highest a 1st-level character reaches.
    paladin: 18,
    // Studded leather 12 + Dex 17.
    ranger: 15,
    // Leather 11 + Dex 17.
    rogue: 14,
    // Spear and daggers: 10 + Dex 13.
    sorcerer: 11,
    // Leather 11 + Dex 13.
    warlock: 12,
    // A robe is not armour: 10 + Dex 13.
    wizard: 11,
  }

  it('gives every class the armour class its own starting kit produces', () => {
    for (const classIndex of CLASSES.indexes) {
      const derived = derivedDefaults(recommendedChoices(classIndex))

      expect(derived.armorClassInPlay.value).toBe(STARTING_ARMOR_CLASS[classIndex])
    }
  })

  it('says where the number came from, so a screen can too', () => {
    const paladin = derivedDefaults(recommendedChoices('paladin'))
    const monk = derivedDefaults(recommendedChoices('monk'))

    expect(paladin.armorClassInPlay).toMatchObject({ source: 'equipment', shield: true })
    // Nothing worn, so the column stands — and the column is the monk’s own
    // Unarmored Defense rather than a bare 10 + Dexterity.
    expect(monk.armorClassInPlay.source).toBe('manual')
    expect(monk.armorClass).toBe(15)
  })

  it('agrees with the sheet, on the same gear, by construction', () => {
    const choices = recommendedChoices('cleric')
    const derived = derivedDefaults(choices)

    // The wizard hands the sheet a column and a wardrobe; this is the sheet’s
    // own function reading them back.
    expect(
      derivedArmorClass(
        { armorClass: derived.armorClass, dexterity: finalAbilityScores(choices).dexterity },
        startingArmorDetails(choices),
      ),
    ).toEqual(derived.armorClassInPlay)
  })

  it('moves the number when the kit is swapped for a purse', () => {
    const armoured = derivedDefaults(recommendedChoices('fighter'))
    const purse = derivedDefaults({ ...recommendedChoices('fighter'), classEquipmentOption: 2 })

    expect(armoured.armorClassInPlay.value).toBe(16)
    // 155 gp and the clothes they stand in.
    expect(purse.armorClassInPlay.source).toBe('manual')
    expect(purse.armorClassInPlay.value).toBe(purse.armorClass)
  })

  it('takes a typed number over the derived one, and says which it used', () => {
    const choices = {
      ...recommendedChoices('wizard'),
      manualMaxHitPoints: 30,
      manualArmorClass: 18,
      manualSpeed: 25,
    }
    const derived = derivedDefaults(choices)

    expect(derived).toMatchObject({ maxHitPoints: 30, armorClass: 18, speed: 25 })
    expect(derived.overridden).toEqual({ maxHitPoints: true, armorClass: true, speed: true })
    // An overridden column is still what the sheet falls back to, so a wizard
    // in no armour reads the 18 they typed.
    expect(derived.armorClassInPlay.value).toBe(18)
  })

  it('derives every number nobody has overridden', () => {
    const derived = derivedDefaults(recommendedChoices('fighter'))

    expect(derived.overridden).toEqual({
      maxHitPoints: false,
      armorClass: false,
      speed: false,
    })
  })

  it('writes the derived numbers into the character the wizard creates', () => {
    const choices = recommendedChoices('cleric')
    const values = wizardFormValues(choices)
    const derived = derivedDefaults(choices)

    // A dwarf cleric: d8 + Constitution 14 + Dwarven Toughness.
    expect(choices.speciesIndex).toBe('dwarf')
    expect(values.maxHitPoints).toBe(11)
    expect(values.armorClass).toBe(derived.armorClass)
    expect(values.speed).toBe(30)
  })

  it('carries an override onto the wire, where the schema still has to accept it', () => {
    const values = wizardFormValues({
      ...recommendedChoices('fighter'),
      manualMaxHitPoints: 44,
      manualSpeed: 40,
    })

    expect(values.maxHitPoints).toBe(44)
    expect(values.speed).toBe(40)
    expect(characterFormSchema.safeParse({ ...values, name: 'Vex Ashbrand' }).success).toBe(true)
  })
})

describe('re-seating choices', () => {
  it('starts the recommendation again on a new class, keeping the name', () => {
    const named = { ...recommendedChoices('wizard'), name: 'Vex Ashbrand' }
    const next = withClass(named, 'barbarian')

    expect(next.name).toBe('Vex Ashbrand')
    expect(next.classIndex).toBe('barbarian')
    // A barbarian holding a wizard's spellbook is the state this prevents.
    expect(next.cantripIndexes).toEqual([])
    expect(next.abilityAssignment[0]).toBe('strength')
  })

  it('leaves everything alone when the class did not change', () => {
    const choices = recommendedChoices('wizard')
    expect(withClass(choices, 'wizard')).toBe(choices)
  })

  it('re-spends the ability increases and the skills on a new background', () => {
    const choices = recommendedChoices('fighter')
    const next = withBackground(choices, 'sage')

    expect(next.backgroundAbilities).toEqual(recommendedBackgroundAbilities('fighter', 'sage'))
    expect(next.skillProficiencies).toEqual(recommendedSkills('fighter', 'sage'))
    expect(withBackground(next, 'sage')).toBe(next)
  })

  it('changes nothing but the species', () => {
    const choices = recommendedChoices('fighter')

    expect(withSpecies(choices, 'dwarf')).toEqual({ ...choices, speciesIndex: 'dwarf' })
  })
})

describe('what the wizard posts', () => {
  it('produces a character every class over that the shared schema accepts', () => {
    for (const index of CLASS_INDEXES) {
      const values = wizardFormValues({ ...recommendedChoices(index), name: 'Vex Ashbrand' })

      expect(characterFormSchema.safeParse(values).success).toBe(true)
      expect(values.level).toBe(1)
      // A 1st-level character has no subclass in the 2024 rules.
      expect(values.subclassIndex).toBeNull()
    }
  })

  it('records the origin block the background implies', () => {
    const values = wizardFormValues({ ...recommendedChoices('cleric'), name: 'Aureliana' })

    expect(values.backgroundIndex).toBe('acolyte')
    expect(values.backgroundAbilitySpread).toBe('two-and-one')
    expect(values.originFeatIndex).toBe(BACKGROUNDS.get('acolyte')!.originFeat.index)
  })

  it('trims the name and holds expertise to the skills that are proficient', () => {
    const choices = {
      ...recommendedChoices('rogue'),
      name: '  Vex  ',
      skillExpertise: ['stealth', 'arcana'],
      skillProficiencies: ['stealth'],
    }

    const values = wizardFormValues(choices)

    expect(values.name).toBe('Vex')
    expect(values.skillExpertise).toEqual(['stealth'])
  })

  it('leaves the origin block empty when no background was chosen', () => {
    const values = wizardFormValues({
      ...recommendedChoices('fighter'),
      backgroundIndex: '',
      name: 'Brune',
    })

    expect(values.backgroundIndex).toBeNull()
    expect(values.backgroundAbilitySpread).toBeNull()
    expect(values.originFeatIndex).toBeNull()
  })

  it('adds the three creation-only fields, and the campaign it was made for', () => {
    const body = wizardCreateBody(
      { ...recommendedChoices('wizard'), name: 'Vex' },
      'a1b2c3d4-0000-4000-8000-000000000001',
    )

    expect(body.campaignId).toBe('a1b2c3d4-0000-4000-8000-000000000001')
    expect(body.classEquipmentOption).toBe(0)
    expect(body.backgroundEquipmentOption).toBe(0)
    expect(body.preparedSpellIndexes).toHaveLength(startingSpellCounts('wizard').prepared)
  })

  it('carries no campaign when there is none', () => {
    expect(wizardCreateBody(recommendedChoices('fighter'), null).campaignId).toBeNull()
  })
})
