import { render, screen, waitFor, within } from '@testing-library/react'
import type React from 'react'
import userEvent from '@testing-library/user-event'

import { recommendedChoices } from '@/lib/characters/wizard'
import {
  ABILITY_IN_PLAY,
  BACKGROUND_IN_PLAY,
  CLASS_IN_PLAY,
  GEAR_IN_PLAY,
  SKILL_IN_PLAY,
  SPECIES_IN_PLAY,
  SPELL_IN_PLAY,
  WEAPON_GROUP_IN_PLAY,
} from '@/lib/srd/in-play'
import { WIZARD_DRAFT_KEY } from '@/lib/characters/wizard-draft'

import { CharacterWizard } from './character-wizard'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const store = window.localStorage as jest.Mocked<Storage>

const CAMPAIGN = { id: 'a1b2c3d4-0000-4000-8000-000000000001', name: 'Frostmaiden' }

// Radix's Select drives itself with pointer capture and scrolls the highlighted
// option into view — neither of which jsdom implements.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
  window.scrollTo = jest.fn()
})

beforeEach(() => {
  store.getItem.mockReturnValue(null)
  mockFetch.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ character: { id: 'c1' } }),
  } as Response)
})

/**
 * Render, then step past the vibe quiz onto the wizard's first step.
 *
 * The quiz is the wizard's opening screen for anyone without a draft
 * (`guided-creation/vibe-quiz`), and skipping it is exactly what the tests
 * below are about — the eight steps behind it are unchanged by it, which is
 * the property the skip button is there to guarantee.
 */
async function renderWizard(
  user: ReturnType<typeof userEvent.setup>,
  props: React.ComponentProps<typeof CharacterWizard> = {},
) {
  render(<CharacterWizard {...props} />)
  // Waited for rather than raced: the draft is read a tick after mount and is
  // what decides whether the quiz stays open.
  await waitFor(() => expect(store.getItem).toHaveBeenCalled())
  await user.click(screen.getByRole('button', { name: /Skip/ }))
}

/** Walk forward `count` steps with the pinned Next button. */
async function next(user: ReturnType<typeof userEvent.setup>, count = 1) {
  for (let step = 0; step < count; step += 1) {
    await user.click(screen.getByRole('button', { name: 'Next' }))
  }
}

/** The body of the last POST the wizard made. */
function postedBody() {
  const [, init] = mockFetch.mock.calls.at(-1) as [string, RequestInit]
  return JSON.parse(String(init.body))
}

describe('the steps', () => {
  it('opens on the class step with the recommendation already chosen', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    // Seven, not eight: the Fighter the wizard opens on casts nothing, so the
    // spells step is not part of their flow at all.
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Fighter/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('walks forward and back through the steps', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user)
    expect(screen.getByRole('heading', { name: 'Pick a species' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Pick a class' })).toBeInTheDocument()
  })

  // Seven of the twelve classes cast nothing at level 1, and an empty "Spells"
  // step reads as something broken rather than something they do not get.
  it('has no spells step for a class that casts nothing', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Barbarian/ }))
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()
  })

  it('offers the fast path straight to the name, and drops it there', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))

    expect(screen.getByRole('heading', { name: 'Name your character' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Use every suggestion/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create character' })).toBeInTheDocument()
  })
})

describe('the choices', () => {
  it('re-seats the whole build when the class changes', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await next(user, 4)

    // A wizard's skills, chosen from a wizard's list — nothing of the fighter
    // the flow opened on survives the change.
    expect(screen.getByRole('heading', { name: 'Choose your skills' })).toBeInTheDocument()
    expect(screen.getByText('Arcana')).toBeInTheDocument()
    expect(screen.queryByText('Athletics')).not.toBeInTheDocument()
  })

  it('shows the background’s increases landing on the scores', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 3)

    // Fighter with the Soldier background: 15 in Strength, +2 from the
    // background, and the sum shown next to where it came from.
    expect(screen.getByText('17')).toBeInTheDocument()
    expect(screen.getByText(/15 \+2/)).toBeInTheDocument()
  })

  it('names the gear each option gives rather than lettering them', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 5)

    expect(screen.getByRole('heading', { name: 'Take your starting gear' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Chain Mail/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /155 gp and buy your own/ })).toBeInTheDocument()
  })

  it('pre-ticks the suggested spells and keeps the rest of the list folded away', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await next(user, 6)

    expect(screen.getByRole('heading', { name: 'Choose your spells' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /^Fire Bolt/ })).toBeChecked()
    // Not a suggestion, so it is behind the Advanced toggle rather than gone.
    expect(screen.queryByRole('checkbox', { name: 'Acid Splash' })).not.toBeInTheDocument()
  })
})

