import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

// The reference hooks are network-backed; the sheet only needs their shapes.
jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useMonsters: jest.fn(),
  useMonster: jest.fn(),
  searchMonsters: (monsters: { name: string }[], query: string) =>
    monsters.filter((monster) => monster.name.toLowerCase().includes(query.trim().toLowerCase())),
}))

import { useMonster, useMonsters } from '@/lib/dnd-api/swr-hooks'

import { AddCombatantsSheet } from './add-combatants-sheet'

const mockUseMonsters = useMonsters as jest.MockedFunction<typeof useMonsters>
const mockUseMonster = useMonster as jest.MockedFunction<typeof useMonster>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const VEX_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const NIMBLE_ID = '2e0b8c1d-6a3f-4b5c-9d8e-1f0a2b3c4d5e'

const ROSTER = [
  { id: VEX_ID, name: 'Vex Ashbrand' },
  { id: NIMBLE_ID, name: 'Nimble Underfoot' },
]

function renderSheet(inEncounterCharacterIds: string[] = [], onAdded = jest.fn()) {
  render(
    <AddCombatantsSheet
      open
      onOpenChange={jest.fn()}
      encounterId={ENCOUNTER_ID}
      roster={ROSTER}
      inEncounterCharacterIds={inEncounterCharacterIds}
      onAdded={onAdded}
    />,
  )
  return onAdded
}

function fetchBody(call: number): unknown {
  const [, init] = mockFetch.mock.calls[call]
  return JSON.parse((init as RequestInit).body as string)
}

beforeEach(() => {
  mockUseMonsters.mockReturnValue({
    monsters: [
      { index: 'goblin', name: 'Goblin', url: '/api/monsters/goblin' },
      { index: 'ogre', name: 'Ogre', url: '/api/monsters/ogre' },
    ],
    count: 2,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonsters>)

  mockUseMonster.mockReturnValue({
    monster: { index: 'goblin', name: 'Goblin', hit_points: 7 },
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonster>)

  mockFetch.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ combatants: [] }),
  } as Response)
})

describe('AddCombatantsSheet — Party tab', () => {
  it('offers only characters not already in, and adds one per tap', async () => {
    const user = userEvent.setup()
    const onAdded = renderSheet([VEX_ID])

    // Vex is already a combatant — only Nimble is on offer.
    expect(screen.queryByRole('button', { name: /Vex Ashbrand/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Nimble Underfoot/ }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}/combatants`)
    expect((init as RequestInit).method).toBe('POST')
    expect(fetchBody(0)).toEqual({ characterIds: [NIMBLE_ID] })
    expect(onAdded).toHaveBeenCalled()
  })

  it('adds the whole missing party in one tap', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: 'Add all (2)' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(fetchBody(0)).toEqual({ characterIds: [VEX_ID, NIMBLE_ID] })
  })

  it('says so when the whole party is already in', () => {
    renderSheet([VEX_ID, NIMBLE_ID])

    expect(screen.getByText('The whole party is already in.')).toBeInTheDocument()
  })
})

describe('AddCombatantsSheet — Monsters tab', () => {
  it('searches, takes a count, seeds HP from the monster’s average, labels come from the server', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('tab', { name: 'Monsters' }))
    await user.type(screen.getByLabelText('Search monsters'), 'gob')

    expect(screen.queryByRole('button', { name: /Ogre/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Goblin/ }))

    // Three goblins, HP defaulting to the reference average (7).
    await user.click(screen.getByRole('button', { name: 'One more' }))
    await user.click(screen.getByRole('button', { name: 'One more' }))
    await user.click(screen.getByRole('button', { name: 'Add 3 × Goblin' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(fetchBody(0)).toEqual({
      monsterIndex: 'goblin',
      name: 'Goblin',
      count: 3,
      maxHitPoints: 7,
    })
  })

  it('lets the DM override the batch’s HP', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('tab', { name: 'Monsters' }))
    await user.click(screen.getByRole('button', { name: /Goblin/ }))
    await user.type(screen.getByLabelText('HP each'), '12')
    await user.click(screen.getByRole('button', { name: 'Add 1 × Goblin' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(fetchBody(0)).toEqual({
      monsterIndex: 'goblin',
      name: 'Goblin',
      count: 1,
      maxHitPoints: 12,
    })
  })
})
