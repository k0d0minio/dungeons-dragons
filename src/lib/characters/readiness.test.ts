// The three "ready a character" rules (first-table/creation-readiness), held
// across every class × starting-equipment option the SRD offers: a readied
// weapon wherever the kit has one, never a two-handed weapon beside a worn
// shield, slots for every level-1 caster, masteries within the count and only
// ever naming a weapon from the kit.
import { BACKGROUNDS } from '@/lib/srd/backgrounds'
import { CLASSES } from '@/lib/srd/classes'
import { WEAPONS } from '@/lib/srd/weapons'

import {
  characterReadiness,
  hasReadiedWeapon,
  packedWeaponNames,
  startingMasteries,
  startingSpellSlots,
  weaponsToReady,
} from './readiness'
import { standardSpellSlots, weaponMasteryCount } from './rules'
import { classEquipmentOptions, recommendedChoices, startingInventory } from './wizard'

const CLASS_INDEXES = CLASSES.all.map((entry) => entry.index)
const BACKGROUND_INDEXES = BACKGROUNDS.all.map((entry) => entry.index)

function kit(classIndex: string, classEquipmentOption = 0, backgroundIndex?: string) {
  const choices = recommendedChoices(classIndex)
  return startingInventory({
    classIndex,
    backgroundIndex: backgroundIndex ?? choices.backgroundIndex,
    classEquipmentOption,
    backgroundEquipmentOption: 0,
  }).items
}

function isTwoHanded(index: string): boolean {
  return WEAPONS.get(index)?.properties.includes('two-handed') ?? false
}

describe('weaponsToReady', () => {
  it('readies at least one weapon for every class × option × background that carries one', () => {
    for (const classIndex of CLASS_INDEXES) {
      for (let option = 0; option < classEquipmentOptions(classIndex).length; option += 1) {
        for (const backgroundIndex of BACKGROUND_INDEXES) {
          const items = kit(classIndex, option, backgroundIndex)
          const carried = items.filter(
            (item) => item.equipmentIndex !== null && WEAPONS.has(item.equipmentIndex),
          )
          const picks = weaponsToReady(items, { classIndex })

          if (carried.length === 0) {
            expect(picks).toEqual([])
            continue
          }

          expect(picks.length).toBeGreaterThanOrEqual(1)
          expect(picks.length).toBeLessThanOrEqual(2)
          expect(new Set(picks).size).toBe(picks.length)
          for (const index of picks) {
            expect(carried.some((item) => item.equipmentIndex === index)).toBe(true)
          }
        }
      }
    }
  })

  it('never pairs a two-handed weapon with a worn shield', () => {
    for (const classIndex of CLASS_INDEXES) {
      for (let option = 0; option < classEquipmentOptions(classIndex).length; option += 1) {
        for (const backgroundIndex of BACKGROUND_INDEXES) {
          const items = kit(classIndex, option, backgroundIndex)
          const shielded = items.some((item) => item.equipmentIndex === 'shield' && item.equipped)
          if (!shielded) continue

          for (const index of weaponsToReady(items, { classIndex })) {
            expect(isTwoHanded(index)).toBe(false)
          }
        }
      }
    }
  })

  it('gives the Strength fighter the greatsword and the soldier’s shortbow', () => {
    expect(weaponsToReady(kit('fighter'), { classIndex: 'fighter' })).toEqual([
      'greatsword',
      'shortbow',
    ])
    // With no bow in the kit, the javelins are the thing to throw.
    expect(weaponsToReady(kit('fighter', 0, 'acolyte'), { classIndex: 'fighter' })).toEqual([
      'greatsword',
      'javelin',
    ])
  })

  it('gives the recommended paladin the longsword and keeps the shield over the shortbow', () => {
    const items = kit('paladin')
    expect(items.some((item) => item.equipmentIndex === 'shortbow')).toBe(true)

    expect(weaponsToReady(items, { classIndex: 'paladin' })).toEqual(['longsword', 'javelin'])
  })

  it('lets the shortbow through once the shield is not worn', () => {
    const items = kit('paladin').map((item) =>
      item.equipmentIndex === 'shield' ? { ...item, equipped: false } : item,
    )

    expect(weaponsToReady(items, { classIndex: 'paladin' })).toEqual(['longsword', 'shortbow'])
  })

  it('gives the rogue a finesse blade and the shortbow', () => {
    expect(weaponsToReady(kit('rogue'), { classIndex: 'rogue' })).toEqual([
      'shortsword',
      'shortbow',
    ])
  })

  it('readies only the mace for a cleric, whose kit has nothing to throw', () => {
    expect(weaponsToReady(kit('cleric'), { classIndex: 'cleric' })).toEqual(['mace'])
  })

  it('lets real scores overrule the class guide', () => {
    const items = kit('fighter', 1)

    // Option (b) is all finesse and a bow, so a Strength score changes nothing…
    expect(weaponsToReady(items, { classIndex: 'fighter', strength: 16, dexterity: 10 })).toEqual([
      'scimitar',
      'longbow',
    ])
    // …but a monk whose player put the 15 in Strength swings the spear.
    expect(
      weaponsToReady(kit('monk', 0, 'acolyte'), {
        classIndex: 'monk',
        strength: 16,
        dexterity: 12,
      }),
    ).toEqual(['spear', 'dagger'])
    expect(
      weaponsToReady(kit('monk', 0, 'acolyte'), {
        classIndex: 'monk',
        strength: 10,
        dexterity: 16,
      }),
    ).toEqual(['dagger', 'spear'])
  })

  it('readies nothing for a kit with no SRD weapon in it', () => {
    expect(weaponsToReady(kit('fighter', 2, 'acolyte'), { classIndex: 'fighter' })).toEqual([])
    expect(
      weaponsToReady([{ equipmentIndex: null, equipped: false }], { classIndex: 'wizard' }),
    ).toEqual([])
  })
})

