import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CharacterItem } from '@/lib/db/schema'
import type { CombatState } from '@/lib/characters/combat'

import { InventoryCard } from './inventory-card'

jest.mock('@/lib/srd/hooks', () => ({
  useEquipment: jest.fn(),
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))

import { toast } from 'sonner'

import { useEquipment } from '@/lib/srd/hooks'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockUseEquipment = useEquipment as jest.MockedFunction<typeof useEquipment>

/**
 * One equipment list feeds both tabs now: the card filters it by category
 * rather than fetching `/equipment-categories/weapon` and `/…/armor`
 * separately, so the rows carry the categories they belong to.
 */
function mockEquipment(
  equipment: Array<{ index: string; name: string; categories: string[] }>,
  overrides: { isLoading?: boolean; error?: unknown } = {},
) {
  mockUseEquipment.mockReturnValue({
    equipment,
    count: equipment.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useEquipment>)
}

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
    experience: null,
    classResources: [],
    preparedSpellIndexes: [],
    concentration: null,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 12,
    pp: 0,
    ...overrides,
    heroicInspiration: false,
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
  mockEquipment([
    { index: 'longsword', name: 'Longsword', categories: ['weapons', 'martial-melee-weapons'] },
    { index: 'shortbow', name: 'Shortbow', categories: ['weapons', 'simple-ranged-weapons'] },
    { index: 'chain-mail', name: 'Chain Mail', categories: ['armor', 'heavy-armor'] },
    { index: 'shield', name: 'Shield', categories: ['armor', 'shields'] },
  ])
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

  describe('attunement stays out of the way until a magic item turns up (inventory-trim)', () => {
    const kit = [
      item(),
      item({ id: 'a1b2c3d4-0000-4000-8000-000000000002', equipmentIndex: 'shield' }),
      item({ id: 'a1b2c3d4-0000-4000-8000-000000000003', equipmentIndex: 'priests-pack' }),
    ]

    it('shows no attuned toggle on a mundane level-1 kit', () => {
      render(<Harness initialItems={kit} />)

      expect(screen.queryByRole('button', { name: /attuned$/ })).not.toBeInTheDocument()
      expect(screen.queryByText(/\/3 attuned/)).not.toBeInTheDocument()
      // Equipped is untouched: it is what makes attacks and AC real.
      expect(screen.getByRole('button', { name: 'Longsword equipped' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Shield equipped' })).toBeInTheDocument()
    })

    it('keeps the mundane shield mundane although the magic list shares its index', () => {
      render(
        <Harness
          initialItems={[
            item({ id: 'a1b2c3d4-0000-4000-8000-000000000002', equipmentIndex: 'shield' }),
          ]}
        />,
      )

      expect(screen.queryByRole('button', { name: 'Shield attuned' })).not.toBeInTheDocument()
    })

    it('shows attuned on every row once a custom row is named after a magic item', () => {
      render(
        <Harness
          initialItems={[
            ...kit,
            item({
              id: 'a1b2c3d4-0000-4000-8000-000000000004',
              equipmentIndex: null,
              customName: 'Cloak of Protection',
            }),
          ]}
        />,
      )

      expect(screen.getByRole('button', { name: 'Cloak of Protection attuned' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      expect(screen.getByRole('button', { name: 'Longsword attuned' })).toBeInTheDocument()
    })

    it('keeps a stored attunement reachable, so hiding never strands state', () => {
      render(<Harness initialItems={[item({ attuned: true })]} />)

      expect(screen.getByRole('button', { name: 'Longsword attuned' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(screen.getByText('1/3 attuned')).toBeInTheDocument()
    })
  })

  describe('a pack is one row that unfolds (inventory-trim)', () => {
    const pack = item({
      id: 'a1b2c3d4-0000-4000-8000-000000000005',
      equipmentIndex: 'priests-pack',
    })

    it('renders collapsed, as one row with a count, and still with the row controls', () => {
      render(<Harness initialItems={[pack]} />)

      const disclosure = screen.getByRole('button', { name: 'Priests-Pack · 7 items' })
      expect(disclosure).toHaveTextContent('Priests-Pack · 7 items')
      expect(disclosure).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('list', { name: 'Priests-Pack contents' })).not.toBeInTheDocument()
      expect(screen.queryByText('Rations')).not.toBeInTheDocument()

      expect(screen.getByRole('button', { name: 'One more Priests-Pack' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Priests-Pack' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Priests-Pack equipped' })).toBeInTheDocument()
      // Contents are not rows: the Items list has exactly one.
      expect(
        within(screen.getByRole('list', { name: 'Items' })).getAllByRole('listitem'),
      ).toHaveLength(1)
    })

    it('unfolds the seven contents beneath the row, with nothing on them to tap', async () => {
      const user = userEvent.setup()
      render(<Harness initialItems={[pack]} />)

      await user.click(screen.getByRole('button', { name: 'Priests-Pack · 7 items' }))

      expect(screen.getByRole('button', { name: 'Priests-Pack · 7 items' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      const contents = screen.getByRole('list', { name: 'Priests-Pack contents' })
      expect(within(contents).getAllByRole('listitem')).toHaveLength(7)
      expect(within(contents).getByText('Rations')).toHaveTextContent('Rations × 7')
      expect(within(contents).getByText('Holy Water')).toBeInTheDocument()
      expect(within(contents).queryByRole('button')).not.toBeInTheDocument()

      // A second tap folds it away again.
      await user.click(screen.getByRole('button', { name: 'Priests-Pack · 7 items' }))
      expect(screen.queryByRole('list', { name: 'Priests-Pack contents' })).not.toBeInTheDocument()
    })

    it('leaves a weapon row as it was: a plain name, no disclosure', () => {
      render(<Harness initialItems={[item()]} />)

      expect(screen.queryByRole('button', { name: 'Longsword' })).not.toBeInTheDocument()
      expect(screen.getByText('Longsword')).toBeInTheDocument()
    })
  })

  it('says when the equipment list cannot be fetched', async () => {
    const user = userEvent.setup()
    mockEquipment([], { error: new Error('offline') })

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add items' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Could not load the weapon list/)
  })
})
