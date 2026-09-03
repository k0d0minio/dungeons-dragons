import { CLASSES } from '@/lib/srd/classes'

import {
  CLASS_ROLES,
  MINIMUM_PARTY_SIZE,
  PARTY_HINT_RULES,
  PARTY_ROLES,
  partyComposition,
  partyHint,
  rolesOf,
  type PartyRole,
} from './party-balance'
import { spellcastingAbility } from './rules'

/** Every class the SRD data carries — what the role table is held to. */
const CLASS_INDEXES = [...CLASSES.indexes]

describe('the class role table', () => {
  it('covers every SRD class and nothing else', () => {
    expect(Object.keys(CLASS_ROLES).sort()).toEqual([...CLASS_INDEXES].sort())
  })

  it('gives every class at least one role', () => {
    for (const index of CLASS_INDEXES) {
      expect(rolesOf(index).length).toBeGreaterThan(0)
    }
  })

  it('names only roles the rules know about', () => {
    for (const roles of Object.values(CLASS_ROLES)) {
      for (const role of roles) expect(PARTY_ROLES).toContain(role)
    }
  })

  it('agrees with the rules engine about who casts spells', () => {
    // The one role that is not a judgement call: a class covers `magic` exactly
    // when the 2024 rules give it spellcasting at level 1 — which is why the
    // Paladin and the Ranger are in and the Barbarian is not.
    for (const index of CLASS_INDEXES) {
      expect(rolesOf(index).includes('magic')).toBe(Boolean(spellcastingAbility(index)))
    }
  })

  it('knows nothing about a class the data does not carry', () => {
    expect(rolesOf('artificer')).toEqual([])
  })
})

describe('partyComposition', () => {
  it('counts each role across the roster', () => {
    const composition = partyComposition(['cleric', 'fighter', 'rogue', 'wizard'])

    expect(composition.size).toBe(4)
    expect(composition.counts).toEqual({ heal: 1, front: 1, sneak: 1, magic: 2 })
  })

  it('counts a class it does not know towards the size and no role', () => {
    const composition = partyComposition(['fighter', 'artificer'])

    expect(composition.size).toBe(2)
    expect(composition.counts.magic).toBe(0)
  })

  it('counts a duplicate class twice', () => {
    expect(partyComposition(['rogue', 'rogue', 'rogue']).counts.sneak).toBe(3)
  })
})

describe('partyHint', () => {
  it('says nothing without a campaign', () => {
    expect(partyHint([])).toBeNull()
  })

  it('says nothing about a party too small to have a composition', () => {
    expect(MINIMUM_PARTY_SIZE).toBe(2)
    expect(partyHint(['fighter'])).toBeNull()
  })

  it('says nothing about a balanced party', () => {
    expect(partyHint(['cleric', 'fighter', 'rogue', 'wizard'])).toBeNull()
  })

  it('names a missing healer first', () => {
    const hint = partyHint(['fighter', 'rogue', 'wizard', 'barbarian'])

    expect(hint?.id).toBe('no-healer')
    expect(hint?.kind).toBe('gap')
    expect(hint?.text).toContain('four')
    expect(hint?.text).toContain('heal')
  })

  it('names a missing front line once somebody can heal', () => {
    expect(partyHint(['cleric', 'rogue', 'wizard'])?.id).toBe('no-front-line')
  })

  it('names a missing scout once the front line is covered', () => {
    expect(partyHint(['cleric', 'fighter', 'wizard'])?.id).toBe('no-scout')
  })

  it('has nothing to say about a party with no spells that it does not say about the healer', () => {
    // Every class that heals also casts, so "nobody casts a spell" is always
    // "nobody can heal" wearing a different hat — and the healer line is the
    // one worth reading. There is deliberately no caster gap rule.
    expect(partyHint(['fighter', 'rogue', 'barbarian'])?.id).toBe('no-healer')
    expect(PARTY_HINT_RULES.some((rule) => rule.kind === 'gap' && rule.role === 'magic')).toBe(
      false,
    )
  })

  it('drops a gap the class being picked already fills', () => {
    const party = ['fighter', 'rogue', 'wizard', 'barbarian']

    expect(partyHint(party, 'fighter')?.id).toBe('no-healer')
    // The player has highlighted the Cleric: the gap is answered, and the next
    // rule down takes over rather than the wizard nagging about a filled one.
    expect(partyHint(party, 'cleric')?.id).not.toBe('no-healer')
  })

  it('falls silent when the selection answers every gap it can', () => {
    expect(partyHint(['rogue', 'rogue'], 'cleric')?.id).toBe('no-front-line')
    expect(partyHint(['rogue', 'rogue'], 'paladin')).toBeNull()
  })

  it('mentions a crowded role only when the party has all but leaned into it', () => {
    // Three of four sneak, and the gaps are all filled by the Paladin in the
    // party plus the Cleric being picked.
    expect(partyHint(['rogue', 'rogue', 'ranger', 'paladin'], 'cleric')?.id).toBe('lots-of-sneaks')
    // Three of five is a majority and not a theme: two people are doing
    // something else, which is what an ordinary party looks like.
    expect(partyHint(['rogue', 'rogue', 'ranger', 'paladin', 'cleric'], 'cleric')).toBeNull()
    // Three of six is not even a majority.
    expect(
      partyHint(['rogue', 'rogue', 'ranger', 'paladin', 'fighter', 'cleric'], 'cleric'),
    ).toBeNull()
  })

  it('keeps a crowded hint even when the player is joining that crowd', () => {
    // Doubling up is never discouraged, so the selection does not silence a
    // remark that asks for nothing — and the line says so in words.
    const hint = partyHint(['rogue', 'rogue', 'ranger', 'paladin'], 'rogue')

    expect(hint?.id).toBe('lots-of-sneaks')
    expect(hint?.text).toContain('fine')
  })

  it('offers at most one hint for a party missing everything', () => {
    const hint = partyHint(['fighter', 'fighter'], 'fighter')

    expect(hint?.id).toBe('no-healer')
    expect(hint?.text.split('.').filter(Boolean).length).toBeLessThanOrEqual(3)
  })
})

