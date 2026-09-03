// The vibe quiz: four plain questions to a whole character
// (`guided-creation/vibe-quiz`).
//
// The wizard already opens on a recommendation, but that recommendation is
// "Fighter, because Fighter is the easiest class to run" — an answer to a
// question nobody asked. This module asks the question. Four things a person
// who has never opened a rulebook can answer about the character in their head
// — what they want to be doing, how much they want to keep track of, what their
// job in the group is, where their edge comes from — and a table that turns the
// answers into a class, and through {@link quizChoices} into every step of the
// wizard.
//
// **The table is a table on purpose.** Not a score, not a weighting, not
// "closest match" over a vector of twelve classes: an ordered list of rules
// where the first one that matches wins. A recommendation a person disagrees
// with has to be one you can point at a line of and explain, and the line is
// also what {@link QuizRule.why} prints on the screen. `vibe-quiz.test.ts`
// walks all ninety-six answer combinations through it and holds every one of
// the twelve SRD 5.2.1 classes to being reachable by at least one.
//
// **Simplicity wins where it can.** The research names Champion Fighter and
// Thief Rogue as the lowest cognitive load in the game and says to steer
// hesitant players there (§3), so every "keep it simple" path lands on one of
// those two — with one honest exception: a player who has just said they want
// to cast spells cannot be handed a Fighter. Those four paths get the gentlest
// caster for the source of magic they named, and the `why` line says out loud
// that casting is the part that asks more of you. SRD 5.2.1 carries exactly one
// class per source of magic, so for a caster it is the flavour answer that
// decides and "keep it simple" only changes what the screen says about it —
// there is no simpler way to be a studied spellcaster than to be a Wizard.
import {
  DEFAULT_CLASS_INDEX,
  classGuide,
  curatedSpells,
  recommendedAbilityAssignment,
  recommendedBackgroundAbilities,
  recommendedSkills,
  startingSpellCounts,
  type WizardChoices,
} from '@/lib/characters/wizard'

// ---------------------------------------------------------------------------
// The questions
// ---------------------------------------------------------------------------

/** What you picture yourself doing when a fight starts. */
export type QuizStyle = 'melee' | 'magic' | 'sneak' | 'talk'

/** How much bookkeeping you want a turn to involve. */
export type QuizComplexity = 'simple' | 'involved'

/** Your job in the group. */
export type QuizRole = 'protect' | 'damage' | 'utility'

/** Where the character's power comes from — the flavour question, asked last. */
export type QuizFlavour = 'training' | 'nature' | 'faith' | 'born'

export interface QuizAnswers {
  style: QuizStyle
  complexity: QuizComplexity
  role: QuizRole
  flavour: QuizFlavour
}

/** The four keys, in the order the quiz asks them. */
export const QUIZ_QUESTION_IDS = ['style', 'complexity', 'role', 'flavour'] as const

export type QuizQuestionId = (typeof QUIZ_QUESTION_IDS)[number]

export interface QuizChoice {
  value: string
  /** The answer in the player's words — no class named, no jargon. */
  label: string
  /** One line of what picking it means, still without naming a class. */
  hint: string
}

export interface QuizQuestion {
  id: QuizQuestionId
  /** The question itself, phrased as a person would ask it at a table. */
  prompt: string
  choices: readonly QuizChoice[]
}

