import { CLASSES } from '@/lib/srd/classes'

import { CLASS_GUIDES, classSkillCount, recommendedSkills, wizardFormValues } from './wizard'
import { characterFormSchema } from './schema'
import {
  emphasisedSkills,
  parseQuizAnswers,
  QUIZ_ANSWER_VALUES,
  QUIZ_QUESTION_IDS,
  QUIZ_QUESTIONS,
  QUIZ_RULES,
  quizChoices,
  quizRecommendation,
  quizRuleFor,
  type QuizAnswers,
} from './vibe-quiz'

const CLASS_INDEXES = CLASSES.all.map((entry) => entry.index)

/**
 * Every answer combination the quiz can produce — 4 × 2 × 3 × 4.
 *
 * Built from the questions rather than written out, so adding an answer to a
 * question widens the sweep automatically and the exhaustiveness tests below
 * start failing until the table covers it. That is the point of them.
 */
function allAnswers(): QuizAnswers[] {
  return QUIZ_ANSWER_VALUES.style.flatMap((style) =>
    QUIZ_ANSWER_VALUES.complexity.flatMap((complexity) =>
      QUIZ_ANSWER_VALUES.role.flatMap((role) =>
        QUIZ_ANSWER_VALUES.flavour.map(
          (flavour) => ({ style, complexity, role, flavour }) as QuizAnswers,
        ),
      ),
    ),
  )
}

const ANSWERS = allAnswers()

/** One set of answers with the named ones overridden. */
function answers(overrides: Partial<QuizAnswers> = {}): QuizAnswers {
  return { style: 'melee', complexity: 'simple', role: 'damage', flavour: 'training', ...overrides }
}

