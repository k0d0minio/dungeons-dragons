import type { Character } from '@/lib/db/schema'
import { BACKGROUND_ABILITY_SPREADS } from '@/lib/srd/backgrounds'

import {
  BACKGROUND_SPREAD_KEYS,
  characterFormSchema,
  characterFormValuesOf,
  characterPatchSchema,
  CHARACTER_FORM_DEFAULTS,
  fieldErrorsOf,
  normaliseCharacterPatch,
  type CharacterFormValues,
} from './schema'

// The form and `POST /api/characters` both validate against this object, so
// these tests are the contract between them: anything accepted here has to be
// insertable against the CHECK constraints in `src/lib/db/schema.ts`.

// The 2024 origin block, spread into both fixtures below so the stored row and
// the form values cannot drift — and typed off `Character`, because the form's
// copies are optional (an old client may omit them) while the row's are not.
const ORIGIN: Pick<
  Character,
  | 'backgroundIndex'
  | 'backgroundAbilitySpread'
  | 'backgroundAbilities'
  | 'originFeatIndex'
  | 'subclassIndex'
  | 'masteredWeaponIndexes'
> = {
  backgroundIndex: 'sage',
  backgroundAbilitySpread: 'two-and-one',
  backgroundAbilities: ['intelligence', 'wisdom'],
  originFeatIndex: 'magic-initiate',
  subclassIndex: 'evoker',
  masteredWeaponIndexes: null,
}

const VALID: CharacterFormValues = {
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
  armorClass: 12,
  speed: 30,
  knownSpellIndexes: ['fireball', 'magic-missile'],
  skillProficiencies: ['arcana', 'investigation'],
  skillExpertise: [],
  ...ORIGIN,
}

/** The first message zod reported for `field`, or `undefined`. */
function messageFor(value: unknown, field: string): string | undefined {
  const result = characterFormSchema.safeParse(value)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path.join('.') === field)?.message
}

describe('characterFormSchema', () => {
  it('accepts a filled-in character', () => {
    const result = characterFormSchema.safeParse(VALID)

    expect(result.success).toBe(true)
    expect(result.success && result.data).toEqual(VALID)
  })

  it('accepts a character with no spells', () => {
    expect(characterFormSchema.safeParse({ ...VALID, knownSpellIndexes: [] }).success).toBe(true)
  })

  it('trims the name', () => {
    const result = characterFormSchema.safeParse({ ...VALID, name: '  Vex Ashbrand  ' })

    expect(result.success && result.data.name).toBe('Vex Ashbrand')
  })

  it('rejects a name that is only whitespace', () => {
    expect(messageFor({ ...VALID, name: '   ' }, 'name')).toBe('Give your character a name')
  })

  it('requires a class and a species', () => {
    expect(messageFor({ ...VALID, classIndex: '' }, 'classIndex')).toBe('Pick a class')
    expect(messageFor({ ...VALID, speciesIndex: '' }, 'speciesIndex')).toBe('Pick a species')
  })

  it('holds level to the 1–20 range the database also enforces', () => {
    expect(characterFormSchema.safeParse({ ...VALID, level: 1 }).success).toBe(true)
    expect(characterFormSchema.safeParse({ ...VALID, level: 20 }).success).toBe(true)
    expect(messageFor({ ...VALID, level: 0 }, 'level')).toContain('between 1 and 20')
    expect(messageFor({ ...VALID, level: 21 }, 'level')).toContain('between 1 and 20')
  })

  it('holds ability scores to the 1–30 range the database also enforces', () => {
    expect(characterFormSchema.safeParse({ ...VALID, strength: 1 }).success).toBe(true)
    expect(characterFormSchema.safeParse({ ...VALID, charisma: 30 }).success).toBe(true)
    expect(messageFor({ ...VALID, wisdom: 0 }, 'wisdom')).toContain('between 1 and 30')
    expect(messageFor({ ...VALID, wisdom: 31 }, 'wisdom')).toContain('between 1 and 30')
  })

  it('rejects fractional numbers', () => {
    expect(messageFor({ ...VALID, level: 3.5 }, 'level')).toContain('whole number')
  })

  it('reports an emptied number field as a range problem, not a type error', () => {
    // `register(..., { valueAsNumber: true })` hands an empty input through as
    // NaN. The player sees this message, so it has to read like advice.
    expect(messageFor({ ...VALID, maxHitPoints: Number.NaN }, 'maxHitPoints')).toBe(
      'Max HP must be a whole number between 1 and 999',
    )
  })

  it('requires at least one hit point but allows zero AC and zero speed', () => {
    expect(messageFor({ ...VALID, maxHitPoints: 0 }, 'maxHitPoints')).toContain('between 1 and 999')
    expect(characterFormSchema.safeParse({ ...VALID, armorClass: 0, speed: 0 }).success).toBe(true)
  })

  it('rejects a body that is not an object at all', () => {
    expect(characterFormSchema.safeParse('wizard').success).toBe(false)
    expect(characterFormSchema.safeParse(null).success).toBe(false)
  })

  it('accepts only the eighteen known skills as picks (DND-015)', () => {
    expect(
      characterFormSchema.safeParse({ ...VALID, skillProficiencies: ['stealth'] }).success,
    ).toBe(true)
    expect(
      messageFor({ ...VALID, skillProficiencies: ['lockpicking'] }, 'skillProficiencies.0'),
    ).toBe('That is not a skill this app knows')
    expect(messageFor({ ...VALID, skillExpertise: ['lockpicking'] }, 'skillExpertise.0')).toBe(
      'That is not a skill this app knows',
    )
  })
})