/**
 * The four questions.
 *
 * Written to be answerable by someone who does not know what a paladin is, so
 * no answer names a class, an ability score or a mechanic — "protect the group
 * or deal the damage", not "tank or DPS". The order matters: style first
 * because it is the one everybody already has an answer to, flavour last
 * because it is the only one that is purely taste.
 */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'style',
    prompt: 'Trouble starts. What are you doing?',
    choices: [
      {
        value: 'melee',
        label: 'Wading straight in',
        hint: 'Up close, swinging something heavy, taking the hits so nobody else has to.',
      },
      {
        value: 'magic',
        label: 'Casting a spell',
        hint: 'Fire, lightning, healing, or something stranger — from a safe distance.',
      },
      {
        value: 'sneak',
        label: 'Slipping out of sight',
        hint: 'Round the back, unseen, and one very nasty hit when they are not looking.',
      },
      {
        value: 'talk',
        label: 'Talking first',
        hint: 'Charm, bluff or rally the room — a fight you avoid is a fight you win.',
      },
    ],
  },
  {
    id: 'complexity',
    prompt: 'How much do you want to keep track of?',
    choices: [
      {
        value: 'simple',
        label: 'Keep it simple',
        hint: 'A couple of clear choices on your turn. Easy to learn at the table.',
      },
      {
        value: 'involved',
        label: 'Give me options',
        hint: 'Lots of buttons to press, and a list to read between sessions.',
      },
    ],
  },
  {
    id: 'role',
    prompt: 'What is your job in the group?',
    choices: [
      {
        value: 'protect',
        label: 'Keep everyone standing',
        hint: 'Soak the hits, patch people up, be the reason nobody drops.',
      },
      {
        value: 'damage',
        label: 'Deal the damage',
        hint: 'Whatever is in front of the party, you are the reason it stops moving.',
      },
      {
        value: 'utility',
        label: 'Solve the problem',
        hint: 'The locked door, the strange rune, the thing nobody else packed for.',
      },
    ],
  },
  {
    id: 'flavour',
    prompt: 'Where does your edge come from?',
    choices: [
      {
        value: 'training',
        label: 'Study and practice',
        hint: 'You earned every bit of it. Books, drills, years of it.',
      },
      {
        value: 'nature',
        label: 'The wild',
        hint: 'Beasts, weather and country you can read like a page.',
      },
      {
        value: 'faith',
        label: 'Something greater',
        hint: 'A god, an oath, or a patron who answers when you call.',
      },
      {
        value: 'born',
        label: 'It is simply in you',
        hint: 'Blood, instinct, or a temper that does the arguing for you.',
      },
    ],
  },
]

/** Every answer to a question, for the exhaustiveness the mapping is held to. */
export const QUIZ_ANSWER_VALUES: Readonly<Record<QuizQuestionId, readonly string[]>> =
  Object.fromEntries(
    QUIZ_QUESTIONS.map((question) => [question.id, question.choices.map((choice) => choice.value)]),
  ) as unknown as Record<QuizQuestionId, readonly string[]>

// ---------------------------------------------------------------------------
// The mapping table
// ---------------------------------------------------------------------------

export interface QuizRule {
  /** The answers this rule cares about. An absent key matches any answer. */
  when: Partial<QuizAnswers>
  classIndex: string
  /**
   * The "why this fits" line, in the player's own terms — it names what they
   * answered, never the rule. Shown under the recommendation and nowhere else.
   */
  why: string
}

/**
 * Answer combinations to a class, first match wins.
 *
 * Ordered rather than keyed by all four answers because ninety-six rows of
 * which most repeat is not a table anybody can check. The general rules sit at
 * the bottom of each block and the exceptions above them, which is the shape
 * the reasoning actually has: "a sneaky character is a Rogue, unless what they
 * are sneaking through is a forest".
 *
 * The four `simple` blocks at the top are what make the rest of the table safe
 * to write without a `complexity` key: every "keep it simple" answer is caught
 * before it reaches them.
 */
