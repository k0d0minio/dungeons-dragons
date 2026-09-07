import {
  isCampaignSpotlight,
  isSameTarget,
  parseSpotlight,
  parseSpotlightTarget,
  stampSpotlight,
  SPOTLIGHT_KIND_LABEL,
  SPOTLIGHT_KIND_NOUN,
  CAMPAIGN_SPOTLIGHT_KINDS,
  REFERENCE_SPOTLIGHT_KINDS,
} from './spotlight'

// The pointer the DM moves (`dm-run-suite/table-screen-cast`). Two properties
// matter here and both are about failing closed: a body that could not name
// anything is refused before it reaches a statement, and a stored value this
// build cannot make sense of reads as "nothing is on the screen" rather than
// as something half-rendered on a wall six people are watching.

const UUID = '3f1a2b4c-5d6e-4f70-8899-aabbccddeeff'

describe('parseSpotlightTarget', () => {
  it('takes a campaign kind with a uuid', () => {
    expect(parseSpotlightTarget({ kind: 'npc', id: UUID })).toEqual({ kind: 'npc', id: UUID })
  })

  it('takes a reference kind with an SRD index', () => {
    expect(parseSpotlightTarget({ kind: 'monster', index: 'adult-red-dragon' })).toEqual({
      kind: 'monster',
      index: 'adult-red-dragon',
    })
  })

  it.each([
    ['not an object', 'npc'],
    ['null', null],
    ['no kind', { id: UUID }],
    ['an unknown kind', { kind: 'secret', id: UUID }],
    ['a campaign kind with no id', { kind: 'npc' }],
    ['a campaign kind with an id that is not a uuid', { kind: 'npc', id: '../../etc' }],
    ['a campaign kind carrying an index instead', { kind: 'handout', index: 'fireball' }],
    ['a reference kind with no index', { kind: 'spell' }],
    ['a reference kind with a path in the index', { kind: 'spell', index: '../monsters/goblin' }],
    ['a reference kind with capitals', { kind: 'condition', index: 'Prone' }],
  ])('refuses %s', (_case, value) => {
    expect(parseSpotlightTarget(value)).toBeNull()
  })
})

describe('parseSpotlight', () => {
  it('reads back what was stored', () => {
    const stored = { kind: 'location', id: UUID, at: '2026-09-07T19:00:00.000Z' }
    expect(parseSpotlight(stored)).toEqual(stored)
  })

  it.each([
    ['a pointer with no stamp', { kind: 'npc', id: UUID }],
    ['a stamp that is not a date', { kind: 'npc', id: UUID, at: 'tuesday' }],
    ['a shape this build has never written', { kind: 'npc', ref: UUID, at: 'now' }],
  ])('reads %s as nothing on the screen', (_case, value) => {
    // A `jsonb` column holds whatever was written into it, including by a
    // build that has since changed its mind about the shape.
    expect(parseSpotlight(value)).toBeNull()
  })
})

describe('stampSpotlight', () => {
  it('stamps the target, and is the only thing that writes `at`', () => {
    const at = new Date('2026-09-07T19:00:00.000Z')

    expect(stampSpotlight({ kind: 'npc', id: UUID }, at)).toEqual({
      kind: 'npc',
      id: UUID,
      at: '2026-09-07T19:00:00.000Z',
    })
  })
})

describe('isCampaignSpotlight', () => {
  it('splits the two families, which are resolved from different places', () => {
    expect(isCampaignSpotlight({ kind: 'handout', id: UUID, at: 'x' })).toBe(true)
    expect(isCampaignSpotlight({ kind: 'spell', index: 'fireball', at: 'x' })).toBe(false)
  })
})

describe('isSameTarget', () => {
  it('marks the row that is live, stamp aside', () => {
    expect(isSameTarget({ kind: 'npc', id: UUID }, { kind: 'npc', id: UUID })).toBe(true)
    expect(
      isSameTarget({ kind: 'monster', index: 'goblin' }, { kind: 'monster', index: 'goblin' }),
    ).toBe(true)
  })

  it.each([
    ['a different kind', { kind: 'npc', id: UUID }, { kind: 'location', id: UUID }],
    ['a different index', { kind: 'spell', index: 'fireball' }, { kind: 'spell', index: 'light' }],
    ['nothing on screen', null, { kind: 'npc', id: UUID }],
    ['nothing offered', { kind: 'npc', id: UUID }, null],
  ] as const)('is false for %s', (_case, a, b) => {
    expect(isSameTarget(a, b)).toBe(false)
  })
})

describe('the labels', () => {
  it('names every kind on both surfaces, so neither can gain one silently', () => {
    for (const kind of [...CAMPAIGN_SPOTLIGHT_KINDS, ...REFERENCE_SPOTLIGHT_KINDS]) {
      expect(SPOTLIGHT_KIND_LABEL[kind]).toBeTruthy()
      expect(SPOTLIGHT_KIND_NOUN[kind]).toBeTruthy()
    }
  })
})