describe('CHARACTER_FORM_DEFAULTS', () => {
  it('leaves exactly the three fields the player must supply invalid', () => {
    const result = characterFormSchema.safeParse(CHARACTER_FORM_DEFAULTS)

    expect(result.success).toBe(false)
    expect(
      result.success ? [] : result.error.issues.map((issue) => issue.path.join('.')).sort(),
    ).toEqual(['classIndex', 'name', 'speciesIndex'])
  })

  it('starts every number inside its allowed range', () => {
    const result = characterFormSchema.safeParse({
      ...CHARACTER_FORM_DEFAULTS,
      name: 'Placeholder',
      classIndex: 'fighter',
      speciesIndex: 'human',
    })

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Editing (DND-018)
// ---------------------------------------------------------------------------

const STORED: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  ...VALID,
  ...ORIGIN,
  currentHitPoints: 24,
  temporaryHitPoints: 0,
  spellSlots: { '3': { max: 2, used: 1 } },
  conditions: ['prone'],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  heroicInspiration: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  preparedSpellIndexes: [],
  concentration: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

describe('characterPatchSchema', () => {
  it('accepts one field on its own', () => {
    const result = characterPatchSchema.safeParse({ name: 'Vex the Second' })

    expect(result.success).toBe(true)
    expect(result.success && result.data).toEqual({ name: 'Vex the Second' })
  })

  it('accepts the whole set, which is what the form sends', () => {
    expect(characterPatchSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects an empty patch', () => {
    const result = characterPatchSchema.safeParse({})

    expect(result.success).toBe(false)
    expect(result.success ? '' : result.error.issues[0].message).toBe('Nothing to change')
  })

  it('holds an edited field to exactly the bound creation holds it to', () => {
    // The point of deriving from the creation schema: an edit cannot reach a
    // value the form would have refused.
    expect(characterPatchSchema.safeParse({ level: 21 }).success).toBe(false)
    expect(characterPatchSchema.safeParse({ level: 20 }).success).toBe(true)
    expect(characterPatchSchema.safeParse({ wisdom: 31 }).success).toBe(false)
    expect(characterPatchSchema.safeParse({ maxHitPoints: 0 }).success).toBe(false)
    expect(characterPatchSchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('trims a name on the way through, as creation does', () => {
    const result = characterPatchSchema.safeParse({ name: '  Vex Ashbrand  ' })

    expect(result.success && result.data.name).toBe('Vex Ashbrand')
  })
})

describe('characterFormValuesOf', () => {
  it('reads back exactly the fields the creation schema accepts', () => {
    const values = characterFormValuesOf(STORED)

    expect(characterFormSchema.safeParse(values).success).toBe(true)
    expect(Object.keys(values).sort()).toEqual(Object.keys(CHARACTER_FORM_DEFAULTS).sort())
    expect(values).toEqual(VALID)
  })

  it('copies the spell list rather than aliasing the stored array', () => {
    const values = characterFormValuesOf(STORED)

    values.knownSpellIndexes.push('counterspell')

    expect(STORED.knownSpellIndexes).toEqual(['fireball', 'magic-missile'])
  })
})

describe('normaliseCharacterPatch', () => {
  it('leaves a patch that needs nothing alone', () => {
    expect(normaliseCharacterPatch({ name: 'Vex the Second' }, STORED)).toEqual({
      name: 'Vex the Second',
    })
  })

  it('brings current hit points down with a lowered maximum', () => {
    // Standing at 24; a maximum of 12 would otherwise render as "24/12".
    expect(normaliseCharacterPatch({ maxHitPoints: 12 }, STORED)).toEqual({
      maxHitPoints: 12,
      currentHitPoints: 12,
    })
  })

  it('does not heal anyone by raising the maximum', () => {
    expect(normaliseCharacterPatch({ maxHitPoints: 99 }, STORED)).toEqual({ maxHitPoints: 99 })
  })

  it('leaves current hit points alone when the maximum still covers them', () => {
    expect(normaliseCharacterPatch({ maxHitPoints: 24 }, STORED)).toEqual({ maxHitPoints: 24 })
  })

  it('drops duplicate spell indexes a hand-rolled request could carry', () => {
    const patch = normaliseCharacterPatch(
      { knownSpellIndexes: ['fireball', 'fireball', 'shield'] },
      STORED,
    )

    expect(patch.knownSpellIndexes).toEqual(['fireball', 'shield'])
  })

  it('keeps an emptied spell list empty rather than treating it as untouched', () => {
    expect(normaliseCharacterPatch({ knownSpellIndexes: [] }, STORED)).toEqual({
      knownSpellIndexes: [],
    })
  })

  it('drops duplicate skill picks and expertise outside the proficiencies (D21)', () => {
    const patch = normaliseCharacterPatch(
      {
        skillProficiencies: ['arcana', 'arcana', 'stealth'],
        skillExpertise: ['stealth', 'athletics'],
      },
      STORED,
    )

    expect(patch.skillProficiencies).toEqual(['arcana', 'stealth'])
    // Athletics was never proficient, so it cannot carry expertise.
    expect(patch.skillExpertise).toEqual(['stealth'])
  })

  it('checks expertise against the stored proficiencies when the patch omits them', () => {
    // STORED is proficient in arcana and investigation.
    const patch = normaliseCharacterPatch({ skillExpertise: ['arcana', 'stealth'] }, STORED)

    expect(patch.skillExpertise).toEqual(['arcana'])
    expect(patch.skillProficiencies).toBeUndefined()
  })

  it('trims stored expertise stranded by a shrinking proficiency list', () => {
    const expert: Character = { ...STORED, skillExpertise: ['arcana'] }
    const patch = normaliseCharacterPatch({ skillProficiencies: ['stealth'] }, expert)

    // Arcana proficiency went away, so its expertise cannot stay behind.
    expect(patch).toEqual({ skillProficiencies: ['stealth'], skillExpertise: [] })
  })
})

describe('fieldErrorsOf', () => {
  it('keys the first message per field, so the form can render it in place', () => {
    const result = characterFormSchema.safeParse({ ...VALID, name: '', level: 99 })

    expect(result.success).toBe(false)
    expect(result.success ? {} : fieldErrorsOf(result.error)).toEqual({
      name: 'Give your character a name',
      level: 'Level must be a whole number between 1 and 20',
    })
  })

  it('files an issue about the object itself under "form"', () => {
    const result = characterPatchSchema.safeParse({})

    expect(result.success ? {} : fieldErrorsOf(result.error)).toEqual({
      form: 'Nothing to change',
    })
  })
})

describe('the 2024 origin block (srd-2024-migration/character-model-migration)', () => {
  it('spells the two ability spreads the same way the SRD data does', () => {
    expect([...BACKGROUND_SPREAD_KEYS]).toEqual(
      BACKGROUND_ABILITY_SPREADS.map((spread) => spread.key),
    )
  })

  it('accepts a body that names none of the six', () => {
    const withoutOrigin = { ...VALID }
    for (const field of Object.keys(ORIGIN)) {
      delete (withoutOrigin as Record<string, unknown>)[field]
    }

    // The promise the migration makes, kept on the wire: a client written
    // before these columns existed still posts a valid character.
    expect(characterFormSchema.safeParse(withoutOrigin).success).toBe(true)
  })

  it('takes null for each of them — "this character has none"', () => {
    const cleared = {
      ...VALID,
      backgroundIndex: null,
      backgroundAbilitySpread: null,
      backgroundAbilities: null,
      originFeatIndex: null,
      subclassIndex: null,
      masteredWeaponIndexes: null,
    }

    expect(characterFormSchema.safeParse(cleared).success).toBe(true)
  })

  it('refuses indexes the SRD data has never heard of', () => {
    expect(messageFor({ ...VALID, backgroundIndex: 'pirate' }, 'backgroundIndex')).toBe(
      'That is not a background this app knows',
    )
    expect(messageFor({ ...VALID, originFeatIndex: 'lucky' }, 'originFeatIndex')).toBe(
      'That is not an origin feat this app knows',
    )
    expect(messageFor({ ...VALID, subclassIndex: 'bladesinging' }, 'subclassIndex')).toBe(
      'That is not a subclass this app knows',
    )
    expect(
      messageFor({ ...VALID, masteredWeaponIndexes: ['plate-armor'] }, 'masteredWeaponIndexes.0'),
    ).toBe('That is not a weapon this app knows')
  })

  it('refuses a spread key that is neither of the two', () => {
    expect(
      characterFormSchema.safeParse({ ...VALID, backgroundAbilitySpread: 'three-and-nothing' })
        .success,
    ).toBe(false)
  })

  it('opens the edit form on what the row holds, nulls and all', () => {
    expect(characterFormValuesOf({ ...STORED, ...ORIGIN })).toMatchObject(ORIGIN)

    const blank = characterFormValuesOf({
      ...STORED,
      backgroundIndex: null,
      backgroundAbilitySpread: null,
      backgroundAbilities: null,
      originFeatIndex: null,
      subclassIndex: null,
      masteredWeaponIndexes: null,
    })

    expect(blank.backgroundIndex).toBeNull()
    expect(blank.masteredWeaponIndexes).toBeNull()
  })

  it('copies the arrays rather than aliasing the row’s', () => {
    const values = characterFormValuesOf({
      ...STORED,
      masteredWeaponIndexes: ['longsword'],
    })

    values.masteredWeaponIndexes?.push('greataxe')

    expect(STORED.masteredWeaponIndexes).toEqual(ORIGIN.masteredWeaponIndexes)
  })
})