export const QUIZ_RULES: readonly QuizRule[] = [
  // ---- Keep it simple: the two classes the research names, wherever honest --
  {
    when: { complexity: 'simple', style: 'melee' },
    classIndex: 'fighter',
    why: 'You want to be in the thick of it without a list to read first. A Fighter hits hard, takes a beating, and never runs out of anything — the shortest road there is from “I have never played” to “I know what my turn is”.',
  },
  {
    when: { complexity: 'simple', style: 'sneak' },
    classIndex: 'rogue',
    why: 'Out of sight, then one enormous hit. A Rogue does that with two numbers and a bit of nerve, which is about as simple as this game gets.',
  },
  {
    when: { complexity: 'simple', style: 'talk' },
    classIndex: 'rogue',
    why: 'Lying your way in is a Rogue’s day job, and it is the easy way to play a talker — the ones who talk with magic have a spell list to learn first, and you asked to keep it simple.',
  },
  {
    when: { complexity: 'simple', style: 'magic', flavour: 'faith' },
    classIndex: 'cleric',
    why: 'Spells always ask a bit more of you than a sword does — but a Cleric asks the least of a first-timer who wants magic from something greater. Heal, bless, hold the line.',
  },
  {
    when: { complexity: 'simple', style: 'magic', flavour: 'nature' },
    classIndex: 'druid',
    why: 'Magic out of the wild is a Druid, and there is no simpler way to have it. It is a little more to keep track of than you asked for, and worth it for the only class that turns into a bear.',
  },
  {
    when: { complexity: 'simple', style: 'magic', flavour: 'training' },
    classIndex: 'wizard',
    why: 'Magic you studied for is a Wizard. That is the one class where “keep it simple” and “I want spells” pull against each other — you get a book, and the wizard opens you on the six spells worth knowing first.',
  },
  {
    when: { complexity: 'simple', style: 'magic', flavour: 'born' },
    classIndex: 'sorcerer',
    why: 'Magic you were born with, and the shortest spell list of anyone who casts — a Sorcerer knows a handful of spells very well, which is exactly what you asked for.',
  },

  // ---- Up close ------------------------------------------------------------
  {
    when: { style: 'melee', role: 'protect', flavour: 'faith' },
    classIndex: 'paladin',
    why: 'Heavy armour at the front, an oath behind it, and enough healing to pick the party back up. A Paladin is the sworn protector you described almost word for word.',
  },
  {
    when: { style: 'melee', role: 'protect', flavour: 'nature' },
    classIndex: 'barbarian',
    why: 'A Barbarian protects by being the thing worth hitting: raging, half the damage bounces off you. Primal, not pious — which is where you said your edge comes from.',
  },
  {
    when: { style: 'melee', role: 'protect' },
    classIndex: 'fighter',
    why: 'You want to stand between the party and whatever is coming, and you want to be good at it rather than magical about it. That is a Fighter: the best armour in the game and the most attacks.',
  },
  {
    when: { style: 'melee', role: 'damage', flavour: 'faith' },
    classIndex: 'paladin',
    why: 'A Paladin puts an oath behind the swing — the same weapon everyone else has, plus the ability to burn a spell to make one hit hurt enormously.',
  },
  {
    when: { style: 'melee', role: 'damage', flavour: 'training' },
    classIndex: 'monk',
    why: 'Damage out of years of practice rather than a bigger axe. A Monk fights unarmed and unarmoured, moves faster than anyone at the table, and hits several times a turn.',
  },
  {
    when: { style: 'melee', role: 'damage' },
    classIndex: 'barbarian',
    why: 'The biggest weapon, the fewest second thoughts. A Barbarian rages, swings twice as hard as anyone sensible, and shrugs off what comes back.',
  },
  {
    when: { style: 'melee', role: 'utility', flavour: 'faith' },
    classIndex: 'paladin',
    why: 'A Paladin is the front line that also has answers: a short spell list, the ability to sense what is wrong in a room, and the standing to be listened to when you speak.',
  },
  {
    when: { style: 'melee', role: 'utility', flavour: 'nature' },
    classIndex: 'ranger',
    why: 'You want to be useful outside a fight and dangerous inside one, and you want the wild to be where you are useful. A Ranger tracks, forages, and marks its quarry.',
  },
  {
    when: { style: 'melee', role: 'utility' },
    classIndex: 'monk',
    why: 'A Monk is the problem-solver who does it with their body: faster than anyone, over walls, across gaps, and hard to pin down when it goes wrong.',
  },

  // ---- Out of sight --------------------------------------------------------
  {
    when: { style: 'sneak', flavour: 'nature' },
    classIndex: 'ranger',
    why: 'Sneaking through country you know is a Ranger. You shoot from cover, you find the trail nobody else sees, and you are never lost.',
  },
  {
    when: { style: 'sneak' },
    classIndex: 'rogue',
    why: 'Unseen, then one hit that ends the argument — and more skills than anyone else at the table for the half of the game that is not fighting. That is a Rogue.',
  },

  // ---- Talking your way through ---------------------------------------------
  {
    when: { style: 'talk', role: 'damage', flavour: 'faith' },
    classIndex: 'warlock',
    why: 'A patron gave you the words and the fire behind them. A Warlock talks a good game and, when it fails, has one reliable blast they can throw all day.',
  },
  {
    when: { style: 'talk', role: 'damage', flavour: 'born' },
    classIndex: 'warlock',
    why: 'The charm is yours and the power came from a bargain. A Warlock is the talker who never runs dry — one blast, every turn, forever.',
  },
  {
    when: { style: 'talk' },
    classIndex: 'bard',
    why: 'A Bard is the whole of what you described: talks past most of it, makes everyone else better at their job, and has a spell for the bits talking cannot fix.',
  },

  // ---- Spells --------------------------------------------------------------
  {
    when: { style: 'magic', flavour: 'nature' },
    classIndex: 'druid',
    why: 'Magic that comes out of the land: a Druid calls the weather and the wildlife, heals, and turns into an animal when that is the answer.',
  },
  {
    when: { style: 'magic', flavour: 'training' },
    classIndex: 'wizard',
    why: 'You studied for it, so you get the biggest spell list in the game and a book that keeps growing. A Wizard has a spell for every problem — and stays behind whoever is holding the shield.',
  },
  {
    when: { style: 'magic', flavour: 'born' },
    classIndex: 'sorcerer',
    why: 'The magic is in your blood. A Sorcerer knows fewer spells than a Wizard and bends them as they cast — same fireball, twice the range, no warning.',
  },
  {
    when: { style: 'magic', flavour: 'faith', role: 'damage' },
    classIndex: 'warlock',
    why: 'A patron lends you power and asks for things back. A Warlock is the caster built for damage that never stops: one blast every turn, plus favours nobody else can call in.',
  },
  {
    when: { style: 'magic', flavour: 'faith' },
    classIndex: 'cleric',
    why: 'Magic from something greater, spent on keeping people alive. A Cleric heals, blesses the party’s swings, and can still stand in the front line in real armour.',
  },

  // The table above answers all ninety-six combinations — `vibe-quiz.test.ts`
  // proves it. This row exists so the function has a total type rather than an
  // optional one, and so a future question with a new answer degrades into the
  // wizard's own default instead of into `undefined`.
  {
    when: {},
    classIndex: DEFAULT_CLASS_INDEX,
    why: 'A Fighter is where this app starts everyone who has not told it otherwise: hit things, take a beating, and never run out of anything.',
  },
]