describe('the hint lines themselves', () => {
  const composition = partyComposition(['rogue', 'rogue', 'rogue', 'wizard', 'paladin'])

  it('has a crowded rule per role, and a gap rule for every role that can be missing', () => {
    const gaps = PARTY_HINT_RULES.filter((rule) => rule.kind === 'gap').map((rule) => rule.role)
    const crowds = PARTY_HINT_RULES.filter((rule) => rule.kind === 'crowded').map(
      (rule) => rule.role,
    )

    expect([...gaps].sort()).toEqual(['front', 'heal', 'sneak'])
    expect([...crowds].sort()).toEqual([...PARTY_ROLES].sort())
  })

  it('gives every rule a unique id', () => {
    const ids = PARTY_HINT_RULES.map((rule) => rule.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('spells the party size out in words rather than printing a numeral', () => {
    for (const rule of PARTY_HINT_RULES) {
      expect(rule.line(composition)).toContain('five')
      expect(rule.line(composition)).not.toMatch(/\d/)
    }
  })

  it('never tells a player what they have to be', () => {
    // The tone the stub asks for, as a lint: informational only, never a
    // requirement, never a word about anyone getting it wrong.
    for (const rule of PARTY_HINT_RULES) {
      expect(rule.line(composition)).not.toMatch(/\b(must|should|need to|wrong|mistake)\b/i)
    }
  })
})

/**
 * Every party of up to five characters, as multisets of the twelve classes.
 *
 * Combinations with repetition rather than permutations: the rules count roles,
 * so `['rogue', 'cleric']` and `['cleric', 'rogue']` are the same party and
 * walking both doubles the work for nothing.
 */
function everyParty(maxSize: number): string[][] {
  const parties: string[][] = []

  const walk = (party: string[], from: number) => {
    if (party.length >= MINIMUM_PARTY_SIZE) parties.push([...party])
    if (party.length === maxSize) return

    for (let index = from; index < CLASS_INDEXES.length; index += 1) {
      party.push(CLASS_INDEXES[index])
      walk(party, index)
      party.pop()
    }
  }

  walk([], 0)
  return parties
}

describe('the table as a whole', () => {
  const parties = everyParty(5)
  const selections: (string | null)[] = [null, ...CLASS_INDEXES]

  /** One pass over every party × every class the wizard could be showing. */
  const fired = new Map<string | null, number>()

  for (const party of parties) {
    for (const selection of selections) {
      const id = partyHint(party, selection)?.id ?? null
      fired.set(id, (fired.get(id) ?? 0) + 1)
    }
  }

  const answered = [...fired.keys()].filter((id): id is string => id !== null)

  it('answers with a rule from the table, or with nothing', () => {
    expect(answered.sort()).toEqual(PARTY_HINT_RULES.map((rule) => rule.id).sort())
  })

  it('leaves no rule unreachable', () => {
    // The guard this suite exists for. The roles contain one another — every
    // class that heals also casts — so a rule can be perfectly written and
    // still sit below one that always wins. Two of them did, before this test.
    for (const rule of PARTY_HINT_RULES) {
      expect(fired.get(rule.id) ?? 0).toBeGreaterThan(0)
    }
  })

  it('keeps silence a common answer', () => {
    // A hint is a remark, not a greeting. A party with a real gap in it should
    // hear about the gap — that is the whole feature — but a fifth of every
    // party-and-selection pair in the game hearing nothing at all is the floor
    // that keeps the crowded rules from turning into a running commentary.
    const total = [...fired.values()].reduce((sum, count) => sum + count, 0)

    expect(fired.get(null) ?? 0).toBeGreaterThan(total / 5)
  })

  it('says nothing to a party that covers the gaps and has not leaned', () => {
    for (const selection of selections) {
      expect(partyHint(['cleric', 'fighter', 'rogue', 'wizard', 'bard'], selection)).toBeNull()
    }
  })
})

/** Types are checked at compile time; this keeps the role union honest at runtime. */
it('exports the four roles in the order they are worth mentioning', () => {
  const expected: PartyRole[] = ['heal', 'front', 'sneak', 'magic']
  expect(PARTY_ROLES).toEqual(expected)
})