describe('changing what was suggested', () => {
  it('moves the background’s +2 without ever landing both increases on one score', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 3)

    // Soldier suggests +2 Strength, +1 Constitution. Putting the +2 on
    // Constitution has to move Strength out of the way, not double it up.
    await user.click(screen.getByRole('combobox', { name: '+2 to' }))
    await user.click(screen.getByRole('option', { name: 'Constitution' }))

    expect(screen.getByRole('combobox', { name: '+2 to' })).toHaveTextContent('Constitution')
    expect(screen.getByRole('combobox', { name: '+1 to' })).toHaveTextContent('Strength')
  })

  it('takes the coin instead of the kit, on both gear questions', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 5)

    await user.click(screen.getByRole('radio', { name: /155 gp/ }))
    await user.click(screen.getByRole('radio', { name: /50 gp/ }))
    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(postedBody()).toMatchObject({
      classEquipmentOption: 2,
      backgroundEquipmentOption: 1,
    })
  })

  it('unticks a suggested spell and posts what is left', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await next(user, 6)

    await user.click(screen.getByRole('checkbox', { name: /^Fire Bolt/ }))
    expect(screen.getByRole('checkbox', { name: /^Fire Bolt/ })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Vex')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(postedBody().knownSpellIndexes).not.toContain('fire-bolt')
  })

  it('shows the whole build under the name as it is typed', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Barbarian/ }))
    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))

    // Goliath, so 35 feet — the species is the only thing speed comes from.
    expect(screen.getByText('Level 1 Goliath Barbarian · Soldier')).toBeInTheDocument()
    expect(screen.getByText('35 ft.')).toBeInTheDocument()
  })
})

describe('creating the character', () => {
  it('refuses a character with no name, on the field', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Give your character a name')
    expect(mockFetch).not.toHaveBeenCalled()

    // And it goes as soon as there is a name, rather than waiting for the
    // player to submit again to find out they fixed it.
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('posts the whole build and opens the character’s sheet', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune Ironhide')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/characters/c1'))

    const body = postedBody()
    expect(body).toMatchObject({
      name: 'Brune Ironhide',
      classIndex: 'fighter',
      level: 1,
      backgroundIndex: 'soldier',
      classEquipmentOption: 0,
      campaignId: null,
    })
    // Derived, never asked for: hit die plus Constitution at 1st level.
    expect(body.maxHitPoints).toBe(12)
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('carries the campaign it was started from', async () => {
    const user = userEvent.setup()
    await renderWizard(user, { campaign: CAMPAIGN })

    expect(screen.getByText('Playing in Frostmaiden')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(postedBody().campaignId).toBe(CAMPAIGN.id)
  })

  it('forgets the draft once the character exists', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(store.removeItem).toHaveBeenCalledWith(WIZARD_DRAFT_KEY))
  })

  it('says what went wrong without losing the build', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'The database is not connected.' }),
    } as Response)

    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The database is not connected, so this cannot be saved yet.',
    )
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Name')).toHaveValue('Brune')
  })

  it('says so when the request never left', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server')
  })
})

describe('the draft', () => {
  it('writes every change, so a locked phone loses nothing', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))

    await waitFor(() => {
      const written = JSON.parse(String(store.setItem.mock.calls.at(-1)?.[1]))
      expect(written.choices.classIndex).toBe('wizard')
    })
  })

  it('resumes where it stopped, and can be thrown away', async () => {
    const user = userEvent.setup()
    store.getItem.mockReturnValue(
      JSON.stringify({
        stepId: 'skills',
        campaignId: null,
        updatedAt: 'then',
        choices: { ...recommendedChoices('wizard'), name: 'Vex' },
      }),
    )

    render(<CharacterWizard />)

    // No quiz for someone coming back — four questions about a character they
    // have already half-made is the wrong screen.
    expect(await screen.findByText('Picked up where you left off')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Choose your skills' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start again' }))

    expect(screen.getByRole('heading', { name: 'Pick a class' })).toBeInTheDocument()
    expect(screen.queryByText('Picked up where you left off')).not.toBeInTheDocument()
    expect(store.removeItem).toHaveBeenCalledWith(WIZARD_DRAFT_KEY)
  })

  it('says nothing about resuming when the draft was on the first step', async () => {
    store.getItem.mockReturnValue(
      JSON.stringify({
        stepId: 'class',
        campaignId: null,
        updatedAt: 'then',
        choices: recommendedChoices('fighter'),
      }),
    )

    render(<CharacterWizard />)

    await waitFor(() => expect(store.getItem).toHaveBeenCalled())
    expect(screen.queryByText('Picked up where you left off')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Not sure what to play/ })).not.toBeInTheDocument()
  })
})