/** True when every answer the rule names matches the ones given. */
function matches(rule: QuizRule, answers: QuizAnswers): boolean {
  return QUIZ_QUESTION_IDS.every(
    (id) => rule.when[id] === undefined || rule.when[id] === answers[id],
  )
}

/** The first rule in {@link QUIZ_RULES} these answers satisfy — never `null`. */
export function quizRuleFor(answers: QuizAnswers): QuizRule {
  return QUIZ_RULES.find((rule) => matches(rule, answers)) ?? QUIZ_RULES[QUIZ_RULES.length - 1]
}

// ---------------------------------------------------------------------------
// From a class to a whole character
// ---------------------------------------------------------------------------

/**
 * The skills each answer leans on, best first.
 *
 * The class already narrows the list to five or eight, so this only has to
 * break the tie — and breaking it on what the player just told you is the one
 * place in the build where their answers show up as something they will roll.
 * A skill the class cannot take is simply not there to pick, so these are
 * preferences and never promises.
 */
const SKILL_EMPHASIS: Readonly<Record<string, readonly string[]>> = {
  melee: ['athletics', 'intimidation'],
  magic: ['arcana', 'insight'],
  sneak: ['stealth', 'sleight-of-hand'],
  talk: ['persuasion', 'deception'],
  protect: ['insight', 'medicine'],
  damage: ['perception', 'athletics'],
  utility: ['investigation', 'perception'],
}

