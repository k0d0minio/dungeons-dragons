import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character } from '@/lib/db/characters'

import { LevelUpPlanner } from './level-up-planner'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useClasses: jest.fn(),
  useClassLevels: jest.fn(),
  useClassSpells: jest.fn(),
}))

import { useClassLevels, useClassSpells, useClasses } from '@/lib/dnd-api/swr-hooks'

const mockUseClasses = useClasses as jest.MockedFunction<typeof useClasses>
const mockUseClassLevels = useClassLevels as jest.MockedFunction<typeof useClassLevels>
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
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: [],
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

function character(overrides: Partial<Character> = {}): Character {
  return { ...CHARACTER, ...overrides }
}

/** The one request this screen makes, as the component sent it. */
function postedBody() {
  const [, init] = (global.fetch as jest.Mock).mock.calls[0]
  return JSON.parse(init.body as string)
}

beforeEach(() => {
  mockUseClasses.mockReturnValue({
    classes: [{ index: 'wizard', name: 'Wizard', url: '/api/classes/wizard' }],
    count: 1,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClasses>)

  mockUseClassLevels.mockReturnValue({
    levels: [
      {
        level: 5,
        index: 'wizard-5',
        class: { index: 'wizard', name: 'Wizard', url: '/api/classes/wizard' },
        features: [
          { index: 'ability-score-improvement-4', name: 'Ability Score Improvement', url: '/x' },
        ],
      },
    ],
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClassLevels>)

  mockUseClassSpells.mockReturnValue({
    spells: [{ index: 'fireball', name: 'Fireball', url: '/api/spells/fireball', level: 3 }],
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