describe('the vibe quiz in front of the steps', () => {
  /** Answer the four questions in order, by the label on each card. */
  async function answerAll(user: ReturnType<typeof userEvent.setup>, labels: string[]) {
    for (const label of labels) {
      await user.click(screen.getByRole('radio', { name: new RegExp(label) }))
    }
  }

  it('is the first screen for someone starting from nothing', async () => {
    render(<CharacterWizard />)

    await waitFor(() => expect(store.getItem).toHaveBeenCalled())
    expect(screen.getByText('Not sure what to play?')).toBeInTheDocument()
    expect(screen.queryByText('Step 1 of 7')).not.toBeInTheDocument()
  })

  it('drops into the wizard with every step pre-filled from the answers', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await waitFor(() => expect(store.getItem).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /Answer four questions/ }))
    await answerAll(user, [
      'Casting a spell',
      'Give me options',
      'Solve the problem',
      'Study and practice',
    ])
    await user.click(screen.getByRole('button', { name: 'Use this build' }))

    // Step one of the wizard, standing on the class the quiz chose — and eight
    // steps rather than seven, because this one casts.
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Wizard/ })).toBeChecked()

    await next(user, 2)
    expect(screen.getByRole('radio', { name: /Sage/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Vex Ashbrand')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const body = postedBody()
    expect(body).toMatchObject({
      classIndex: 'wizard',
      backgroundIndex: 'sage',
      speciesIndex: 'human',
    })
    expect(body.knownSpellIndexes).toContain('fire-bolt')
  })

  it('spends the class’s skill choices on what the answers asked for', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await waitFor(() => expect(store.getItem).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /Answer four questions/ }))
    await answerAll(user, ['Talking first', 'Keep it simple', 'Solve the problem', 'Study and'])
    await user.click(screen.getByRole('button', { name: 'Use this build' }))

    // A Rogue, because "keep it simple" is steered at the two the research
    // names — but a talker's Rogue, so the skills are the talking ones.
    expect(screen.getByRole('radio', { name: /Rogue/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Sable')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(postedBody().skillProficiencies).toContain('persuasion')
  })

  it('leaves the build alone when it is skipped', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    expect(screen.getByRole('radio', { name: /Fighter/ })).toBeChecked()
    expect(screen.queryByText('Not sure what to play?')).not.toBeInTheDocument()
  })

  it('is re-runnable from the class step, and keeps the name across the re-run', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Sable')

    // Back to the class step by walking, then into the quiz from there — the
    // quiz decides the class, so the class step is where its offer lives.
    while (screen.queryByRole('heading', { name: 'Pick a class' }) === null) {
      await user.click(screen.getByRole('button', { name: 'Back' }))
    }

    await user.click(screen.getByRole('button', { name: /Answer four questions instead/ }))

    // No intro on a re-run — the player has read it and is here on purpose.
    expect(screen.queryByText('Not sure what to play?')).not.toBeInTheDocument()
    await answerAll(user, [
      'Slipping out of sight',
      'Keep it simple',
      'Deal the damage',
      'It is simply in you',
    ])
    await user.click(screen.getByRole('button', { name: 'Use this build' }))

    expect(screen.getByRole('radio', { name: /Rogue/ })).toBeChecked()

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    expect(screen.getByLabelText('Name')).toHaveValue('Sable')
  })

  it('leaves a half-made build untouched when the re-run is abandoned', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Barbarian/ }))
    await user.click(screen.getByRole('button', { name: /Answer four questions instead/ }))
    await user.click(screen.getByRole('button', { name: 'Keep the build I have' }))

    expect(screen.getByRole('radio', { name: /Barbarian/ })).toBeChecked()
  })

  it('remembers the answers in the draft, and offers to retake rather than to take', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await waitFor(() => expect(store.getItem).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /Answer four questions/ }))
    await answerAll(user, ['Wading straight in', 'Keep it simple', 'Deal the damage', 'The wild'])
    await user.click(screen.getByRole('button', { name: 'Use this build' }))

    await waitFor(() => {
      const written = JSON.parse(String(store.setItem.mock.calls.at(-1)?.[1]))
      expect(written.quizAnswers).toEqual({
        style: 'melee',
        complexity: 'simple',
        role: 'damage',
        flavour: 'nature',
      })
    })

    expect(screen.getByRole('button', { name: 'Retake the quiz' })).toBeInTheDocument()
  })

  it('does not ask four questions of someone coming back to a draft', async () => {
    store.getItem.mockReturnValue(
      JSON.stringify({
        stepId: 'skills',
        campaignId: null,
        updatedAt: 'then',
        quizAnswers: {
          style: 'sneak',
          complexity: 'simple',
          role: 'damage',
          flavour: 'training',
        },
        choices: { ...recommendedChoices('rogue'), name: 'Sable' },
      }),
    )

    render(<CharacterWizard />)

    expect(await screen.findByRole('heading', { name: 'Choose your skills' })).toBeInTheDocument()
    expect(screen.queryByText('Not sure what to play?')).not.toBeInTheDocument()
  })
})

