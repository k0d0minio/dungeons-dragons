'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { partyHint } from '@/lib/characters/party-balance'
import { characterFormSchema, type CharacterFormValues } from '@/lib/characters/schema'
import { quizChoices, type QuizAnswers } from '@/lib/characters/vibe-quiz'
import {
  DEFAULT_CLASS_INDEX,
  recommendedChoices,
  stepsFor,
  wizardCreateBody,
  wizardFormValues,
  withBackground,
  withClass,
  withSpecies,
  type WizardChoices,
  type WizardStepId,
} from '@/lib/characters/wizard'
import { clearDraft, openingDraft, saveDraft } from '@/lib/characters/wizard-draft'
import { cn } from '@/lib/utils'

import { AbilitiesStep } from './abilities-step'
import { backgroundOptions, classOptions, speciesOptions } from './choice-options'
import { EquipmentStep } from './equipment-step'
import { IdentityStep } from './identity-step'
import { OptionList } from './option-list'
import { PartyHintCard } from './party-hint-card'
import { SkillsStep } from './skills-step'
import { SpellsStep } from './spells-step'
import { VibeQuizScreen } from './vibe-quiz-screen'

/** The campaign a wizard is being run for, when there is exactly one it can be. */
export interface WizardCampaign {
  id: string
  name: string
  /**
   * The classes already on that campaign's roster — the character being made is
   * not among them. Read on the server (`/characters/new`) and passed down
   * whole: it is what the class step's composition hint describes, and there is
   * no hint without it (`guided-creation/party-balance-hints`).
   */
  partyClassIndexes: readonly string[]
}

/**
 * Words for the player, keyed by status — the same table `character-form.tsx`
 * keeps, and for the same reason: only a 400 carries the server's own sentence,
 * because only that one was written for a human.
 */
function submitMessageFor(status: number, serverError?: string): string {
  if (status === 400) return serverError ?? 'Something in this character is not valid.'
  if (status === 401) return 'You have been signed out. Sign in again to save this character.'
  if (status === 503) return 'The database is not connected, so this cannot be saved yet.'
  return 'Could not create the character. Try again in a moment.'
}

/** The dots above the step: where you are, and how much is left. */
function StepProgress({ total, position }: { total: number; position: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            index < position ? 'bg-primary' : index === position ? 'bg-primary/60' : 'bg-border',
          )}
        />
      ))}
    </div>
  )
}

/**
 * The guided, stepped character creator (`guided-creation/wizard-frame`).
 *
 * Eight steps, mechanics before flavour, every one of them opening on a
 * recommendation the player can accept with one tap — or skip past entirely
 * with "Use every suggestion", which is the fast path for someone who wants to
 * be playing in ninety seconds. The full SRD list is behind an Advanced toggle
 * on the steps where there is more to see, so nothing is taken away.
 *
 * **State, and why there are two kinds.** `choices` is the wizard's own layer:
 * which slot of the standard array holds Strength, which of the SRD's gear
 * clauses was taken — things that decide a column without being one. The form
 * values those choices produce are validated by react-hook-form against the
 * very `characterFormSchema` the one-page form and `POST /api/characters` use,
 * so this flow cannot invent a character the other two would refuse. No store,
 * no context: the wizard is one screen and its state dies with it.
 *
 * The draft is written to `localStorage` on every change, so a locked phone or
 * a reloaded tab resumes on the step it stopped at (`wizard-draft.ts`).
 */
