import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CharacterItem } from '@/lib/db/schema'
import type { CombatState } from '@/lib/characters/combat'

import { InventoryCard } from './inventory-card'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useWeapons: jest.fn(),
  useArmor: jest.fn(),
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

import { toast } from 'sonner'

import { useArmor, useWeapons } from '@/lib/dnd-api/swr-hooks'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockUseWeapons = useWeapons as jest.MockedFunction<typeof useWeapons>
const mockUseArmor = useArmor as jest.MockedFunction<typeof useArmor>

const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

function item(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    characterId: CHARACTER_ID,
    equipmentIndex: 'longsword',
    customName: null,
    quantity: 1,
    equipped: false,
    attuned: false,
    notes: null,
    createdAt: new Date('2026-08-14T12:00:00.000Z'),
    updatedAt: new Date('2026-08-14T12:00:00.000Z'),
    ...overrides,
  }
}

function stateWith(overrides: Partial<CombatState> = {}): CombatState {
  return {
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    spellSlots: {},
    conditions: [],
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    exhaustion: 0,
    hitDiceUsed: 0,
    classResources: [],
    preparedSpellIndexes: [],
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 12,
    pp: 0,
    ...overrides,
  }
}

/** Holds items and combat state the way the sheet does, minus the network. */
function Harness({ initialItems = [] }: { initialItems?: CharacterItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [state, setState] = useState(stateWith)

  return (
    <>
      <InventoryCard
        characterId={CHARACTER_ID}
        items={items}
        onItemsChange={setItems}
        state={state}
        apply={(transition) => setState((current) => transition(current))}
      />
      <output data-testid="items">{JSON.stringify(items)}</output>
      <output data-testid="gold">{state.gp}</output>
    </>
  )
}

function heldItems(): CharacterItem[] {
  return JSON.parse(screen.getByTestId('items').textContent ?? '[]')
}

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

beforeEach(() => {
  mockUseWeapons.mockReturnValue({
    weapons: [
      { index: 'longsword', name: 'Longsword', url: '/api/equipment/longsword' },
      { index: 'shortbow', name: 'Shortbow', url: '/api/equipment/shortbow' },
    ],
    count: 2,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useWeapons>)

  mockUseArmor.mockReturnValue({
    armor: [{ index: 'shield', name: 'Shield', url: '/api/equipment/shield' }],
    count: 1,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useArmor>)
})

describe('InventoryCard', () => {
  it('adds a reference weapon in one tap from the add panel', async () => {
    const user = userEvent.setup()
    const created = item({ id: 'a1b2c3d4-0000-4000-8000-00000000000f', equipmentIndex: 'shortbow' })
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ item: created }),
    } as Response)

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add items' }))
    await user.click(screen.getByRole('button', { name: 'Shortbow' }))

    await waitFor(() => expect(heldItems()).toHaveLength(1))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER_ID}/items`)
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ equipmentIndex: 'shortbow' })
  })

  it('adds a named custom item through the Custom tab', async () => {
    const user = userEvent.setup()
    const created = item({ equipmentIndex: null, customName: 'Lucky coin' })
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ item: created }),
    } as Response)

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add items' }))
    await user.click(screen.getByRole('tab', { name: 'Custom' }))
    await user.type(screen.getByLabelText('Item name'), 'Lucky coin')
    await user.click(screen.getByRole('button', { name: 'Add item' }))

    await waitFor(() =>
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({
        customName: 'Lucky coin',
      }),
    )
    await waitFor(() => expect(heldItems()).toHaveLength(1))
  })

  it('steps the quantity, never below one', async () => {
    const user = userEvent.setup()
    const arrows = item({ equipmentIndex: null, customName: 'Arrows', quantity: 2 })
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ item: { ...arrows, quantity: 1 } }),
    } as Response)

    render(<Harness initialItems={[arrows]} />)

    await user.click(screen.getByRole('button', { name: 'One fewer Arrows' }))
    await waitFor(() =>
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({
        quantity: 1,
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'One fewer Arrows' })).toBeDisabled(),
    )
  })

  it('deletes only after the confirm, and not on a change of heart', async () => {
    const user = userEvent.setup()
    const sword = item()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
    } as Response)

    render(<Harness initialItems={[sword]} />)

    await user.click(screen.getByRole('button', { name: 'Remove Longsword' }))
    await user.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(heldItems()).toHaveLength(1)
    expect(mockFetch).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove Longsword' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(heldItems()).toHaveLength(0))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER_ID}/items/${sword.id}`)
    expect((init as RequestInit).method).toBe('DELETE')
  })

  it('restores the row when a delete fails on the server', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No such item' }),
    } as Response)

    render(<Harness initialItems={[item()]} />)

    await user.click(screen.getByRole('button', { name: 'Remove Longsword' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(heldItems()).toHaveLength(1)
  })

  it('edits notes in place and clears them with an empty save', async () => {
    const user = userEvent.setup()
    const sword = item({ notes: 'Old note' })
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ item: { ...sword, notes: null } }),
    } as Response)

    render(<Harness initialItems={[sword]} />)

    await user.click(screen.getByRole('button', { name: 'Notes' }))
    await user.clear(screen.getByLabelText('Notes for Longsword'))
    await user.tab()

    await waitFor(() =>
      expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({
        notes: null,
      }),
    )
  })

  it('ignores a currency entry that is not a number', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const gold = screen.getByLabelText('gp')
    await user.clear(gold)
    await user.tab()

    // Nothing commits; the field snaps back to the held value.
    expect(screen.getByTestId('gold')).toHaveTextContent('12')
    expect(gold).toHaveValue(12)
  })

  it('says when the weapon list cannot be fetched', async () => {
    const user = userEvent.setup()
    mockUseWeapons.mockReturnValue({
      weapons: [],
      count: 0,
      isLoading: false,
      error: new Error('offline'),
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useWeapons>)

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add items' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Could not load the weapon list/)
  })
})
