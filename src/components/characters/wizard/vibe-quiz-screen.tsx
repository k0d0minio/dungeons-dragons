'use client'

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ABILITIES } from '@/lib/characters/schema'
import { SKILLS } from '@/lib/characters/rules'
import {
  QUIZ_QUESTIONS,
  quizRecommendation,
  type QuizAnswers,
  type QuizQuestionId,
} from '@/lib/characters/vibe-quiz'
import { BACKGROUNDS } from '@/lib/srd/backgrounds'
import { CLASSES } from '@/lib/srd/classes'
import { SPECIES } from '@/lib/srd/species'
import { SPELLS } from '@/lib/srd/spells'
import { cn } from '@/lib/utils'

import { OptionList } from './option-list'

const ABILITY_LABEL = new Map(ABILITIES.map((ability) => [ability.key as string, ability.label]))
const SKILL_LABEL = new Map(SKILLS.map((skill) => [skill.index, skill.label]))

/** Answers as they are collected: any of the four may still be unanswered. */
type PartialAnswers = Partial<Record<QuizQuestionId, string>>

/** True once all four questions have an answer — and narrows the type with it. */
function complete(answers: PartialAnswers): answers is QuizAnswers {
  return QUIZ_QUESTIONS.every((question) => answers[question.id] !== undefined)
}

/** "Athletics, Stealth and Perception". */
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** One line of the "here is what that gets you" summary. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b py-2 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

/**
 * The whole build, in the six lines a player can actually check.
 *
 * Deliberately not the character sheet: the point of the result screen is to be
 * believed or rejected in about ten seconds, and every one of these is one tap
 * away in the wizard behind it if they want to change it.
 */
function BuildSummary({ answers }: { answers: QuizAnswers }) {
  const { choices } = quizRecommendation(answers)
  const best = choices.abilityAssignment.slice(0, 2)
  const spells = [...choices.cantripIndexes, ...choices.levelOneSpellIndexes]

  return (
    <div className="mt-4">
      <SummaryRow label="Species" value={SPECIES.get(choices.speciesIndex)?.name ?? '—'} />
      <SummaryRow
        label="Background"
        value={BACKGROUNDS.get(choices.backgroundIndex)?.name ?? '—'}
      />
      <SummaryRow
        label="Best at"
        value={joinWords(best.map((ability) => ABILITY_LABEL.get(ability) ?? ability))}
      />
      <SummaryRow
        label="Skills"
        value={joinWords(
          choices.skillProficiencies.map((skill) => SKILL_LABEL.get(skill) ?? skill),
        )}
      />
      {spells.length > 0 ? (
        <SummaryRow
          label="Spells"
          value={joinWords(spells.map((index) => SPELLS.get(index)?.name ?? index))}
        />
      ) : null}
    </div>
  )
}

/**
 * The vibe quiz — the wizard's optional first screen (`guided-creation/vibe-quiz`).
 *
 * Four questions a person who has never opened a rulebook can answer about the
 * character already in their head, and then a whole character: class, species,
 * background, where the standard array goes, which skills, which spells, all of
 * it, with one line saying why it fits what they said. Accepting it drops them
 * into the wizard on step one with every step already answered; the wizard is
 * unchanged behind it, so nothing here is a shortcut past a decision — it is a
 * better starting position for the same eight screens.
 *
 * Tapping an answer advances. Four taps is the whole quiz, which is the only
 * version of it a hesitant player will actually finish, and Back is always
 * there — the answers are held in this component and nothing is written
 * anywhere until "Use this build".
 *
 * The mapping itself is not here. It is a table in `vibe-quiz.ts` with a unit
 * test walking all ninety-six answer combinations through it, because a
 * recommendation is a rule with an opinion attached and this app keeps those in
 * tested modules rather than in JSX.
 */
