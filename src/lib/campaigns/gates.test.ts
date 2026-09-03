import {
  ALL_GATES_OFF,
  ALL_GATES_ON,
  GATES,
  GATE_KEYS,
  parseGates,
  resolveGates,
  type CampaignGates,
} from './gates'

// The three rules this module exists to hold: off is the default, hiding is
// never deleting (nothing here writes anything), and every read fails towards
// more surface rather than less.

describe('the gate list', () => {
  it('describes every gate exactly once, in the order the settings screen lists them', () => {
    expect(GATES.map((gate) => gate.key)).toEqual([...GATE_KEYS])
  })

  it('says what turning each one on adds, and what the players have while it is off', () => {
    // A switch with no explanation beside it is a shrug, and the "while off"
    // half is what makes leaving it off a decision rather than a deferral.
    for (const gate of GATES) {
      expect(gate.label.length).toBeGreaterThan(0)
      expect(gate.adds.length).toBeGreaterThan(0)
      expect(gate.whileOff.length).toBeGreaterThan(0)
    }
  })
})

describe('the experience points gate (D35)', () => {
  it('is one of the switches, so a milestone table has no XP on its sheets', () => {
    // The gate that retires a whole feature rather than deferring one: Jamie's
    // table levels by milestone, and off by default takes the sheet's XP card
    // and the tracker's award step away without deleting a column.
    expect(GATE_KEYS).toContain('experiencePoints')
    expect(ALL_GATES_OFF.experiencePoints).toBe(false)
    expect(resolveGates([null]).experiencePoints).toBe(false)
  })

  it('comes back on for a table that asks for it', () => {
    expect(resolveGates([{ experiencePoints: true }]).experiencePoints).toBe(true)
  })
})

describe('the two constants', () => {
  it('answers every key, so a sheet never reads `undefined` for a gate', () => {
    for (const key of GATE_KEYS) {
      expect(ALL_GATES_ON[key]).toBe(true)
      expect(ALL_GATES_OFF[key]).toBe(false)
    }
  })
})

describe('parseGates', () => {
  it('keeps the known keys a client sent', () => {
    expect(parseGates({ conditions: true, currency: false })).toEqual({
      conditions: true,
      currency: false,
    })
  })

  it('drops keys this build does not know, rather than refusing the body', () => {
    expect(parseGates({ conditions: true, telepathy: true })).toEqual({ conditions: true })
  })

  it('drops a known key whose value is not a boolean', () => {
    // `"true"` off a hand-rolled request is not a gate being switched on.
    expect(parseGates({ conditions: 'true', currency: 1, classResources: null })).toEqual({})
  })

  it('reads anything that is not an object as no gates at all', () => {
    for (const value of [null, undefined, 'conditions', 7, [true], []]) {
      expect(parseGates(value)).toEqual({})
    }
  })
})

describe('resolveGates', () => {
  it('gives a character on no campaign the whole sheet', () => {
    // Nobody has said to simplify this one, so nothing is hidden — and this is
    // the same answer an unreadable or unauthorised read arrives at.
    expect(resolveGates([])).toEqual(ALL_GATES_ON)
  })

  it('reads a campaign that has never touched the screen as everything off', () => {
    expect(resolveGates([null])).toEqual(ALL_GATES_OFF)
    expect(resolveGates([{}])).toEqual(ALL_GATES_OFF)
  })

  it('turns on what the campaign turned on, and nothing else', () => {
    expect(resolveGates([{ conditions: true }])).toEqual({
      ...ALL_GATES_OFF,
      conditions: true,
    })
  })

  it('takes the union across two tables, so a card in use at one never vanishes', () => {
    // One character, one sheet: a player at a beginner table and a veteran one
    // cannot have their coins both hidden and shown.
    const beginner: CampaignGates = { conditions: true }
    const veteran: CampaignGates = { currency: true, spellPreparation: true }

    expect(resolveGates([beginner, veteran])).toEqual({
      ...ALL_GATES_OFF,
      spellPreparation: true,
      conditions: true,
      currency: true,
    })
  })

  it('does not let an explicit `false` at one table close a gate another opened', () => {
    expect(resolveGates([{ currency: true }, { currency: false }]).currency).toBe(true)
  })

  it('survives a column holding something no release ever wrote', () => {
    expect(resolveGates([{ conditions: 'yes' } as unknown as CampaignGates])).toEqual(ALL_GATES_OFF)
  })
})