describe('the advanced escape hatches', () => {
  it('opens the whole skill list', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 4)
    await user.click(screen.getByRole('button', { name: /Choose different skills/ }))

    // All eighteen, not just the class's own options.
    expect(screen.getByRole('checkbox', { name: /Performance/ })).toBeInTheDocument()
  })

  it('swaps to typing the six scores by hand', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 3)
    await user.click(screen.getByRole('button', { name: /Enter scores by hand/ }))
    await user.click(screen.getByRole('button', { name: 'Type them myself' }))

    const strength = screen.getByLabelText('STR')
    expect(strength).toHaveValue(15)

    await user.clear(strength)
    await user.type(strength, '12')

    // The background's +2 still lands on top of what was typed.
    await waitFor(() =>
      expect(
        within(screen.getByText('What you end up with').parentElement!).getByText('14'),
      ).toBeInTheDocument(),
    )
  })

  it('shows the rest of the class spell list on request', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await next(user, 6)
    await user.click(screen.getByRole('button', { name: /All cantrips your class can learn/ }))

    expect(screen.getByRole('checkbox', { name: 'Acid Splash' })).toBeInTheDocument()
  })
})

describe('the numbers nobody types (`derived-defaults`)', () => {
  it('shows the armour class the chosen kit produces, and moves it when it is swapped', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 5)
    // The fighter's recommended kit is chain mail: 16, and no Dexterity in it.
    expect(screen.getByText('Armour class 16')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /155 gp/ }))

    // 155 gp and the clothes they stand in: 10 + Dexterity 13.
    expect(screen.getByText('Armour class 11')).toBeInTheDocument()
  })

  it('lays the derived numbers out on the last step', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))

    /** The value beside one of the summary card's labels. */
    const stat = (label: string) => within(screen.getByText(label).parentElement!)

    // A human fighter: d10 + Constitution 15, chain mail, and a human's speed.
    expect(stat('HP').getByText('12')).toBeInTheDocument()
    expect(stat('AC').getByText('16')).toBeInTheDocument()
    expect(stat('AC').getByText('from your armour')).toBeInTheDocument()
    expect(stat('Speed').getByText('30 ft.')).toBeInTheDocument()
  })

  it('counts the shield a paladin walks in with', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Paladin/ }))
    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))

    // Chain mail and a shield: the best armour class in the SRD at 1st level.
    const armorClass = within(screen.getByText('AC').parentElement!)
    expect(armorClass.getByText('18')).toBeInTheDocument()
    expect(armorClass.getByText('armour + shield')).toBeInTheDocument()
  })

  it('says when a number stopped being derived', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    // A wizard, because a robe is not armour: with nothing worn the column is
    // the number, so an override is the number.
    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.click(screen.getByRole('button', { name: /Set the numbers by hand/ }))
    await user.type(screen.getByLabelText('Armour class'), '20')

    const armorClass = within(screen.getByText('AC').parentElement!)
    expect(armorClass.getByText('20')).toBeInTheDocument()
    expect(armorClass.getByText('by hand')).toBeInTheDocument()
  })

  // Worn armour beats the column on the sheet, so it beats it here too — a
  // player who types 20 and keeps their chain mail is shown the 16 they will
  // actually be rolled against, not the number they typed.
  it('keeps showing the armour’s number when a typed one cannot beat it', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.click(screen.getByRole('button', { name: /Set the numbers by hand/ }))
    await user.type(screen.getByLabelText('Armour class'), '20')

    const armorClass = within(screen.getByText('AC').parentElement!)
    expect(armorClass.getByText('16')).toBeInTheDocument()
    expect(armorClass.getByText('from your armour')).toBeInTheDocument()
  })

  it('posts the derived numbers without anybody having entered one', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Vex Ashbrand')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    // The column is the unarmoured number; the chain mail is an equipped item,
    // and the sheet derives 16 from it (`derivedArmorClass`).
    expect(postedBody()).toMatchObject({ maxHitPoints: 12, armorClass: 11, speed: 30 })
  })

  it('takes a number typed behind the Advanced toggle instead', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.click(screen.getByRole('button', { name: /Set the numbers by hand/ }))
    await user.type(screen.getByLabelText('Max HP'), '30')
    await user.type(screen.getByLabelText('Name'), 'Vex Ashbrand')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    // Only the one that was typed: the other two are still derived.
    expect(postedBody()).toMatchObject({ maxHitPoints: 30, armorClass: 11, speed: 30 })
  })
})

