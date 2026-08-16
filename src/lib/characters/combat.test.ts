import type { Character } from '@/lib/db/schema'

import {
  applyDamage,
  applyHealing,
  combatPatchSchema,
  combatStateOf,
  normaliseCombatPatch,
  regainSlot,
  setDeathSaveFailures,
  setDeathSaveSuccesses,
  setSlotMax,
  setSpellSlots,
  setTemporaryHitPoints,
  slotLevelsOf,
  spendSlot,
  toggleCondition,
  toggleDeathSaveCount,
  type CombatState,
} from './combat'

const CHARACTER: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 32,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: [],
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

function stateWith(overrides: Partial<CombatState> = {}): CombatState {
  return { ...combatStateOf(CHARACTER), ...overrides }
}

describe('applyDamage', () => {
  it('takes it off current hit points', () => {
    expect(applyDamage(stateWith(), 32, 7).currentHitPoints).toBe(25)
  })

  it('spends temporary hit points first', () => {
    const after = applyDamage(stateWith({ temporaryHitPoints: 5 }), 32, 3)

    expect(after).toMatchObject({ temporaryHitPoints: 2, currentHitPoints: 32 })
  })

  it('carries damage past the temporary pool into real hit points', () => {
    const after = applyDamage(stateWith({ temporaryHitPoints: 5 }), 32, 9)

    expect(after).toMatchObject({ temporaryHitPoints: 0, currentHitPoints: 28 })
  })

  it('stops at 0 rather than going negative', () => {
    expect(applyDamage(stateWith({ currentHitPoints: 4 }), 32, 40).currentHitPoints).toBe(0)
  })

  it('ignores a negative or fractional amount', () => {
    expect(applyDamage(stateWith(), 32, -5).currentHitPoints).toBe(32)
    expect(applyDamage(stateWith(), 32, 2.9).currentHitPoints).toBe(30)
  })
})

describe('applyHealing', () => {
  it('never heals past the maximum', () => {
    expect(applyHealing(stateWith({ currentHitPoints: 30 }), 32, 10).currentHitPoints).toBe(32)
  })

  it('clears the death save track, because any healing ends it', () => {
    const dying = stateWith({
      currentHitPoints: 0,
      deathSaveSuccesses: 2,
      deathSaveFailures: 1,
    })

    expect(applyHealing(dying, 32, 1)).toMatchObject({
      currentHitPoints: 1,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    })
  })

  it('leaves the track alone when the healing was zero', () => {
    const dying = stateWith({ currentHitPoints: 0, deathSaveFailures: 2 })

    expect(applyHealing(dying, 32, 0).deathSaveFailures).toBe(2)
  })
})

describe('temporary hit points', () => {
  it('replaces rather than adds, because temp HP do not stack', () => {
    expect(setTemporaryHitPoints(stateWith({ temporaryHitPoints: 5 }), 8)).toMatchObject({
      temporaryHitPoints: 8,
    })
  })

  it('never goes below zero', () => {
    expect(setTemporaryHitPoints(stateWith(), -3).temporaryHitPoints).toBe(0)
  })
})

describe('death saves', () => {
  it('fills up to the marker that was tapped', () => {
    expect(toggleDeathSaveCount(0, 2)).toBe(2)
    expect(toggleDeathSaveCount(1, 3)).toBe(3)
  })

  it('clears the marker when it is the last one filled — one tap to undo', () => {
    expect(toggleDeathSaveCount(2, 2)).toBe(1)
    expect(toggleDeathSaveCount(1, 1)).toBe(0)
  })

  it('tracks successes and failures separately', () => {
    const marked = setDeathSaveFailures(setDeathSaveSuccesses(stateWith(), 2), 1)

    expect(marked).toMatchObject({ deathSaveSuccesses: 2, deathSaveFailures: 1 })
  })
})

describe('toggleCondition', () => {
  it('adds one that is not there and removes one that is', () => {
    const on = toggleCondition(stateWith(), 'prone')
    expect(on.conditions).toEqual(['prone'])
    expect(toggleCondition(on, 'prone').conditions).toEqual([])
  })

  it('keeps the others', () => {
    const state = stateWith({ conditions: ['prone', 'poisoned'] })

    expect(toggleCondition(state, 'prone').conditions).toEqual(['poisoned'])
  })
})