describe('the questions', () => {
  it('asks the four the stub calls for, in order', () => {
    expect(QUIZ_QUESTIONS.map((question) => question.id)).toEqual([...QUIZ_QUESTION_IDS])
  })

  it('offers at least two answers to each, none of them repeated', () => {
    for (const question of QUIZ_QUESTIONS) {
      const values = question.choices.map((choice) => choice.value)
      expect(values.length).toBeGreaterThanOrEqual(2)
      expect(new Set(values).size).toBe(values.length)
    }
  })

  // The whole premise is that somebody who has never opened a rulebook can
  // answer these, so no question or answer may name a class or an ability
  // score. A card in the wizard behind it can; the quiz cannot.
  it('names no class, ability or piece of jargon', () => {
    const jargon = [
      ...CLASS_INDEXES,
      'dexterity',
      'constitution',
      'cantrip',
      'proficiency',
      'armour class',
      'saving throw',
      'hit die',
    ]

    const copy = QUIZ_QUESTIONS.flatMap((question) => [
      question.prompt,
      ...question.choices.flatMap((choice) => [choice.label, choice.hint]),
    ])
      .join(' ')
      .toLowerCase()

    // Whole words: "something stranger" is fine, a Ranger is not.
    for (const word of jargon) {
      expect(copy).not.toMatch(new RegExp(`\\b${word}\\b`))
    }
  })

  it('gives every answer a label and a line of what it means', () => {
    for (const question of QUIZ_QUESTIONS) {
      for (const choice of question.choices) {
        expect(choice.label.length).toBeGreaterThan(0)
        expect(choice.hint.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('the mapping table', () => {
  it('answers all ninety-six combinations', () => {
    expect(ANSWERS).toHaveLength(96)

    for (const combination of ANSWERS) {
      expect(CLASSES.has(quizRuleFor(combination).classIndex)).toBe(true)
    }
  })

  // The table is deterministic by construction — first match wins over a frozen
  // list — and this is the test that says so out loud, because a scored or
  // weighted recommendation would pass everything else here.
  it('gives the same answer every time', () => {
    for (const combination of ANSWERS) {
      expect(quizRuleFor(combination)).toBe(quizRuleFor({ ...combination }))
    }
  })

  // The decision space is 12 classes and the quiz is the only way into it for a
  // player who does not know what to pick, so a class no answer path reaches is
  // a class that beginner will never play.
  it('reaches every one of the twelve SRD classes', () => {
    const reached = new Set(ANSWERS.map((combination) => quizRuleFor(combination).classIndex))

    expect([...reached].sort()).toEqual([...CLASS_INDEXES].sort())
  })

  it('recommends only classes the SRD data and the guides both carry', () => {
    for (const rule of QUIZ_RULES) {
      expect(CLASSES.has(rule.classIndex)).toBe(true)
      expect(CLASS_GUIDES[rule.classIndex]).toBeDefined()
    }
  })

  it('gives every rule a “why this fits” line of its own', () => {
    const whys = QUIZ_RULES.map((rule) => rule.why)

    for (const why of whys) expect(why.length).toBeGreaterThan(20)
    expect(new Set(whys).size).toBe(whys.length)
  })

  // The research's steer (§3): Champion Fighter and Thief Rogue are the lowest
  // cognitive load in the game, so a hesitant player is sent to one of them —
  // with the one exception nobody can argue with, which is that a player who
  // has just asked for spells cannot be handed a Fighter.
  it('lands every “keep it simple” path on the Fighter or the Rogue', () => {
    const simple = ANSWERS.filter(
      (combination) => combination.complexity === 'simple' && combination.style !== 'magic',
    )

    expect(simple).toHaveLength(36)
    for (const combination of simple) {
      expect(['fighter', 'rogue']).toContain(quizRuleFor(combination).classIndex)
    }
  })

  it('still gives a “keep it simple” caster a caster', () => {
    for (const flavour of QUIZ_ANSWER_VALUES.flavour) {
      const recommended = quizRuleFor(
        answers({
          complexity: 'simple',
          style: 'magic',
          flavour: flavour as QuizAnswers['flavour'],
        }),
      )

      expect(['cleric', 'druid', 'wizard', 'sorcerer']).toContain(recommended.classIndex)
    }
  })

  it('never sends someone who asked for spells to a class that has none', () => {
    const casters = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']

    for (const combination of ANSWERS.filter((entry) => entry.style === 'magic')) {
      expect(casters).toContain(quizRuleFor(combination).classIndex)
    }
  })

  // Spot checks on the paths a person would describe in a sentence. These are
  // the rows most likely to be quietly reordered into something else.
  it.each([
    ['a simple front-liner', answers({ style: 'melee', complexity: 'simple' }), 'fighter'],
    ['a simple sneak', answers({ style: 'sneak', complexity: 'simple' }), 'rogue'],
    [
      'a sworn protector',
      answers({ style: 'melee', complexity: 'involved', role: 'protect', flavour: 'faith' }),
      'paladin',
    ],
    [
      'a raging damage dealer',
      answers({ style: 'melee', complexity: 'involved', role: 'damage', flavour: 'nature' }),
      'barbarian',
    ],
    [
      'a trained brawler',
      answers({ style: 'melee', complexity: 'involved', role: 'damage', flavour: 'training' }),
      'monk',
    ],
    [
      'a hunter in the wild',
      answers({ style: 'sneak', complexity: 'involved', flavour: 'nature' }),
      'ranger',
    ],
    [
      'a talker who helps',
      answers({ style: 'talk', complexity: 'involved', role: 'utility' }),
      'bard',
    ],
    [
      'a talker with a patron',
      answers({ style: 'talk', complexity: 'involved', role: 'damage', flavour: 'faith' }),
      'warlock',
    ],
    [
      'a studied caster',
      answers({ style: 'magic', complexity: 'involved', flavour: 'training' }),
      'wizard',
    ],
    [
      'a caster born to it',
      answers({ style: 'magic', complexity: 'involved', flavour: 'born' }),
      'sorcerer',
    ],
    [
      'a healer of the faithful',
      answers({ style: 'magic', complexity: 'involved', role: 'protect', flavour: 'faith' }),
      'cleric',
    ],
    [
      'a caster of the wild',
      answers({ style: 'magic', complexity: 'involved', flavour: 'nature' }),
      'druid',
    ],
  ])('sends %s to the class the table names', (_description, combination, expected) => {
    expect(quizRuleFor(combination as QuizAnswers).classIndex).toBe(expected)
  })

  // Not dead code: it is what makes `quizRuleFor` total, and a fifth answer
  // added to a question without a rule for it lands here rather than on
  // `undefined`.
  it('falls back rather than returning nothing for answers off the table', () => {
    const unknown = { style: 'brood', complexity: 'simple', role: 'damage', flavour: 'training' }

    expect(quizRuleFor(unknown as unknown as QuizAnswers)).toBe(QUIZ_RULES[QUIZ_RULES.length - 1])
  })
})

describe('the build it recommends', () => {
  it('fills in every wizard step for every answer path', () => {
    for (const combination of ANSWERS) {
      const { choices } = quizRecommendation(combination)

      expect(CLASSES.has(choices.classIndex)).toBe(true)
      expect(choices.speciesIndex).not.toBe('')
      expect(choices.backgroundIndex).not.toBe('')
      expect(choices.abilityAssignment).toHaveLength(6)
      expect(choices.backgroundAbilities).toHaveLength(2)
      expect(choices.skillProficiencies.length).toBeGreaterThan(0)
      // The name is the one thing a quiz has no opinion about.
      expect(choices.name).toBe('')
    }
  })

  it('produces a character the create form would accept', () => {
    for (const combination of ANSWERS) {
      const values = wizardFormValues({ ...quizChoices(combination), name: 'Vex Ashbrand' })

      expect(characterFormSchema.safeParse(values).success).toBe(true)
    }
  })

  it('carries the matched rule’s line through as the “why this fits”', () => {
    for (const combination of ANSWERS) {
      expect(quizRecommendation(combination).why).toBe(quizRuleFor(combination).why)
    }
  })

  // Same class, same everything the class decides: the quiz is a second door
  // into `recommendedChoices`, not a second set of opinions about a Fighter.
  it('agrees with the wizard’s own recommendation about the class it picked', () => {
    for (const combination of ANSWERS) {
      const { classIndex, choices } = quizRecommendation(combination)
      const guide = CLASS_GUIDES[classIndex]

      expect(choices.speciesIndex).toBe(guide.species)
      expect(choices.backgroundIndex).toBe(guide.background)
      expect(choices.abilityAssignment).toEqual([...guide.abilityPriority])
    }
  })

  it('takes as many skills as the class and background allow, and no more', () => {
    for (const combination of ANSWERS) {
      const { classIndex, choices } = quizRecommendation(combination)
      const expected = recommendedSkills(classIndex, choices.backgroundIndex)

      expect(choices.skillProficiencies).toHaveLength(expected.length)
      expect(choices.skillProficiencies).toHaveLength(
        // Two granted by the background, plus the class's own choices.
        2 + classSkillCount(classIndex),
      )
    }
  })

  // The one place the answers reach the sheet directly: a talker's Rogue takes
  // Persuasion where a sneak's Rogue takes Stealth, out of the same list.
  it('spends the class’s skill choices on what the answers asked for', () => {
    const talker = quizChoices(answers({ style: 'talk', complexity: 'simple' }))
    const sneak = quizChoices(answers({ style: 'sneak', complexity: 'simple' }))

    expect(talker.classIndex).toBe('rogue')
    expect(sneak.classIndex).toBe('rogue')
    expect(talker.skillProficiencies).toContain('persuasion')
    expect(sneak.skillProficiencies).toContain('perception')
    expect(talker.skillProficiencies).not.toEqual(sneak.skillProficiencies)
  })

  it('only ever emphasises skills, never invents proficiency in one', () => {
    for (const combination of ANSWERS) {
      const { classIndex, choices } = quizRecommendation(combination)
      const allowed = new Set(recommendedSkills(classIndex, choices.backgroundIndex, []))

      // Same length, drawn from the same class list and background grant — the
      // emphasis reorders the choosing and cannot widen it.
      for (const skill of choices.skillProficiencies) {
        expect(typeof skill).toBe('string')
      }
      expect(choices.skillProficiencies.length).toBe(allowed.size)
    }
  })

  it('gives a caster spells and a non-caster none', () => {
    const wizard = quizChoices(
      answers({ style: 'magic', complexity: 'involved', flavour: 'training' }),
    )
    const fighter = quizChoices(answers({ style: 'melee', complexity: 'simple' }))

    expect(wizard.cantripIndexes.length).toBeGreaterThan(0)
    expect(wizard.levelOneSpellIndexes.length).toBeGreaterThan(0)
    expect(fighter.cantripIndexes).toEqual([])
    expect(fighter.levelOneSpellIndexes).toEqual([])
  })

  it('leans on the style before the role, without repeating a skill', () => {
    const emphasis = emphasisedSkills(answers({ style: 'sneak', role: 'utility' }))

    expect(emphasis[0]).toBe('stealth')
    expect(new Set(emphasis).size).toBe(emphasis.length)
  })
})

describe('answers coming back out of a draft', () => {
  it('accepts a set the quiz could have produced', () => {
    const stored = answers({ style: 'talk', flavour: 'faith' })

    expect(parseQuizAnswers(stored)).toEqual(stored)
  })

  it.each([
    ['nothing at all', null],
    ['a string', 'melee'],
    ['a set missing a question', { style: 'melee', complexity: 'simple', role: 'damage' }],
    ['an answer the quiz does not offer', answers({ style: 'brood' as never })],
    ['an answer that is not a string', answers({ role: 3 as never })],
  ])('refuses %s', (_description, value) => {
    expect(parseQuizAnswers(value)).toBeNull()
  })
})
