import { characterFormSchema, CHARACTER_FORM_DEFAULTS, type CharacterFormValues } from './schema'

// The form and `POST /api/characters` both validate against this object, so
// these tests are the contract between them: anything accepted here has to be
// insertable against the CHECK constraints in `src/lib/db/schema.ts`.

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
      'Max HP must be a whole number between 1 and 999'
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
})

describe('CHARACTER_FORM_DEFAULTS', () => {
  it('leaves exactly the three fields the player must supply invalid', () => {
    const result = characterFormSchema.safeParse(CHARACTER_FORM_DEFAULTS)

    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.')).sort()).toEqual(
      ['classIndex', 'name', 'speciesIndex']
    )
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
