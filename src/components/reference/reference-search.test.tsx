// Pins the one reference matcher the Library page and the bar's lookup overlay
// share (first-table/library-search-first): ranking, grouping, the empty
// query, loading, and the row both surfaces list.
import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CLASSES } from '@/lib/srd/classes'
import { SPECIES } from '@/lib/srd/species'

import {
  REFERENCE_GROUP_LABELS,
  REFERENCE_SEARCH_ORDER,
  ReferenceResultRow,
  collect,
  rank,
  useReferenceSearch,
} from './reference-search'

interface ListState {
  items: Array<{ index: string; name: string }>
  isLoading: boolean
  error: unknown
}

const emptyState = (): ListState => ({ items: [], isLoading: false, error: null })

const mockSpells = emptyState()
const mockEquipment = emptyState()
const mockMonsters = emptyState()
const mockMagicItems = emptyState()

// Only the four fetching hooks are stubbed. Classes and species come straight
// from the local SRD data, so those two groups are the real twelve and nine.
jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useSpells: () => ({ ...mockSpells, spells: mockSpells.items }),
  useEquipment: () => ({ ...mockEquipment, equipment: mockEquipment.items }),
  useMonsters: () => ({ ...mockMonsters, monsters: mockMonsters.items }),
  useMagicItems: () => ({ ...mockMagicItems, magicItems: mockMagicItems.items }),
}))

function setList(state: ListState, next: Partial<ListState>) {
  Object.assign(state, { items: [], isLoading: false, error: null }, next)
}

beforeEach(() => {
  setList(mockSpells, {
    items: [
      { index: 'fireball', name: 'Fireball' },
      { index: 'goodberry', name: 'Goodberry' },
    ],
  })
  setList(mockMonsters, {
    items: [
      { index: 'hobgoblin', name: 'Hobgoblin' },
      { index: 'goblin', name: 'Goblin' },
    ],
  })
  setList(mockEquipment, { items: [{ index: 'longsword', name: 'Longsword' }] })
  setList(mockMagicItems, { items: [{ index: 'bag-of-holding', name: 'Bag of Holding' }] })
})

describe('rank', () => {
  it('puts a prefix match ahead of a substring match and drops a miss', () => {
    expect(rank('Goblin', 'gob')).toBe(0)
    expect(rank('Hobgoblin', 'gob')).toBe(1)
    expect(rank('Longsword', 'gob')).toBe(-1)
  })

  it('ignores the case of the name', () => {
    expect(rank('GOBLIN', 'gob')).toBe(0)
  })
})

describe('collect', () => {
  it('keeps prefix matches first and source order within a rank', () => {
    const results = collect(
      [
        { index: 'hobgoblin', name: 'Hobgoblin' },
        { index: 'goblin-boss', name: 'Goblin Boss' },
        { index: 'goblin', name: 'Goblin' },
      ],
      'monster',
      'gob',
    )

    expect(results.map((result) => result.name)).toEqual(['Goblin Boss', 'Goblin', 'Hobgoblin'])
    expect(results[0]).toEqual({
      type: 'monster',
      index: 'goblin-boss',
      name: 'Goblin Boss',
      rank: 0,
    })
  })

  it('skips rows without an index or a name rather than listing blanks', () => {
    const results = collect(
      [
        { index: '', name: 'Goblin' },
        { index: 'goblin', name: '' },
        { index: 'goblin', name: 'Goblin' },
      ],
      'monster',
      'gob',
    )

    expect(results).toHaveLength(1)
  })
})

describe('useReferenceSearch', () => {
  it('returns no groups for an empty or blank query', () => {
    const { result } = renderHook(() => useReferenceSearch('   '))

    expect(result.current.groups).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.loading).toBe(false)
  })

  it('groups the hits by type in table order, ranked within each group', () => {
    const { result } = renderHook(() => useReferenceSearch(' Gob '))

    expect(result.current.groups.map((group) => group.label)).toEqual(['Monsters'])
    expect(result.current.groups[0].results.map((hit) => hit.name)).toEqual(['Goblin', 'Hobgoblin'])
    expect(result.current.total).toBe(2)

    // A shorter query reaches the local species too: "Dragonborn" and
    // "Goliath" both have a `go`.
    const wider = renderHook(() => useReferenceSearch('go'))
    expect(wider.result.current.groups.map((group) => group.label)).toEqual([
      'Spells',
      'Monsters',
      'Species',
    ])
    expect(wider.result.current.total).toBe(5)
  })

  it('searches the local classes and species alongside the fetched lists', () => {
    const { result } = renderHook(() => useReferenceSearch('e'))

    const labels = result.current.groups.map((group) => group.label)
    expect(labels).toContain('Classes')
    expect(labels).toContain('Species')
    // Every group has a label, and the labels are the plural ones.
    expect(REFERENCE_SEARCH_ORDER.map((type) => REFERENCE_GROUP_LABELS[type])).toEqual([
      'Spells',
      'Monsters',
      'Equipment',
      'Magic Items',
      'Classes',
      'Species',
    ])
  })

  it('exposes each list whole, with the local ones never loading', () => {
    setList(mockSpells, { isLoading: true })
    const { result } = renderHook(() => useReferenceSearch(''))

    expect(result.current.lists.class.items).toBe(CLASSES.all)
    expect(result.current.lists.species.items).toBe(SPECIES.all)
    expect(result.current.lists.class.isLoading).toBe(false)
    expect(result.current.lists.spell.isLoading).toBe(true)
    expect(result.current.loading).toBe(true)
  })

  it('carries a failed fetch through on its list', () => {
    setList(mockMonsters, { error: new Error('down') })
    const { result } = renderHook(() => useReferenceSearch('gob'))

    expect(result.current.lists.monster.error).toBeInstanceOf(Error)
    expect(result.current.loading).toBe(false)
  })
})

describe('ReferenceResultRow', () => {
  const goblin = { type: 'monster' as const, index: 'goblin', name: 'Goblin' }

  it('badges the type only when asked, for a list that mixes types', () => {
    const { rerender } = render(
      <ul>
        <ReferenceResultRow result={goblin} onSelect={jest.fn()} />
      </ul>,
    )

    expect(screen.queryByText('Monster')).not.toBeInTheDocument()

    rerender(
      <ul>
        <ReferenceResultRow result={goblin} badge onSelect={jest.fn()} />
      </ul>,
    )

    expect(screen.getByText('Monster')).toBeInTheDocument()
  })

  it('is one tappable row', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <ul>
        <ReferenceResultRow result={goblin} onSelect={onSelect} />
      </ul>,
    )

    await user.click(screen.getByRole('button', { name: 'Goblin' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
