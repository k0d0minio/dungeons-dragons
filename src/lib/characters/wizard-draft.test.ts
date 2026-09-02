import type { QuizAnswers } from './vibe-quiz'
import { recommendedChoices } from './wizard'
import {
  clearDraft,
  loadDraft,
  openingDraft,
  saveDraft,
  WIZARD_DRAFT_KEY,
  type WizardDraft,
} from './wizard-draft'

const CAMPAIGN = 'a1b2c3d4-0000-4000-8000-000000000001'

const store = window.localStorage as jest.Mocked<Storage>

/** A draft as the wizard writes one, halfway through a wizard's build. */
function halfBuilt(): Omit<WizardDraft, 'updatedAt'> {
  return {
    stepId: 'skills',
    campaignId: null,
    quizAnswers: null,
    choices: { ...recommendedChoices('wizard'), name: 'Vex Ashbrand' },
  }
}

/** The four answers that send a hesitant player to the Fighter. */
const QUIZ_ANSWERS: QuizAnswers = {
  style: 'melee',
  complexity: 'simple',
  role: 'protect',
  flavour: 'training',
}

function stored(): WizardDraft {
  return JSON.parse(String(store.setItem.mock.calls.at(-1)?.[1]))
}

describe('saving and loading', () => {
  it('round-trips a draft under the versioned key', () => {
    saveDraft(halfBuilt())

    expect(store.setItem).toHaveBeenCalledWith(WIZARD_DRAFT_KEY, expect.any(String))
    const written = stored()
    expect(written.choices.name).toBe('Vex Ashbrand')
    expect(written.updatedAt).toEqual(expect.any(String))

    store.getItem.mockReturnValue(JSON.stringify(written))
    expect(loadDraft()?.stepId).toBe('skills')
  })

  it('has nothing to load when nothing was saved', () => {
    store.getItem.mockReturnValue(null)
    expect(loadDraft()).toBeNull()
  })

  it('discards a draft that is not JSON at all', () => {
    store.getItem.mockReturnValue('{ half a')
    expect(loadDraft()).toBeNull()
  })

  it('discards a draft whose shape has moved on', () => {
    store.getItem.mockReturnValue(JSON.stringify({ stepId: 'skills' }))
    expect(loadDraft()).toBeNull()
  })

  it('discards a draft standing on a step the wizard no longer has', () => {
    const draft = { ...halfBuilt(), stepId: 'appearance', updatedAt: 'now' }
    store.getItem.mockReturnValue(JSON.stringify(draft))

    expect(loadDraft()).toBeNull()
  })

  it('round-trips the quiz’s answers so a re-run opens on them', () => {
    saveDraft({ ...halfBuilt(), quizAnswers: QUIZ_ANSWERS })

    store.getItem.mockReturnValue(JSON.stringify(stored()))
    expect(loadDraft()?.quizAnswers).toEqual(QUIZ_ANSWERS)
  })

  // A draft written before the quiz existed is still a character somebody is
  // halfway through making, and losing it to a schema change would be the one
  // failure this file exists to prevent.
  it('keeps a draft written before the quiz existed', () => {
    const older: Record<string, unknown> = { ...halfBuilt(), updatedAt: 'then' }
    delete older.quizAnswers
    store.getItem.mockReturnValue(JSON.stringify(older))

    const loaded = loadDraft()
    expect(loaded?.stepId).toBe('skills')
    expect(loaded?.quizAnswers).toBeNull()
  })

  it('discards answers the quiz does not offer rather than the draft holding them', () => {
    store.getItem.mockReturnValue(
      JSON.stringify({ ...halfBuilt(), quizAnswers: { style: 'brood' }, updatedAt: 'then' }),
    )

    const loaded = loadDraft()
    expect(loaded?.choices.classIndex).toBe('wizard')
    expect(loaded?.quizAnswers).toBeNull()
  })

  it('forgets a draft on request', () => {
    clearDraft()
    expect(store.removeItem).toHaveBeenCalledWith(WIZARD_DRAFT_KEY)
  })
})

// A refusal to remember must never be a refusal to work: a private window can
// throw on the read, on the write, or on the property itself.
describe('when the browser will not store anything', () => {
  it('survives a throwing read', () => {
    store.getItem.mockImplementation(() => {
      throw new Error('denied')
    })

    expect(loadDraft()).toBeNull()
  })

  it('survives a throwing write', () => {
    store.setItem.mockImplementation(() => {
      throw new Error('quota')
    })

    expect(() => saveDraft(halfBuilt())).not.toThrow()
  })

  it('survives a throwing clear', () => {
    store.removeItem.mockImplementation(() => {
      throw new Error('denied')
    })

    expect(() => clearDraft()).not.toThrow()
  })
})

describe('where the wizard opens', () => {
  it('resumes a stored draft on the step it stopped at', () => {
    store.getItem.mockReturnValue(JSON.stringify({ ...halfBuilt(), updatedAt: 'then' }))

    expect(openingDraft(null).stepId).toBe('skills')
  })

  it('opens on the recommendation when there is no draft', () => {
    store.getItem.mockReturnValue(null)
    const draft = openingDraft(null)

    expect(draft.stepId).toBe('class')
    expect(draft.choices.classIndex).toBe('fighter')
    expect(draft.campaignId).toBeNull()
  })

  // A draft written before an SRD update would otherwise resume onto steps
  // whose options have all moved out from under it.
  it('starts again when the draft names a class the data no longer carries', () => {
    const draft = { ...halfBuilt(), updatedAt: 'then' }
    draft.choices.classIndex = 'artificer'
    store.getItem.mockReturnValue(JSON.stringify(draft))

    expect(openingDraft(null).stepId).toBe('class')
  })

  // The quiz is not re-asked of someone coming back, so the wizard has to be
  // able to tell a stored draft from an invented one — and `stepId` cannot say,
  // because a draft abandoned on step one looks exactly like a fresh start.
  it('says whether the opening draft came out of storage', () => {
    store.getItem.mockReturnValue(JSON.stringify({ ...halfBuilt(), updatedAt: 'then' }))
    expect(openingDraft(null).resumed).toBe(true)

    store.getItem.mockReturnValue(null)
    expect(openingDraft(null).resumed).toBe(false)
  })

  it('is not resumed when the stored draft names a class the data lost', () => {
    const draft = { ...halfBuilt(), updatedAt: 'then' }
    draft.choices.classIndex = 'artificer'
    store.getItem.mockReturnValue(JSON.stringify(draft))

    expect(openingDraft(null).resumed).toBe(false)
  })

  it('lets the page’s campaign win over the draft’s', () => {
    store.getItem.mockReturnValue(
      JSON.stringify({ ...halfBuilt(), campaignId: 'old', updatedAt: 'then' }),
    )

    expect(openingDraft(CAMPAIGN).campaignId).toBe(CAMPAIGN)
  })

  it('keeps the draft’s campaign when the page names none', () => {
    store.getItem.mockReturnValue(
      JSON.stringify({ ...halfBuilt(), campaignId: CAMPAIGN, updatedAt: 'then' }),
    )

    expect(openingDraft(null).campaignId).toBe(CAMPAIGN)
  })
})