export function CharacterWizard({ campaign }: { campaign?: WizardCampaign | null }) {
  const router = useRouter()
  const campaignId = campaign?.id ?? null

  const [choices, setChoices] = useState<WizardChoices>(() =>
    recommendedChoices(DEFAULT_CLASS_INDEX),
  )
  const [stepId, setStepId] = useState<WizardStepId>('class')
  const [resumed, setResumed] = useState(false)
  const [restored, setRestored] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // The quiz is a screen in front of the steps rather than a step among them:
  // it answers all eight at once, so it cannot sit in a flow whose Back button
  // means "the previous answer" (`guided-creation/vibe-quiz`).
  //
  // Open to begin with, and closed by the restore below for anyone coming back
  // to a draft. That way round because the server renders this too and cannot
  // see `localStorage`: the first screen of a first character *is* the quiz, so
  // opening on it is the render that is right for the common case and agrees
  // with the server's. A returning player sees it for the one frame it takes to
  // read their draft.
  const [quizOpen, setQuizOpen] = useState(true)
  const [quizRetake, setQuizRetake] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers | null>(null)
  // One tap silences the party hint for the rest of the build — not just the
  // sentence showing at the time. "At most one hint" is the stub's rule, and a
  // dismissal that let the next rule take its place would be a checklist
  // delivered one card at a time. Component state rather than the draft: a
  // returning player resumes on the step they left, which is almost never this
  // one, and a nudge that reappears next week is a nudge about a party that has
  // moved on anyway.
  const [hintDismissed, setHintDismissed] = useState(false)

  // At most one, and only inside a campaign: with no roster to describe there
  // is nothing to say, and `partyHint` answers `null` for an empty party. The
  // current selection is passed in so a gap the player has already filled stops
  // being mentioned (`guided-creation/party-balance-hints`).
  const hint =
    campaign && !hintDismissed ? partyHint(campaign.partyClassIndexes, choices.classIndex) : null

  const steps = stepsFor(choices.classIndex)
  // A class change can take the spells step away underneath a player standing
  // on it, so the position is resolved against the steps that exist now.
  const position = Math.max(
    0,
    steps.findIndex((step) => step.id === stepId),
  )
  const step = steps[position]
  const last = position === steps.length - 1

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterFormSchema),
    defaultValues: wizardFormValues(recommendedChoices(DEFAULT_CLASS_INDEX)),
  })

  // The draft is read *after* mounting, never while rendering. This component
  // is server-rendered too, and the server cannot see `localStorage` — opening
  // straight onto a stored draft would make the first client render disagree
  // with the server's and throw the hydration away. The cost is one frame of
  // the recommendation before the resumed build replaces it.
  //
  // Deferred a tick because the effect body itself must not set state, even
  // transitively (`react-hooks/set-state-in-effect`) — the same shape
  // `table-screen.tsx` uses for its first load.
  useEffect(() => {
    const restore = setTimeout(() => {
      const draft = openingDraft(campaignId)

      setChoices(draft.choices)
      setStepId(draft.stepId)
      setResumed(draft.resumed && draft.stepId !== 'class')
      setQuizAnswers(draft.quizAnswers)
      // The quiz opens for someone starting from nothing, and never for someone
      // coming back: four questions about a character they have already
      // half-made is the wrong screen, and "Retake the quiz" is on the class
      // step for the one who wants it anyway.
      setQuizOpen(!draft.resumed)
      setRestored(true)
    }, 0)

    return () => clearTimeout(restore)
  }, [campaignId])

  // The choices are the source of truth; the form is what validates them. Every
  // tap re-derives the whole value set, which is cheap (it is arithmetic over
  // local data) and means the two can never drift far enough to disagree.
  // Errors go with the reset, so the "name your character" message clears the
  // moment a name is typed rather than waiting for the next submit.
  useEffect(() => {
    reset(wizardFormValues(choices))
  }, [choices, reset])

  // Held until the draft has been read, so the first commit's recommendation
  // cannot overwrite the build the player is coming back to.
  useEffect(() => {
    if (!restored) return
    saveDraft({ stepId: step?.id ?? 'class', campaignId, choices, quizAnswers })
  }, [restored, choices, step, campaignId, quizAnswers])

  const goTo = (next: WizardStepId) => {
    setStepId(next)
    setResumed(false)
    // Each step is its own screen; landing halfway down the last one is
    // disorienting on a phone.
    window.scrollTo({ top: 0 })
  }

  const onSubmit = handleSubmit(async () => {
    setSubmitError(null)

    let response: Response

    try {
      response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardCreateBody(choices, campaignId)),
      })
    } catch {
      setSubmitError('Could not reach the server. Check your connection and try again.')
      return
    }

    if (response.ok) {
      const body = (await response.json().catch(() => null)) as {
        character?: { id?: string }
      } | null

      clearDraft()
      // Straight to the sheet rather than back to the list: the point of the
      // last twenty minutes is the character, and a new player should meet
      // them, not a row about them.
      router.push(body?.character?.id ? `/characters/${body.character.id}` : '/characters')
      router.refresh()
      return
    }

    const body = (await response.json().catch(() => null)) as { error?: string } | null
    setSubmitError(submitMessageFor(response.status, body?.error))
  })

  const startAgain = () => {
    clearDraft()
    setChoices(recommendedChoices(choices.classIndex))
    setQuizAnswers(null)
    goTo('class')
  }

  /**
   * Take the quiz's build — every step answered at once, and the name kept.
   *
   * The name survives because it is the one thing the quiz has no opinion
   * about: someone who typed "Vex Ashbrand", went back and retook the quiz is
   * still making Vex Ashbrand.
   */
  const acceptQuiz = (answers: QuizAnswers) => {
    setChoices({ ...quizChoices(answers), name: choices.name })
    setQuizAnswers(answers)
    setQuizOpen(false)
    goTo('class')
  }

  /** Leave the quiz without taking its answer — on either run it changes nothing. */
  const skipQuiz = () => {
    setQuizOpen(false)
    goTo('class')
  }

  const retakeQuiz = () => {
    setQuizRetake(true)
    setQuizOpen(true)
    window.scrollTo({ top: 0 })
  }

  const campaignCard = campaign ? (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Playing in {campaign.name}</CardTitle>
        <CardDescription>This character joins that table as soon as you finish.</CardDescription>
      </CardHeader>
    </Card>
  ) : null

  // The quiz stands in front of the whole form rather than inside it: it
  // answers every step at once, so it has nothing to do with a Back button that
  // means "the previous answer", and a submit bar under it would offer to
  // create a character nobody has agreed to yet.
  if (quizOpen) {
    return (
      <div className="space-y-4">
        {campaignCard}
        <VibeQuizScreen
          initialAnswers={quizAnswers}
          retake={quizRetake}
          onAccept={acceptQuiz}
          onSkip={skipQuiz}
          skipLabel={quizRetake ? 'Keep the build I have' : 'Skip — I’ll choose myself'}
        />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 pb-28">
      {campaignCard}

      {resumed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Picked up where you left off</CardTitle>
            <CardDescription>
              You were on “{step?.title ?? ''}”.{' '}
              <button type="button" className="underline underline-offset-4" onClick={startAgain}>
                Start again
              </button>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <StepProgress total={steps.length} position={position} />

      <Card>
        <CardHeader>
          <CardDescription>
            Step {position + 1} of {steps.length}
          </CardDescription>
          {/* A real heading, not a styled div: the step title is what this
              screen is, and a screen reader should be able to jump to it. */}
          <CardTitle asChild className="font-serif text-xl">
            <h2>{step?.title}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step?.id === 'class' ? (
            <div className="space-y-3">
              {/* Above the list rather than under it: it is context for the
                  choice, and a note that only turns up after you have scrolled
                  past twelve classes has missed its moment. */}
              {hint ? <PartyHintCard hint={hint} onDismiss={() => setHintDismissed(true)} /> : null}
              <OptionList
                name="class"
                legend="Class"
                options={classOptions(choices.classIndex)}
                value={choices.classIndex}
                onChange={(value) => setChoices((current) => withClass(current, value))}
              />
            </div>
          ) : null}

          {step?.id === 'species' ? (
            <OptionList
              name="species"
              legend="Species"
              options={speciesOptions(choices.speciesIndex)}
              value={choices.speciesIndex}
              onChange={(value) => setChoices((current) => withSpecies(current, value))}
            />
          ) : null}

          {step?.id === 'background' ? (
            <OptionList
              name="background"
              legend="Background"
              options={backgroundOptions(choices.backgroundIndex)}
              value={choices.backgroundIndex}
              onChange={(value) => setChoices((current) => withBackground(current, value))}
            />
          ) : null}

          {step?.id === 'abilities' ? (
            <AbilitiesStep choices={choices} onChange={setChoices} />
          ) : null}

          {step?.id === 'skills' ? <SkillsStep choices={choices} onChange={setChoices} /> : null}

          {step?.id === 'equipment' ? (
            <EquipmentStep choices={choices} onChange={setChoices} />
          ) : null}

          {step?.id === 'spells' ? <SpellsStep choices={choices} onChange={setChoices} /> : null}

          {step?.id === 'identity' ? (
            <IdentityStep
              choices={choices}
              onChange={setChoices}
              nameError={errors.name?.message}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Re-runnable, and from the step it belongs to: the quiz decides the
          class, so the class step is where somebody who does not like its
          answer is standing. Nothing is lost by opening it — the draft is
          untouched until the result is accepted. */}
      {step?.id === 'class' ? (
        <Button type="button" variant="ghost" className="h-11 w-full" onClick={retakeQuiz}>
          {quizAnswers ? 'Retake the quiz' : 'Not sure? Answer four questions instead'}
        </Button>
      ) : null}

      {/* The fast path the research asks for: everything is already answered,
          so "accept all defaults" is simply jumping to the end. Offered right
          up until the last step, because a player who gets bored of choosing on
          step five wants it more than the one on step one did. */}
      {!last ? (
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full"
          onClick={() => goTo('identity')}
        >
          Use every suggestion and name them
        </Button>
      ) : null}

      {submitError ? (
        <p role="alert" className="text-destructive text-sm">
          {submitError}
        </p>
      ) : null}

      {/* Pinned above the tab bar, exactly as the one-page form's save bar is
          (DND-029) — on a phone the way forward should never be scrolled off. */}
      <div className="bg-background/95 fixed inset-x-0 bottom-[var(--bottom-nav-height)] border-t p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={position === 0}
            onClick={() => goTo(steps[position - 1].id)}
          >
            Back
          </Button>
          {last ? (
            <Button type="submit" className="h-11 flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create character'}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 flex-1"
              onClick={() => goTo(steps[position + 1].id)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
