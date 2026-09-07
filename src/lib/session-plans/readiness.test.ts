import { planReadiness, stillToDo, type PartyCount, type ReadablePlan } from './readiness'

// The Lazy DM's eight steps over one night's prep
// (`dm-chronology/eight-steps-plan`), and what the hero says about them.
//
// The eight are on trial here in three states — a night nobody has written, a
// night with all eight done, and each partial in between — because the plan
// screen prints one row per step and the Prep tab's hero prints the tally, and
// a step that goes green early is a DM told he is ready when he is not.

const NOBODY: PartyCount = { total: 0, notReady: 0 }
const PARTY: PartyCount = { total: 5, notReady: 0 }
const RAGGED: PartyCount = { total: 5, notReady: 1 }

const EMPTY: ReadablePlan = {
  plan: { strongStart: null, treasure: null },
  items: [],
  links: [],
}

const FULL: ReadablePlan = {
  plan: { strongStart: 'The door is already open.', treasure: 'A silvered dagger.' },
  items: [{ kind: 'scene' }, { kind: 'secret' }],
  links: [
    { kind: 'location', label: 'The lighthouse' },
    { kind: 'npc', label: 'Halda the harbourmaster' },
    { kind: 'encounter', label: 'Ambush on the causeway' },
  ],
}

/** The step with this key, or a failure that names it rather than a crash. */
function step(readiness: ReturnType<typeof planReadiness>, key: string) {
  const found = readiness.steps.find((one) => one.key === key)
  if (!found) throw new Error(`No step ${key} — the eight are ${readiness.steps.map((s) => s.key)}`)
  return found
}

