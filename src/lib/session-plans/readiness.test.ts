import { planReadiness, stillToDo } from './readiness'

// How far through a night's prep the DM is, and what the hero says about it
// (`dm-chronology/prep-tab`). Five steps today; `eight-steps-plan` makes them
// eight, and nothing that reads this counts to a literal number.

const EMPTY = {
  plan: { strongStart: null, treasure: null },
  items: [],
  links: [],
}

const FULL = {
  plan: { strongStart: 'The door is already open.', treasure: 'A silvered dagger.' },
  items: [{ kind: 'scene' }, { kind: 'secret' }],
  links: [{ id: 'link-1' }],
}

describe('planReadiness', () => {
  it('reads a night nobody has written yet as none of five', () => {
    const readiness = planReadiness(EMPTY)

    expect(readiness).toMatchObject({ ready: 0, total: 5 })
    expect(readiness.steps.every((step) => !step.ready)).toBe(true)
  })

  it('reads a night with all five sections written as ready', () => {
    const readiness = planReadiness(FULL)

    expect(readiness).toMatchObject({ ready: 5, total: 5 })
    expect(stillToDo(readiness)).toBe('')
  })

  it('counts each section on its own', () => {
    const readiness = planReadiness({
      plan: { strongStart: 'A scream from the kitchen.', treasure: null },
      items: [{ kind: 'secret' }],
      links: [],
    })

    expect(readiness.ready).toBe(2)
    expect(readiness.steps.filter((step) => step.ready).map((step) => step.key)).toEqual([
      'strongStart',
      'secrets',
    ])
  })

  it('does not count a field of whitespace as written', () => {
    expect(planReadiness({ ...EMPTY, plan: { strongStart: '   \n ', treasure: null } }).ready).toBe(
      0,
    )
  })

  it('separates scenes from secrets — one kind of line is not the other', () => {
    const scenesOnly = planReadiness({ ...EMPTY, items: [{ kind: 'scene' }] })

    expect(scenesOnly.steps.find((step) => step.key === 'scenes')?.ready).toBe(true)
    expect(scenesOnly.steps.find((step) => step.key === 'secrets')?.ready).toBe(false)
  })
})

describe('stillToDo', () => {
  it('names what is left, as a DM would say it', () => {
    const readiness = planReadiness({
      plan: { strongStart: 'A scream.', treasure: null },
      items: [{ kind: 'scene' }, { kind: 'secret' }],
      links: [],
    })

    expect(stillToDo(readiness)).toBe('the prep it leans on and treasure')
  })

  it('names one thing without a conjunction', () => {
    const readiness = planReadiness({ ...FULL, plan: { ...FULL.plan, treasure: null } })

    expect(stillToDo(readiness)).toBe('treasure')
  })

  it('stops at three names and counts the rest — this line sits on a phone', () => {
    expect(stillToDo(planReadiness(EMPTY))).toBe('a strong start, scenes, secrets and 2 more')
  })
})
