import { curatedSpellIndexes, fixedSpellIndexes } from './curated-spells'

describe('curatedSpellIndexes', () => {
  it('carries an opening hand for a casting class', () => {
    const cleric = curatedSpellIndexes('cleric')

    expect(cleric.cantrips).toContain('sacred-flame')
    expect(cleric.level1).toContain('cure-wounds')
  })

  it('is empty for a class that does not cast', () => {
    expect(curatedSpellIndexes('barbarian')).toEqual({ cantrips: [], level1: [] })
  })
})

// The list a sheet shows while its campaign has spell preparation switched off
// (`dm-prep-suite/campaign-feature-gates`). It reads the character record and
// writes nothing — the gate hides the ritual, not the spells.
describe('fixedSpellIndexes', () => {
  it('is what the character holds: the known list and the prepared one, deduplicated', () => {
    expect(
      fixedSpellIndexes('cleric', ['sacred-flame', 'guidance'], ['bless', 'guidance']),
    ).toEqual(['sacred-flame', 'guidance', 'bless'])
  })

  it('keeps a wizard to their own book rather than the whole class list', () => {
    const book = ['fire-bolt', 'magic-missile', 'shield']

    expect(fixedSpellIndexes('wizard', book, ['magic-missile'])).toEqual(book)
  })

  it('falls back to the curated set for a caster whose record holds nothing', () => {
    // A cleric prepares from the whole class list, so an untouched record
    // legitimately has no spells on it — and "no spells" would be wrong about
    // a character who can cast.
    const cleric = fixedSpellIndexes('cleric', [], [])
    const curated = curatedSpellIndexes('cleric')

    expect(cleric).toEqual([...curated.cantrips, ...curated.level1])
  })

  it('leaves a non-caster with nothing, and never invents a spell for one', () => {
    expect(fixedSpellIndexes('fighter', [], [])).toEqual([])
  })

  it('lists what a non-caster has been given, though — a wand is a real thing to carry', () => {
    expect(fixedSpellIndexes('fighter', ['magic-missile'], [])).toEqual(['magic-missile'])
  })
})
