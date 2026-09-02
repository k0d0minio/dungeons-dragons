import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { recommendedChoices } from '@/lib/characters/wizard'
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
  it('opens on the class step with the recommendation already chosen', () => {
    render(<CharacterWizard />)

    // Seven, not eight: the Fighter the wizard opens on casts nothing, so the
    // spells step is not part of their flow at all.
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Fighter/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('walks forward and back through the steps', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await next(user)
    expect(screen.getByRole('heading', { name: 'Pick a species' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Pick a class' })).toBeInTheDocument()
  })

  // Seven of the twelve classes cast nothing at level 1, and an empty "Spells"
  // step reads as something broken rather than something they do not get.
  it('has no spells step for a class that casts nothing', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Barbarian/ }))
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument()
  })

  it('offers the fast path straight to the name, and drops it there', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))

    expect(screen.getByRole('heading', { name: 'Name your character' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Use every suggestion/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create character' })).toBeInTheDocument()
  })
})

describe('the choices', () => {
  it('re-seats the whole build when the class changes', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

    await next(user, 3)

    // Fighter with the Soldier background: 15 in Strength, +2 from the
    // background, and the sum shown next to where it came from.
    expect(screen.getByText('17')).toBeInTheDocument()
    expect(screen.getByText(/15 \+2/)).toBeInTheDocument()
  })

  it('names the gear each option gives rather than lettering them', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await next(user, 5)

    expect(screen.getByRole('heading', { name: 'Take your starting gear' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Chain Mail/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /155 gp and buy your own/ })).toBeInTheDocument()
  })

  it('pre-ticks the suggested spells and keeps the rest of the list folded away', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

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
    render(<CharacterWizard campaign={CAMPAIGN} />)

    expect(screen.getByText('Playing in Frostmaiden')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(postedBody().campaignId).toBe(CAMPAIGN.id)
  })

  it('forgets the draft once the character exists', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

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

    render(<CharacterWizard />)

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

    render(<CharacterWizard />)

    await user.click(screen.getByRole('button', { name: /Use every suggestion/ }))
    await user.type(screen.getByLabelText('Name'), 'Brune')
    await user.click(screen.getByRole('button', { name: 'Create character' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server')
  })
})

describe('the draft', () => {
  it('writes every change, so a locked phone loses nothing', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

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
  })
})

describe('the advanced escape hatches', () => {
  it('opens the whole skill list', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

    await next(user, 4)
    await user.click(screen.getByRole('button', { name: /Choose different skills/ }))

    // All eighteen, not just the class's own options.
    expect(screen.getByRole('checkbox', { name: /Performance/ })).toBeInTheDocument()
  })

  it('swaps to typing the six scores by hand', async () => {
    const user = userEvent.setup()
    render(<CharacterWizard />)

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
    render(<CharacterWizard />)

    await user.click(screen.getByRole('radio', { name: /Wizard/ }))
    await next(user, 6)
    await user.click(screen.getByRole('button', { name: /All cantrips your class can learn/ }))

    expect(screen.getByRole('checkbox', { name: 'Acid Splash' })).toBeInTheDocument()
  })
})
