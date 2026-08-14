import { abilityModifier, formatModifier, formatReferenceIndex } from './display'

describe('abilityModifier', () => {
  it('matches the 5e table', () => {
    // Odd and even scores share a modifier, and the floor has to round *down*
    // for scores under 10 — `Math.round` and a naive `| 0` both get 9 wrong.
    expect([1, 8, 9, 10, 11, 14, 15, 20, 30].map(abilityModifier)).toEqual([
      -5, -1, -1, 0, 0, 2, 2, 5, 10,
    ])
  })
})

describe('formatModifier', () => {
  it('signs the number the way a sheet prints it', () => {
    expect(formatModifier(3)).toBe('+3')
    expect(formatModifier(0)).toBe('+0')
    expect(formatModifier(-1)).toBe('-1')
  })

  it('shows a dash rather than NaN for an emptied field', () => {
    expect(formatModifier(abilityModifier(Number.NaN))).toBe('—')
  })
})

describe('formatReferenceIndex', () => {
  it('turns a dnd5eapi index into a label', () => {
    expect(formatReferenceIndex('wizard')).toBe('Wizard')
    expect(formatReferenceIndex('half-elf')).toBe('Half-Elf')
    expect(formatReferenceIndex('dragonborn')).toBe('Dragonborn')
  })

  it('leaves an empty string alone', () => {
    expect(formatReferenceIndex('')).toBe('')
  })
})