export function VibeQuizScreen({
  initialAnswers,
  retake = false,
  onAccept,
  onSkip,
  skipLabel = 'Skip — I’ll choose myself',
}: {
  /** What was answered last time, for a re-run. `null` starts from the intro. */
  initialAnswers?: QuizAnswers | null
  /** True when this is a second run over a build that already exists. */
  retake?: boolean
  onAccept: (answers: QuizAnswers) => void
  /** Leave the quiz without taking its answer — the escape hatch, always shown. */
  onSkip: () => void
  skipLabel?: string
}) {
  const [answers, setAnswers] = useState<PartialAnswers>(() => ({ ...(initialAnswers ?? {}) }))
  // `-1` is the intro card; `QUIZ_QUESTIONS.length` is the result. A re-run
  // skips the intro — the player has read it once and is here on purpose.
  const [position, setPosition] = useState(retake ? 0 : -1)

  // Clamped at both ends rather than indexed raw, so the type is a question and
  // not a maybe-question. The two positions outside the range are the intro and
  // the result, and both return before this is ever rendered.
  const question = QUIZ_QUESTIONS[Math.min(Math.max(position, 0), QUIZ_QUESTIONS.length - 1)]
  const finished = position >= QUIZ_QUESTIONS.length
  const answered = answers[question.id] !== undefined

  const goTo = (next: number) => {
    setPosition(next)
    // Each question is its own screen; landing halfway down the next one is
    // disorienting on a phone.
    window.scrollTo({ top: 0 })
  }

  // Answering advances on its own — four taps is the whole quiz, and the only
  // version of it a hesitant player will finish.
  const answer = (value: string) => {
    setAnswers((current) => ({ ...current, [question.id]: value }))
    goTo(position + 1)
  }

  if (position < 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Not sure what to play?</CardTitle>
          <CardDescription>
            Four quick questions about the character in your head, and we will build the whole thing
            — class, species, background, scores, skills and spells. You can change any of it
            afterwards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" className="h-11 w-full" onClick={() => goTo(0)}>
            Answer four questions
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full" onClick={onSkip}>
            {skipLabel}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (finished && complete(answers)) {
    const { classIndex, why } = quizRecommendation(answers)

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardDescription>Sounds like you want to play a</CardDescription>
            <CardTitle asChild className="font-serif text-2xl">
              <h2>{CLASSES.get(classIndex)?.name ?? classIndex}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* The "why this fits" line the stub asks for: written per rule in
                the mapping table, so it answers what they picked rather than
                describing the class in general. */}
            <p className="text-muted-foreground text-sm">{why}</p>
            <BuildSummary answers={answers} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button type="button" className="h-11 w-full" onClick={() => onAccept(answers)}>
            Use this build
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={() => goTo(0)}>
            Answer again
          </Button>
          <Button type="button" variant="ghost" className="h-11 w-full" onClick={onSkip}>
            {skipLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {QUIZ_QUESTIONS.map((entry, index) => (
          <span
            key={entry.id}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index < position ? 'bg-primary' : index === position ? 'bg-primary/60' : 'bg-border',
            )}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            Question {position + 1} of {QUIZ_QUESTIONS.length}
          </CardDescription>
          <CardTitle asChild className="font-serif text-xl">
            <h2>{question.prompt}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OptionList
            name={`quiz-${question.id}`}
            legend={question.prompt}
            options={question.choices.map((choice) => ({
              value: choice.value,
              title: choice.label,
              summary: choice.hint,
            }))}
            value={answers[question.id] ?? ''}
            onChange={answer}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={position === 0 && retake}
          onClick={() => goTo(position - 1)}
        >
          Back
        </Button>
        {/* Only there once this question has an answer — which on a first run
            means only after going Back, because answering advances by itself.
            A re-run opens with every answer already made, and re-tapping the
            one that is already chosen is not a change the radio group reports,
            so without this a retaker could not get past question one. */}
        {answered ? (
          <Button type="button" className="h-11 flex-1" onClick={() => goTo(position + 1)}>
            Next
          </Button>
        ) : null}
      </div>

      {/* The re-run's shortcut: change one answer, jump straight back to the
          result rather than walking the three questions you did not change. */}
      {complete(answers) && position < QUIZ_QUESTIONS.length - 1 ? (
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full"
          onClick={() => goTo(QUIZ_QUESTIONS.length)}
        >
          <span>See the build</span>
          <Badge variant="outline" className="ml-2">
            {CLASSES.get(quizRecommendation(answers).classIndex)?.name ?? ''}
          </Badge>
        </Button>
      ) : null}

      <Button type="button" variant="ghost" className="h-11 w-full" onClick={onSkip}>
        {skipLabel}
      </Button>
    </div>
  )
}
