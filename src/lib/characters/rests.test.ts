import type { Character } from '@/lib/db/schema'

import { hitDiceRemaining, longRest, shortRest, type RestFields } from './rests'

// A 5th-level warlock unless a test says otherwise: the class whose slots
// behave differently on each rest, which is where the bugs would live.
const BASE: RestFields = {
  classIndex: 'warlock',
  level: 5,
  constitution: 14, // +2
  maxHitPoints: 38,
  currentHitPoints: 17,
  hitDiceUsed: 2,
  exhaustion: 0,
  spellSlots: { '3': { max: 2, used: 2 } },
  classResources: [],
}

function character(overrides: Partial<RestFields> = {}): RestFields {
  return { ...BASE, ...overrides }
}

describe('hitDiceRemaining', () => {
  it('is one die per level, minus what has been spent', () => {
    expect(hitDiceRemaining({ level: 5, hitDiceUsed: 2 })).toBe(3)
    expect(hitDiceRemaining({ level: 1, hitDiceUsed: 0 })).toBe(1)
  })

  it('never goes negative, even off a row a migration left odd', () => {
    expect(hitDiceRemaining({ level: 3, hitDiceUsed: 9 })).toBe(0)
    expect(hitDiceRemaining({ level: 3, hitDiceUsed: -2 })).toBe(3)
  })
})

describe('longRest', () => {
  it('restores all hit points and clears temporary ones', () => {
    const patch = longRest(character())

    expect(patch.currentHitPoints).toBe(38)
    // SRD 5.1 lists "after a long rest" among the ways temp HP end
    // (docs/rules/05-combat.md) — zeroing them is the rule, not a ruling.
    expect(patch.temporaryHitPoints).toBe(0)
  })

  it('regains half the total hit dice, rounded down', () => {
    // Level 5: regain floor(5/2) = 2 of the 2 spent.
    expect(longRest(character({ hitDiceUsed: 2 })).hitDiceUsed).toBe(0)
    expect(longRest(character({ hitDiceUsed: 5 })).hitDiceUsed).toBe(3)
  })

  it('regains at least one die, however low the level', () => {
    const patch = longRest(character({ level: 1, hitDiceUsed: 1 }))

    expect(patch.hitDiceUsed).toBe(0)
  })

  it('never regains past a full pool', () => {
    expect(longRest(character({ hitDiceUsed: 0 })).hitDiceUsed).toBe(0)
  })

  it('restores every spell slot, pact magic included', () => {
    const patch = longRest(
      character({
        classIndex: 'wizard',
        spellSlots: { '1': { max: 4, used: 3 }, '2': { max: 3, used: 1 } },
      }),
    )

    expect(patch.spellSlots).toEqual({ '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 } })
    expect(longRest(character()).spellSlots).toEqual({ '3': { max: 2, used: 0 } })
  })

  it('clears the death save track', () => {
    const patch = longRest(character())

    expect(patch.deathSaveSuccesses).toBe(0)
    expect(patch.deathSaveFailures).toBe(0)
  })

  it('removes one level of exhaustion, and stops at zero', () => {
    expect(longRest(character({ exhaustion: 3 })).exhaustion).toBe(2)
    expect(longRest(character({ exhaustion: 1 })).exhaustion).toBe(0)
    expect(longRest(character({ exhaustion: 0 })).exhaustion).toBe(0)
  })

  it('refills short-rest and long-rest resources, and leaves manual ones alone', () => {
    const patch = longRest(
      character({
        classResources: [
          { name: 'Rage', max: 3, used: 2, recharge: 'long-rest' },
          { name: 'Second Wind', max: 1, used: 1, recharge: 'short-rest' },
          { name: 'Luck Points', max: 3, used: 1, recharge: 'manual' },
        ],
      }),
    )

    expect(patch.classResources).toEqual([
      { name: 'Rage', max: 3, used: 0, recharge: 'long-rest' },
      { name: 'Second Wind', max: 1, used: 0, recharge: 'short-rest' },
      { name: 'Luck Points', max: 3, used: 1, recharge: 'manual' },
    ])
  })
})

describe('shortRest', () => {
  it('heals each die at its roll plus the Constitution modifier', () => {
    // d8 warlock, +2 Con: (5+2) + (3+2) = 12.
    const patch = shortRest(character(), [{ rolled: 5 }, { rolled: 3 }])

    expect(patch.currentHitPoints).toBe(29)
    expect(patch.hitDiceUsed).toBe(4)
  })

  it('never lets one bad die wound the character', () => {
    // Roll of 1 with -3 Con would be -2; it heals 0 instead.
    const patch = shortRest(character({ constitution: 4 }), [{ rolled: 1 }, { rolled: 8 }])

    expect(patch.currentHitPoints).toBe(17 + 0 + 5)
  })

  it('stops healing at the maximum', () => {
    const patch = shortRest(character({ currentHitPoints: 36 }), [{ rolled: 8 }])

    expect(patch.currentHitPoints).toBe(38)
  })

  it('spends no more dice than the character has left', () => {
    // Level 5 with 4 spent: one die remains, so only the first roll counts —
    // healing included.
    const patch = shortRest(character({ hitDiceUsed: 4 }), [
      { rolled: 8 },
      { rolled: 8 },
      { rolled: 8 },
    ])

    expect(patch.hitDiceUsed).toBe(5)
    expect(patch.currentHitPoints).toBe(17 + 8 + 2)
  })

  it('clamps a rolled value to what the class die can show', () => {
    // A d8 cannot show 20, and no die shows less than 1.
    const patch = shortRest(character(), [{ rolled: 20 }, { rolled: 0 }])

    expect(patch.currentHitPoints).toBe(17 + (8 + 2) + (1 + 2))
  })

  it('restores pact magic slots for a warlock', () => {
    const patch = shortRest(character(), [])

    expect(patch.spellSlots).toEqual({ '3': { max: 2, used: 0 } })
  })

  it('does not restore a non-pact caster’s slots', () => {
    const slots = { '1': { max: 4, used: 3 } }
    const patch = shortRest(character({ classIndex: 'wizard', spellSlots: slots }), [])

    expect(patch.spellSlots).toBe(slots)
  })

  it('refills short-rest resources only', () => {
    const patch = shortRest(
      character({
        classResources: [
          { name: 'Second Wind', max: 1, used: 1, recharge: 'short-rest' },
          { name: 'Rage', max: 3, used: 2, recharge: 'long-rest' },
        ],
      }),
      [],
    )

    expect(patch.classResources).toEqual([
      { name: 'Second Wind', max: 1, used: 0, recharge: 'short-rest' },
      { name: 'Rage', max: 3, used: 2, recharge: 'long-rest' },
    ])
  })

  it('touches neither exhaustion, temp HP nor death saves', () => {
    const patch = shortRest(character(), []) as Partial<Character>

    expect(patch.exhaustion).toBeUndefined()
    expect(patch.temporaryHitPoints).toBeUndefined()
    expect(patch.deathSaveSuccesses).toBeUndefined()
  })

  it('accepts a roll as typed when the class die is unknown', () => {
    const patch = shortRest(character({ classIndex: 'homebrew-mystic' }), [{ rolled: 12 }])

    expect(patch.currentHitPoints).toBe(17 + 12 + 2)
  })
})