describe('planReadiness', () => {
  it('reads a night nobody has written yet as none of eight', () => {
    const readiness = planReadiness(EMPTY, NOBODY)

    expect(readiness).toMatchObject({ ready: 0, total: 8 })
    expect(readiness.steps.every((one) => !one.ready)).toBe(true)
  })

  it('puts the eight in the order the book writes them', () => {
    expect(planReadiness(EMPTY, NOBODY).steps.map((one) => one.key)).toEqual([
      'characters',
      'strongStart',
      'scenes',
      'secrets',
      'locations',
      'npcs',
      'monsters',
      'treasure',
    ])
  })

  it('reads a night with all eight steps done as ready', () => {
    const readiness = planReadiness(FULL, PARTY)

    expect(readiness).toMatchObject({ ready: 8, total: 8 })
    expect(stillToDo(readiness)).toBe('')
  })

  it('counts each step on its own', () => {
    const readiness = planReadiness(
      {
        plan: { strongStart: 'A scream from the kitchen.', treasure: null },
        items: [{ kind: 'secret' }],
        links: [{ kind: 'npc', label: 'Halda' }],
      },
      NOBODY,
    )

    expect(readiness.ready).toBe(3)
    expect(readiness.steps.filter((one) => one.ready).map((one) => one.key)).toEqual([
      'strongStart',
      'secrets',
      'npcs',
    ])
  })

  it('does not count a field of whitespace as written', () => {
    const readiness = planReadiness(
      { ...EMPTY, plan: { strongStart: '   \n ', treasure: null } },
      NOBODY,
    )

    expect(readiness.ready).toBe(0)
    expect(step(readiness, 'strongStart').status).toBe('Empty')
  })

  it('separates scenes from secrets — one kind of line is not the other', () => {
    const readiness = planReadiness({ ...EMPTY, items: [{ kind: 'scene' }] }, NOBODY)

    expect(step(readiness, 'scenes').ready).toBe(true)
    expect(step(readiness, 'secrets').ready).toBe(false)
  })

  it('splits the three link kinds into three steps of their own', () => {
    const readiness = planReadiness(
      { ...EMPTY, links: [{ kind: 'location', label: 'The lighthouse' }] },
      NOBODY,
    )

    expect(step(readiness, 'locations')).toMatchObject({ ready: true, status: 'The lighthouse' })
    expect(step(readiness, 'npcs')).toMatchObject({ ready: false, status: 'None linked' })
    expect(step(readiness, 'monsters').ready).toBe(false)
  })

  it('names every linked thing of a kind on its own step', () => {
    const readiness = planReadiness(
      {
        ...EMPTY,
        links: [
          { kind: 'npc', label: 'Halda' },
          { kind: 'npc', label: 'The keeper' },
          { kind: 'location', label: 'The lighthouse' },
        ],
      },
      NOBODY,
    )

    expect(step(readiness, 'npcs').status).toBe('Halda · The keeper')
  })

  it('points a night with no fight at the encounter builder, in words', () => {
    expect(step(planReadiness(EMPTY, NOBODY), 'monsters').status).toBe(
      'Nothing built yet — open the encounter builder',
    )
  })

  describe('review the characters', () => {
    it('is done when there is a party and every sheet on it is ready', () => {
      expect(step(planReadiness(EMPTY, PARTY), 'characters')).toMatchObject({
        ready: true,
        status: '5 characters · all ready',
      })
    })

    it('is not done while a sheet is unfinished, and says how many', () => {
      expect(step(planReadiness(EMPTY, RAGGED), 'characters')).toMatchObject({
        ready: false,
        status: '5 characters · 1 not ready',
      })
    })

    it('is not done when nobody has made a character yet', () => {
      expect(step(planReadiness(EMPTY, NOBODY), 'characters')).toMatchObject({
        ready: false,
        status: 'Nobody at the table yet',
      })
    })

    it('counts one character in the singular', () => {
      expect(step(planReadiness(EMPTY, { total: 1, notReady: 0 }), 'characters').status).toBe(
        '1 character · all ready',
      )
    })
  })

  describe('what a step says about itself', () => {
    it('counts the lines of a written strong start', () => {
      const readiness = planReadiness(
        { ...EMPTY, plan: { strongStart: 'One.\n\nTwo.\nThree.', treasure: null } },
        NOBODY,
      )

      expect(step(readiness, 'strongStart').status).toBe('Written · 3 lines')
    })

    it('counts a one-paragraph strong start in the singular', () => {
      const readiness = planReadiness(
        { ...EMPTY, plan: { strongStart: 'The tide is out.', treasure: null } },
        NOBODY,
      )

      expect(step(readiness, 'strongStart').status).toBe('Written · 1 line')
    })

    it('says how many scenes there are', () => {
      const items = [{ kind: 'scene' }, { kind: 'scene' }, { kind: 'scene' }, { kind: 'scene' }]

      expect(step(planReadiness({ ...EMPTY, items }, NOBODY), 'scenes').status).toBe('4 scenes')
    })

    it('says one scene in the singular', () => {
      expect(
        step(planReadiness({ ...EMPTY, items: [{ kind: 'scene' }] }, NOBODY), 'scenes').status,
      ).toBe('1 scene')
    })

    it('keeps asking for about ten secrets until there are about ten', () => {
      const items = Array.from({ length: 7 }, () => ({ kind: 'secret' }))

      expect(step(planReadiness({ ...EMPTY, items }, NOBODY), 'secrets').status).toBe(
        '7 written · aim for about 10',
      )
    })

    it('stops nagging once the night has ten secrets on it', () => {
      const items = Array.from({ length: 10 }, () => ({ kind: 'secret' }))

      expect(step(planReadiness({ ...EMPTY, items }, NOBODY), 'secrets').status).toBe('10 written')
    })

    it('reports the treasure the same way as the strong start', () => {
      const readiness = planReadiness(
        { ...EMPTY, plan: { strongStart: null, treasure: 'A silvered dagger.' } },
        NOBODY,
      )

      expect(step(readiness, 'treasure').status).toBe('Written · 1 line')
    })
  })
})

describe('stillToDo', () => {
  it('names what is left, as a DM would say it', () => {
    const readiness = planReadiness(
      {
        plan: { strongStart: 'A scream.', treasure: null },
        items: [{ kind: 'scene' }, { kind: 'secret' }],
        links: FULL.links,
      },
      PARTY,
    )

    expect(stillToDo(readiness)).toBe('treasure')
  })

  it('joins two with a conjunction and no comma', () => {
    const readiness = planReadiness({ ...FULL, plan: { strongStart: null, treasure: null } }, PARTY)

    expect(stillToDo(readiness)).toBe('a strong start and treasure')
  })

  it('stops at three names and counts the rest — this line sits on a phone', () => {
    expect(stillToDo(planReadiness(EMPTY, NOBODY))).toBe(
      'the characters, a strong start, scenes and 5 more',
    )
  })
})