describe('what every option means in play (`inline-consequences`)', () => {
  it('carries the class line on the step that opens the flow', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    expect(screen.getByText(CLASS_IN_PLAY.fighter)).toBeInTheDocument()
    expect(screen.getByText(CLASS_IN_PLAY.wizard)).toBeInTheDocument()
  })

  it('carries a line on the species, background and score steps', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user)
    expect(screen.getByText(SPECIES_IN_PLAY.human)).toBeInTheDocument()

    await next(user)
    expect(screen.getByText(BACKGROUND_IN_PLAY.soldier)).toBeInTheDocument()

    // The scores step's control is a select rather than an option card, so the
    // line sits in the row the selected ability is holding.
    await next(user)
    expect(screen.getByText(ABILITY_IN_PLAY.strength)).toBeInTheDocument()
    expect(screen.getByText(ABILITY_IN_PLAY.charisma)).toBeInTheDocument()
  })

  it('says what each suggested skill is actually rolled for', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 4)

    // Athletics is the Soldier's, Perception the Fighter's own pick — both are
    // cards with a line, not bare names.
    expect(screen.getByText(SKILL_IN_PLAY.athletics)).toBeInTheDocument()
    expect(screen.getByText(SKILL_IN_PLAY.perception)).toBeInTheDocument()
  })

  it('carries the line into the full skill picker behind the Advanced tap', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 4)
    await user.click(screen.getByRole('button', { name: /Choose different skills/ }))

    expect(screen.getByText(SKILL_IN_PLAY.performance)).toBeInTheDocument()
  })

  it('describes a gear bundle by the weapon in it, and a purse by the purse', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await next(user, 5)

    // A Fighter's kits are blades and armour; the Soldier's is a spear.
    expect(screen.getAllByText(WEAPON_GROUP_IN_PLAY['martial-melee']).length).toBeGreaterThan(0)
    expect(screen.getAllByText(WEAPON_GROUP_IN_PLAY['simple-melee']).length).toBeGreaterThan(0)
    // Both the class's kit and the Soldier's can be swapped for coin instead.
    expect(screen.getAllByText(GEAR_IN_PLAY.goldInstead)).toHaveLength(2)
  })

  it('lines the suggested spells, and leaves the rest of the list unannotated', async () => {
    const user = userEvent.setup()
    await renderWizard(user)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await next(user, 6)

    expect(screen.getByText(SPELL_IN_PLAY['fire-bolt'])).toBeInTheDocument()
    expect(screen.getByText(SPELL_IN_PLAY['magic-missile'])).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /All cantrips your class can learn/ }))

    // Outside the curated hand there is deliberately no line — the card is the
    // spell's name and nothing else.
    expect(screen.getByRole('checkbox', { name: 'Acid Splash' })).toBeInTheDocument()
  })
})