/** The skills these answers lean on, style before role, without repeats. */
export function emphasisedSkills(answers: QuizAnswers): string[] {
  return [
    ...new Set([...(SKILL_EMPHASIS[answers.style] ?? []), ...(SKILL_EMPHASIS[answers.role] ?? [])]),
  ]
}

export interface QuizRecommendation {
  classIndex: string
  /** The line to print under the recommendation. */
  why: string
  /** Every wizard step, answered — the same shape `recommendedChoices` returns. */
  choices: WizardChoices
}

/**
 * The complete build these answers recommend.
 *
 * Deliberately built out of the wizard's own recommendation functions rather
 * than beside them: the quiz decides the *class*, and everything the class
 * decides is already decided in `wizard.ts` and already unit-tested there. The
 * one thing the quiz adds downstream is the skills — which the research says
 * are among the few choices that change moment-to-moment play, and which are
 * the only place the player's answers reach the character sheet directly.
 *
 * Species and background stay the class guide's. In the 2024 rules a species
 * grants traits and a walking speed and no ability scores at all, and the
 * background is where a class's two best abilities get their +2/+1 — neither is
 * improved by having a quiz answer pull on it, and both are one tap away on
 * their own step.
 */
export function quizRecommendation(answers: QuizAnswers): QuizRecommendation {
  const rule = quizRuleFor(answers)
  const classIndex = rule.classIndex
  const guide = classGuide(classIndex) ?? classGuide(DEFAULT_CLASS_INDEX)!
  const backgroundIndex = guide.background
  const curated = curatedSpells(classIndex)
  const counts = startingSpellCounts(classIndex)

  return {
    classIndex,
    why: rule.why,
    choices: {
      classIndex,
      speciesIndex: guide.species,
      backgroundIndex,
      abilityAssignment: recommendedAbilityAssignment(classIndex),
      manualScores: null,
      backgroundAbilitySpread: 'two-and-one',
      backgroundAbilities: recommendedBackgroundAbilities(classIndex, backgroundIndex),
      skillProficiencies: recommendedSkills(classIndex, backgroundIndex, emphasisedSkills(answers)),
      skillExpertise: [],
      classEquipmentOption: 0,
      backgroundEquipmentOption: 0,
      cantripIndexes: curated.cantrips.slice(0, counts.cantrips),
      levelOneSpellIndexes: curated.level1.slice(0, Math.max(counts.spellbook, counts.prepared)),
      // The quiz has no opinion about a number the rules already decide, so a
      // build it produces is fully derived — same as `recommendedChoices`.
      manualMaxHitPoints: null,
      manualArmorClass: null,
      manualSpeed: null,
      name: '',
    },
  }
}

/** Just the build — what the wizard is seeded with when the quiz is accepted. */
export function quizChoices(answers: QuizAnswers): WizardChoices {
  return quizRecommendation(answers).choices
}

/**
 * A stored set of answers, or `null` for anything that is not one.
 *
 * The draft is `localStorage` and `localStorage` is a text file a person can
 * edit, so answers coming back out of it are checked against the questions
 * rather than trusted — an answer the quiz no longer offers means the quiz has
 * moved on, and a re-run should start from the top rather than from a value
 * with no card to highlight.
 */
export function parseQuizAnswers(value: unknown): QuizAnswers | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  const valid = QUIZ_QUESTION_IDS.every(
    (id) =>
      typeof candidate[id] === 'string' && QUIZ_ANSWER_VALUES[id].includes(candidate[id] as string),
  )

  return valid ? (candidate as unknown as QuizAnswers) : null
}
