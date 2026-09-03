import { characterInitials, formatDiscoveredOn } from './discovered'

describe('formatDiscoveredOn', () => {
  // August rather than September in the exact-string cases: `en-GB` renders
  // September as "Sept", and which of "Sep"/"Sept" a runtime produces is an
  // ICU-version detail this function has no opinion about. The months that
  // abbreviate to three letters everywhere are the ones worth pinning.
  it('reads as a date a player would say out loud', () => {
    expect(formatDiscoveredOn(new Date('2026-08-15T20:47:00.000Z'))).toBe('15 Aug 2026')
  })

  it('takes the string form the same column arrives as over JSON', () => {
    expect(formatDiscoveredOn('2026-08-15T20:47:00.000Z')).toBe('15 Aug 2026')
  })

  it('reads the date in UTC, so six phones at one table agree', () => {
    // Late UTC evening is already the next day in Sydney and still the same
    // day in London. A server-rendered string that disagreed with the
    // browser's would hydrate mismatched, so neither side gets a choice.
    expect(formatDiscoveredOn('2026-08-15T23:30:00.000Z')).toBe('15 Aug 2026')
  })

  it('drops the time — which session it was is the question, not what hour', () => {
    const early = formatDiscoveredOn('2026-08-15T00:15:00.000Z')
    const late = formatDiscoveredOn('2026-08-15T23:45:00.000Z')

    expect(early).toBe(late)
  })

  it('is empty for something that is not a date, rather than "Invalid Date"', () => {
    expect(formatDiscoveredOn('the night of the wreck')).toBe('')
  })
})

describe('characterInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(characterInitials('Vess Ondrel')).toBe('VO')
  })

  it('is one letter for a one-word name', () => {
    expect(characterInitials('Grud')).toBe('G')
  })

  it('stops at two, however many names a character has', () => {
    expect(characterInitials('Ariadne of the Seven Vales')).toBe('AO')
  })

  it('tolerates the spacing a name is actually typed with', () => {
    expect(characterInitials('  vess   ondrel  ')).toBe('VO')
  })

  it('counts a letter outside ASCII as one letter, not half a surrogate pair', () => {
    expect(characterInitials('Ösvald')).toBe('Ö')
  })

  it('is empty rather than broken for a name with no letters in it', () => {
    // Unreachable through the database's own name check; a fallback that threw
    // on the one row that slipped past it would be the worse bug.
    expect(characterInitials('   ')).toBe('')
  })
})
