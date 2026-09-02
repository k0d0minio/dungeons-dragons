import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character } from '@/lib/db/characters'

import { LevelUpPlanner } from './level-up-planner'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('@/lib/srd/hooks', () => ({
  useClassSpells: jest.fn(),
}))

import { useClassSpells } from '@/lib/srd/hooks'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>

const CHARACTER: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 4,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 26,
  currentHitPoints: 26,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: { '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 } },
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  skillProficiencies: [],
  skillExpertise: [],
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: [],
  concentration: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
  featChoices: null,
}

function character(overrides: Partial<Character> = {}): Character {
  return { ...CHARACTER, ...overrides }
}

/** The one request this screen makes, as the component sent it. */
function postedBody() {
  const [, init] = (global.fetch as jest.Mock).mock.calls[0]
  return JSON.parse(init.body as string)
}

// Radix's Select — the ability and feat pickers — drives itself with pointer
// capture and scrolls the highlighted option into view, neither of which jsdom
// implements.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  mockUseClassSpells.mockReturnValue({
    spells: [{ index: 'fireball', name: 'Fireball', level: 3 }],
    count: 1,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClassSpells>)
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ character: CHARACTER }),
  })
})

describe('LevelUpPlanner', () => {
  it('has nothing to apply until the level moves', () => {
    render(<LevelUpPlanner character={character()} />)

    expect(screen.getByRole('button', { name: /save these changes/i })).toBeDisabled()
  })

  it('says which hit point rule it is using, and defaults to the average', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character()} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    expect(screen.getByLabelText(/take the average/i)).toBeChecked()
    // A d6 averages 4, and CON 14 is +2 — so 26 becomes 32.
    expect(screen.getByLabelText(/new maximum hit points/i)).toHaveValue(32)
  })

  it('applies the level, the new maximum and the new slots in one request', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character()} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByRole('button', { name: /apply level 5/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const body = postedBody()

    expect(body.level).toBe(5)
    expect(body.maxHitPoints).toBe(32)
    expect(body.spellSlots).toEqual({
      '1': { max: 4, used: 0 },
      '2': { max: 3, used: 0 },
      '3': { max: 2, used: 0 },
    })
    expect(mockPush).toHaveBeenCalledWith(`/characters/${CHARACTER.id}`)
  })

  it('lets the player type what they rolled instead of taking the average', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character()} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByLabelText(/i rolled/i))
    await user.type(screen.getByLabelText(/^level 5$/i), '6')

    // A 6 on the d6, plus +2 Constitution, is 8 rather than the average 6.
    expect(screen.getByLabelText(/new maximum hit points/i)).toHaveValue(34)
  })

  it('leaves hand-adjusted slot maxima alone unless asked to replace them', async () => {
    const user = userEvent.setup()
    const adjusted = character({ spellSlots: { '1': { max: 6, used: 0 } } })

    render(<LevelUpPlanner character={adjusted} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    expect(screen.getByText(/do not match the standard table/i)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /replace them/i })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: /apply level 5/i }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    expect(postedBody()).not.toHaveProperty('spellSlots')
  })

  it('replaces them when the player says so', async () => {
    const user = userEvent.setup()
    const adjusted = character({ spellSlots: { '1': { max: 6, used: 0 } } })

    render(<LevelUpPlanner character={adjusted} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByRole('switch', { name: /replace them/i }))
    await user.click(screen.getByRole('button', { name: /apply level 5/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    expect(postedBody().spellSlots).toEqual({
      '1': { max: 4, used: 0 },
      '2': { max: 3, used: 0 },
      '3': { max: 2, used: 0 },
    })
  })

  it('levels down too, taking the average back off', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character()} />)

    await user.click(screen.getByRole('button', { name: /one level lower/i }))

    expect(screen.getByLabelText(/new maximum hit points/i)).toHaveValue(20)

    await user.click(screen.getByRole('button', { name: /apply level 3/i }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    expect(postedBody().level).toBe(3)
  })

  it('raises the subclass on the change that crosses level 3 (2024)', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 2, maxHitPoints: 14 })} />)

    // Nothing to say about it while the target is still level 2.
    expect(screen.queryByRole('heading', { name: 'Subclass' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    expect(screen.getByText('Subclass')).toBeInTheDocument()
    // The SRD publishes exactly one per class — the Evoker for a wizard.
    expect(screen.getByText('Evoker')).toBeInTheDocument()
  })

  it('says nothing about the subclass on a level change above it', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 4 })} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    expect(screen.queryByText('Subclass')).not.toBeInTheDocument()
  })

  it('lists the features gained from the local SRD data, subclass ones marked', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 2, maxHitPoints: 14 })} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    // The class feature that sends you to pick a subclass, and the subclass's
    // own level 3 feature beside it.
    expect(screen.getByText('Wizard Subclass')).toBeInTheDocument()
    expect(screen.getAllByText('· subclass').length).toBeGreaterThan(0)
  })

  it('keeps the spell picker for a wizard’s spellbook and no one else', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<LevelUpPlanner character={character()} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    expect(screen.getByText(/Which spells go in the book/)).toBeInTheDocument()
    unmount()

    // A 2024 sorcerer prepares from the class list on the sheet, so there is
    // nothing here to pick — only a count that moved.
    render(<LevelUpPlanner character={character({ classIndex: 'sorcerer' })} />)
    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    expect(screen.getByText(/prepare is chosen on the sheet/)).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('prompts for an Ability Score Improvement on the change that crosses 4th', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 3, maxHitPoints: 20 })} />)

    expect(screen.queryByText('Ability Score Improvement')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    // Twice over: the card, and the class feature in "What you gain".
    expect(screen.getAllByText('Ability Score Improvement').length).toBeGreaterThan(0)
    // A wizard's primary ability is Intelligence, and the default is filled in
    // rather than offered as a separate "recommended" option.
    expect(screen.getByLabelText('+2 to one score')).toBeChecked()
    expect(screen.getByRole('combobox', { name: '+2 to' })).toHaveTextContent('Intelligence')
    expect(screen.getByText('This level: +2 Intelligence.')).toBeInTheDocument()
  })

  it('posts the recommended increase with the level change', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 3, maxHitPoints: 20 })} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByRole('button', { name: /apply level 4/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    expect(postedBody().featChoices).toEqual([
      { level: 4, featIndex: 'ability-score-improvement', increases: { intelligence: 2 } },
    ])
  })

  it('splits the increase across two scores when asked', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 3, maxHitPoints: 20 })} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByLabelText('+1 to two scores'))
    await user.click(screen.getByRole('combobox', { name: 'and +1 to' }))
    await user.click(await screen.findByRole('option', { name: 'Constitution' }))
    await user.click(screen.getByRole('button', { name: /apply level 4/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    expect(postedBody().featChoices).toEqual([
      {
        level: 4,
        featIndex: 'ability-score-improvement',
        increases: { intelligence: 1, constitution: 1 },
      },
    ])
  })

  it('keeps the feats behind the advanced toggle, and takes one when it is on', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 3, maxHitPoints: 20 })} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))

    expect(screen.queryByRole('combobox', { name: 'Feat' })).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Take a feat instead'))
    await user.click(screen.getByRole('combobox', { name: 'Feat' }))
    await user.click(await screen.findByRole('option', { name: 'Grappler' }))
    await user.click(screen.getByRole('button', { name: /apply level 4/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    expect(postedBody().featChoices).toEqual([{ level: 4, featIndex: 'grappler' }])
  })

  it('offers the Epic Boons only at 19th', async () => {
    const user = userEvent.setup()
    render(<LevelUpPlanner character={character({ level: 15, maxHitPoints: 90 })} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByLabelText('Take a feat instead'))
    await user.click(screen.getByRole('combobox', { name: 'Feat' }))

    expect(screen.queryByRole('option', { name: 'Boon of Fate' })).not.toBeInTheDocument()
  })

  it('will not offer a score that is already at 20', async () => {
    const user = userEvent.setup()
    render(
      <LevelUpPlanner character={character({ level: 3, maxHitPoints: 20, intelligence: 20 })} />,
    )

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByRole('combobox', { name: '+2 to' }))

    expect(screen.queryByRole('option', { name: 'Intelligence' })).not.toBeInTheDocument()
    // The recommendation moves to the next best score rather than wasting the level.
    expect(screen.getByText('This level: +2 Dexterity.')).toBeInTheDocument()
  })

  it('says what levelling back down gives back', async () => {
    const user = userEvent.setup()
    render(
      <LevelUpPlanner
        character={character({
          level: 4,
          intelligence: 20,
          featChoices: [
            { level: 4, featIndex: 'ability-score-improvement', increases: { intelligence: 2 } },
          ],
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: /one level lower/i }))

    expect(screen.getByText(/gives back Ability Score Improvement at level 4/)).toBeInTheDocument()
    expect(screen.getByText(/\+2 Intelligence/)).toBeInTheDocument()
  })

  it('reports a failed save rather than pretending it landed', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Nope' }),
    })

    render(<LevelUpPlanner character={character()} />)

    await user.click(screen.getByRole('button', { name: /one level higher/i }))
    await user.click(screen.getByRole('button', { name: /apply level 5/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nope')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
