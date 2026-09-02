import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { QuizAnswers } from '@/lib/characters/vibe-quiz'

import { VibeQuizScreen } from './vibe-quiz-screen'

beforeAll(() => {
  window.scrollTo = jest.fn()
})

/** The four answers that describe a hesitant front-liner. */
const SIMPLE_FIGHTER: QuizAnswers = {
  style: 'melee',
  complexity: 'simple',
  role: 'protect',
  flavour: 'training',
}

/** Answer the four questions in order, by the label on each card. */
async function answerAll(user: ReturnType<typeof userEvent.setup>, labels: string[]) {
  for (const label of labels) {
    await user.click(screen.getByRole('radio', { name: new RegExp(label) }))
  }
}

describe('taking the quiz', () => {
  it('opens on an intro that can be skipped without answering anything', async () => {
    const user = userEvent.setup()
    const onSkip = jest.fn()

    render(<VibeQuizScreen onAccept={jest.fn()} onSkip={onSkip} />)

    expect(screen.getByText('Not sure what to play?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Skip/ }))
    expect(onSkip).toHaveBeenCalled()
  })

  it('advances on each answer and lands on a recommendation', async () => {
    const user = userEvent.setup()

    render(<VibeQuizScreen onAccept={jest.fn()} onSkip={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /Answer four questions/ }))
    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument()

    await answerAll(user, ['Wading straight in', 'Keep it simple', 'Deal the damage', 'Study and'])

    expect(screen.getByRole('heading', { name: 'Fighter' })).toBeInTheDocument()
    // The "why this fits" line, in the player's own terms.
    expect(screen.getByText(/thick of it without a list to read first/)).toBeInTheDocument()
  })

  it('shows the rest of the build, not just the class', async () => {
    const user = userEvent.setup()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /See the build/ }))

    expect(screen.getByText('Species')).toBeInTheDocument()
    expect(screen.getByText('Human')).toBeInTheDocument()
    expect(screen.getByText('Soldier')).toBeInTheDocument()
    expect(screen.getByText('Strength and Constitution')).toBeInTheDocument()
  })

  it('lists the spells a caster would start with, and nothing where there are none', async () => {
    const user = userEvent.setup()
    const caster: QuizAnswers = {
      style: 'magic',
      complexity: 'involved',
      role: 'utility',
      flavour: 'training',
    }

    const { unmount } = render(
      <VibeQuizScreen retake initialAnswers={caster} onAccept={jest.fn()} onSkip={jest.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: /See the build/ }))

    expect(screen.getByRole('heading', { name: 'Wizard' })).toBeInTheDocument()
    expect(screen.getByText('Spells')).toBeInTheDocument()

    unmount()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={jest.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /See the build/ }))

    expect(screen.queryByText('Spells')).not.toBeInTheDocument()
  })

  it('hands the answers over when the build is taken', async () => {
    const user = userEvent.setup()
    const onAccept = jest.fn()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={onAccept}
        onSkip={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /See the build/ }))
    await user.click(screen.getByRole('button', { name: 'Use this build' }))

    expect(onAccept).toHaveBeenCalledWith(SIMPLE_FIGHTER)
  })
})

describe('going back over the answers', () => {
  it('walks back to a question and shows what was answered', async () => {
    const user = userEvent.setup()

    render(<VibeQuizScreen onAccept={jest.fn()} onSkip={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /Answer four questions/ }))
    await answerAll(user, ['Wading straight in'])

    expect(screen.getByText('Question 2 of 4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Wading straight in/ })).toBeChecked()
  })

  // A re-run opens with every answer already chosen, and a radio group does not
  // report re-tapping the answer that is already selected — so without Next
  // there would be no way past question one.
  it('offers Next on a question that already has its answer', async () => {
    const user = userEvent.setup()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={jest.fn()}
      />,
    )

    expect(screen.getByRole('radio', { name: /Wading straight in/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Question 2 of 4')).toBeInTheDocument()
  })

  it('gives a different build when an answer changes', async () => {
    const user = userEvent.setup()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('radio', { name: /Slipping out of sight/ }))
    await user.click(screen.getByRole('button', { name: /See the build/ }))

    expect(screen.getByRole('heading', { name: 'Rogue' })).toBeInTheDocument()
  })

  it('starts the questions again from the result', async () => {
    const user = userEvent.setup()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={jest.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /See the build/ }))
    await user.click(screen.getByRole('button', { name: 'Answer again' }))

    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument()
  })

  it('has no Back out of the first question on a re-run, because there is no intro', () => {
    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.queryByText('Not sure what to play?')).not.toBeInTheDocument()
  })

  it('keeps the escape hatch on every screen, under the label it was given', async () => {
    const user = userEvent.setup()
    const onSkip = jest.fn()

    render(
      <VibeQuizScreen
        retake
        initialAnswers={SIMPLE_FIGHTER}
        onAccept={jest.fn()}
        onSkip={onSkip}
        skipLabel="Keep the build I have"
      />,
    )

    expect(screen.getByRole('button', { name: 'Keep the build I have' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /See the build/ }))
    await user.click(screen.getByRole('button', { name: 'Keep the build I have' }))

    expect(onSkip).toHaveBeenCalled()
  })
})