describe('startingSpellSlots', () => {
  it('seeds every level-1 caster class, half casters and the warlock included', () => {
    for (const classIndex of [
      'bard',
      'cleric',
      'druid',
      'paladin',
      'ranger',
      'sorcerer',
      'warlock',
      'wizard',
    ]) {
      const slots = startingSpellSlots(classIndex)
      expect(Object.keys(slots).length).toBeGreaterThan(0)
      expect(slots).toEqual(standardSpellSlots(classIndex, 1))
    }
    expect(startingSpellSlots('warlock')).toEqual({ '1': { max: 1, used: 0 } })
    expect(startingSpellSlots('paladin')).toEqual({ '1': { max: 2, used: 0 } })
  })

  it('is empty for a class that casts nothing', () => {
    for (const classIndex of ['barbarian', 'fighter', 'monk', 'rogue']) {
      expect(startingSpellSlots(classIndex)).toEqual({})
    }
  })
})

describe('startingMasteries', () => {
  it('never exceeds the count and never names a weapon outside the kit', () => {
    for (const classIndex of CLASS_INDEXES) {
      for (let option = 0; option < classEquipmentOptions(classIndex).length; option += 1) {
        for (const backgroundIndex of BACKGROUND_INDEXES) {
          const items = kit(classIndex, option, backgroundIndex)
          const picks = startingMasteries(items, { classIndex, level: 1 })
          const allowance = weaponMasteryCount(classIndex, 1)

          if (allowance === null) {
            expect(picks).toBeNull()
            continue
          }

          const carried = items.filter(
            (item) => item.equipmentIndex !== null && WEAPONS.has(item.equipmentIndex),
          )
          if (carried.length === 0) {
            expect(picks).toBeNull()
            continue
          }

          expect(picks).not.toBeNull()
          expect(picks!.length).toBeLessThanOrEqual(allowance)
          expect(new Set(picks).size).toBe(picks!.length)
          for (const index of picks!) {
            expect(carried.some((item) => item.equipmentIndex === index)).toBe(true)
          }
        }
      }
    }
  })

  it('puts the readied weapons first', () => {
    // Fighter (a) + soldier: greatsword and shortbow readied, the flail makes up the third.
    expect(startingMasteries(kit('fighter'), { classIndex: 'fighter', level: 1 })).toEqual([
      'greatsword',
      'shortbow',
      'flail',
    ])
    expect(startingMasteries(kit('paladin'), { classIndex: 'paladin', level: 1 })).toEqual([
      'longsword',
      'javelin',
    ])
  })

  it('is null for the seven classes without the feature', () => {
    expect(startingMasteries(kit('wizard'), { classIndex: 'wizard', level: 1 })).toBeNull()
    expect(startingMasteries(kit('cleric'), { classIndex: 'cleric', level: 1 })).toBeNull()
  })
})

describe('the checklist', () => {
  const items = kit('paladin')

  it('reads a fresh wizard-made row as not ready on every line that applies', () => {
    const readiness = characterReadiness(
      {
        classIndex: 'paladin',
        level: 1,
        strength: 16,
        dexterity: 10,
        spellSlots: {},
        masteredWeaponIndexes: null,
        skillProficiencies: [],
      },
      items,
    )

    expect(readiness.weapon).toEqual({
      applies: true,
      ready: false,
      fix: ['longsword', 'javelin'],
    })
    expect(readiness.spellSlots).toEqual({
      applies: true,
      ready: false,
      fix: { '1': { max: 2, used: 0 } },
    })
    expect(readiness.masteries).toEqual({
      applies: true,
      ready: false,
      fix: ['longsword', 'javelin'],
    })
    expect(readiness.skills).toEqual({ applies: true, ready: false })
  })

  it('reads a fixed row as ready, and a non-caster’s slot line as not applying', () => {
    const fixed = characterReadiness(
      {
        classIndex: 'fighter',
        level: 1,
        spellSlots: {},
        masteredWeaponIndexes: ['greatsword'],
        skillProficiencies: ['athletics'],
      },
      kit('fighter').map((item) =>
        item.equipmentIndex === 'greatsword' ? { ...item, equipped: true } : item,
      ),
    )

    expect(fixed.weapon.ready).toBe(true)
    expect(fixed.spellSlots.applies).toBe(false)
    expect(fixed.masteries.ready).toBe(true)
    expect(fixed.skills.ready).toBe(true)
  })

  it('knows a weapon is readied only when an equipped item is one', () => {
    expect(hasReadiedWeapon(items)).toBe(false)
    expect(
      hasReadiedWeapon(
        items.map((item) =>
          item.equipmentIndex === 'longsword' ? { ...item, equipped: true } : item,
        ),
      ),
    ).toBe(true)
    // Worn armour is equipped, and is not a weapon.
    expect(hasReadiedWeapon([{ equipmentIndex: 'chain-mail', equipped: true }])).toBe(false)
  })

  it('names what is in the pack, once each, by the row’s own name when it has one', () => {
    expect(packedWeaponNames(items)).toEqual(['Longsword', 'Javelin', 'Spear', 'Shortbow'])
    expect(
      packedWeaponNames([
        { equipmentIndex: 'longsword', equipped: false, customName: 'Oathkeeper' },
        { equipmentIndex: 'longsword', equipped: true },
        { equipmentIndex: null, equipped: false, customName: 'Holy Symbol' },
      ]),
    ).toEqual(['Oathkeeper'])
  })
})