describe('spell slots', () => {
  const CASTER = stateWith({
    spellSlots: { '1': { max: 4, used: 1 }, '3': { max: 2, used: 0 } },
  })

  it('spends and regains one at a time', () => {
    expect(spendSlot(CASTER, 1).spellSlots['1']).toEqual({ max: 4, used: 2 })
    expect(regainSlot(CASTER, 1).spellSlots['1']).toEqual({ max: 4, used: 0 })
  })

  it('does nothing — and so costs no request — at either end of the pool', () => {
    const empty = stateWith({ spellSlots: { '1': { max: 2, used: 2 } } })

    expect(spendSlot(empty, 1)).toBe(empty)
    expect(regainSlot(CASTER, 3)).toBe(CASTER)
    expect(spendSlot(CASTER, 9)).toBe(CASTER)
  })

  it('takes spent slots down with the maximum', () => {
    const state = stateWith({ spellSlots: { '1': { max: 4, used: 4 } } })

    expect(setSlotMax(state, 1, 2).spellSlots['1']).toEqual({ max: 2, used: 2 })
  })

  it('removes a level entirely at a maximum of zero', () => {
    expect(setSlotMax(CASTER, 1, 0).spellSlots).toEqual({ '3': { max: 2, used: 0 } })
  })

  it('lists only the levels that have slots, in order', () => {
    expect(slotLevelsOf(CASTER.spellSlots)).toEqual([1, 3])
    expect(slotLevelsOf({ '2': { max: 0, used: 0 } })).toEqual([])
  })

  it('adopts a whole table at once', () => {
    const standard = { '1': { max: 4, used: 0 } }

    expect(setSpellSlots(CASTER, standard).spellSlots).toEqual(standard)
  })
})

describe('combatPatchSchema', () => {
  it('accepts the tracked fields', () => {
    const parsed = combatPatchSchema.safeParse({
      currentHitPoints: 12,
      temporaryHitPoints: 0,
      spellSlots: { '3': { max: 2, used: 1 } },
      conditions: ['prone'],
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    })

    expect(parsed.success).toBe(true)
  })

  it('refuses anything the sheet does not track — this is not a rename route', () => {
    expect(combatPatchSchema.safeParse({ name: 'Someone Else' }).success).toBe(false)
    expect(combatPatchSchema.safeParse({ currentHitPoints: 5, level: 20 }).success).toBe(false)
    expect(combatPatchSchema.safeParse({ maxHitPoints: 999 }).success).toBe(false)
  })

  it('refuses an empty patch and impossible values', () => {
    expect(combatPatchSchema.safeParse({}).success).toBe(false)
    expect(combatPatchSchema.safeParse({ currentHitPoints: -1 }).success).toBe(false)
    expect(combatPatchSchema.safeParse({ deathSaveFailures: 4 }).success).toBe(false)
    expect(combatPatchSchema.safeParse({ spellSlots: { '0': { max: 1, used: 0 } } }).success).toBe(
      false,
    )
    expect(combatPatchSchema.safeParse({ spellSlots: { '10': { max: 1, used: 0 } } }).success).toBe(
      false,
    )
  })
})

describe('normaliseCombatPatch', () => {
  it('clamps hit points to this character’s maximum', () => {
    expect(normaliseCombatPatch({ currentHitPoints: 900 }, CHARACTER).currentHitPoints).toBe(32)
  })

  it('drops empty slot levels and clamps spent past the maximum', () => {
    const patch = normaliseCombatPatch(
      { spellSlots: { '1': { max: 2, used: 9 }, '2': { max: 0, used: 0 } } },
      CHARACTER,
    )

    expect(patch.spellSlots).toEqual({ '1': { max: 2, used: 2 } })
  })

  it('de-duplicates conditions and drops ones this app cannot render', () => {
    const patch = normaliseCombatPatch({ conditions: ['prone', 'prone', 'on-fire'] }, CHARACTER)

    expect(patch.conditions).toEqual(['prone'])
  })

  it('clears death saves once the character is above 0 hit points', () => {
    const patch = normaliseCombatPatch(
      { currentHitPoints: 5, deathSaveSuccesses: 3, deathSaveFailures: 2 },
      CHARACTER,
    )

    expect(patch).toMatchObject({ deathSaveSuccesses: 0, deathSaveFailures: 0 })
  })

  it('keeps death saves when the character is still down', () => {
    const patch = normaliseCombatPatch({ currentHitPoints: 0, deathSaveFailures: 2 }, CHARACTER)

    expect(patch.deathSaveFailures).toBe(2)
  })

  it('judges death saves against the stored hit points when the patch omits them', () => {
    const down = { ...CHARACTER, currentHitPoints: 0 }

    expect(normaliseCombatPatch({ deathSaveFailures: 1 }, down).deathSaveFailures).toBe(1)
    expect(normaliseCombatPatch({ deathSaveFailures: 1 }, CHARACTER).deathSaveFailures).toBe(0)
  })
})
