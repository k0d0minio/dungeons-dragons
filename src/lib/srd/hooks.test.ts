import { renderHook } from '@testing-library/react'

import {
  fetcher,
  searchByName,
  useClassSpells,
  useEquipment,
  useEquipmentDetails,
  useMagicItem,
  useMagicItems,
  useMonster,
  useMonsterDetails,
  useMonsters,
  useSpell,
  useSpells,
} from './hooks'

jest.mock('swr', () => ({ __esModule: true, default: jest.fn() }))

const mockUseSWR = jest.mocked(jest.requireMock('swr').default)

/** What SWR hands back, with the key it was called with recorded. */
function swrReturns(data: unknown, rest: { error?: unknown; isLoading?: boolean } = {}) {
  mockUseSWR.mockReturnValue({
    data,
    error: rest.error ?? null,
    isLoading: rest.isLoading ?? false,
    mutate: jest.fn(),
  })
}

/** The key the hook asked SWR for — a URL, or null when it should not fetch. */
function keyOf(): string | null {
  return mockUseSWR.mock.calls.at(-1)?.[0] ?? null
}

describe('list hooks', () => {
  it('reads a list from the app’s own SRD route', () => {
    const results = [{ index: 'fireball', name: 'Fireball', level: 3 }]
    swrReturns({ count: 1, results })

    const { result } = renderHook(() => useSpells())

    expect(keyOf()).toBe('/api/srd/spells')
    expect(result.current.spells).toEqual(results)
    expect(result.current.count).toBe(1)
  })

  it('answers with an empty list while loading rather than undefined', () => {
    swrReturns(undefined, { isLoading: true })

    const { result } = renderHook(() => useMonsters())

    expect(result.current.monsters).toEqual([])
    expect(result.current.count).toBe(0)
    expect(result.current.isLoading).toBe(true)
  })

  it('surfaces the error so a card can say the list did not load', () => {
    const error = new Error('offline')
    swrReturns(undefined, { error })

    const { result } = renderHook(() => useMagicItems())

    expect(result.current.magicItems).toEqual([])
    expect(result.current.error).toBe(error)
  })

  it('asks for equipment as one list, which both inventory tabs filter', () => {
    swrReturns({ count: 0, results: [] })

    renderHook(() => useEquipment())

    expect(keyOf()).toBe('/api/srd/equipment')
  })
})

describe('useClassSpells', () => {
  it('filters the spell list rather than calling a route of its own', () => {
    swrReturns({ count: 0, results: [] })

    renderHook(() => useClassSpells('wizard'))

    expect(keyOf()).toBe('/api/srd/spells?class=wizard')
  })

  it('escapes the class index rather than pasting it into the query', () => {
    swrReturns({ count: 0, results: [] })

    renderHook(() => useClassSpells('half caster&x=1'))

    expect(keyOf()).toBe('/api/srd/spells?class=half%20caster%26x%3D1')
  })

  it('fetches nothing until a class is chosen', () => {
    swrReturns(undefined)

    renderHook(() => useClassSpells(null))

    expect(keyOf()).toBeNull()
  })
})

describe('entry hooks', () => {
  it('reads one entry by index', () => {
    const spell = { index: 'fireball', name: 'Fireball' }
    swrReturns(spell)

    const { result } = renderHook(() => useSpell('fireball'))

    expect(keyOf()).toBe('/api/srd/spells/fireball')
    expect(result.current.spell).toBe(spell)
  })

  it('reads a monster by index', () => {
    swrReturns({})

    renderHook(() => useMonster('goblin-warrior'))

    expect(keyOf()).toBe('/api/srd/monsters/goblin-warrior')
  })

  it('reads a magic item by index', () => {
    swrReturns({})

    renderHook(() => useMagicItem('bag-of-holding'))

    expect(keyOf()).toBe('/api/srd/magic-items/bag-of-holding')
  })

  it('fetches nothing for a null index', () => {
    swrReturns(undefined)

    renderHook(() => useMonster(null))

    expect(keyOf()).toBeNull()
  })
})

describe('batched detail hooks', () => {
  it('keys one SWR entry per set, deduplicated and sorted', () => {
    swrReturns({})

    renderHook(() => useMonsterDetails(['ogre', 'goblin-warrior', 'ogre']))

    expect(keyOf()).toBe('monsters-details:goblin-warrior,ogre')
  })

  it('fetches nothing for an empty set', () => {
    swrReturns(undefined)

    const { result } = renderHook(() => useEquipmentDetails([]))

    expect(keyOf()).toBeNull()
    expect(result.current.details).toEqual({})
  })

  it('drops the entries whose fetch failed and keeps the rest', async () => {
    // The fetcher SWR would have run, captured so it can be driven directly.
    swrReturns(undefined)
    renderHook(() => useEquipmentDetails(['longsword', 'broken']))

    const load = mockUseSWR.mock.calls.at(-1)?.[1] as () => Promise<unknown>

    global.fetch = jest.fn(async (url) =>
      String(url).endsWith('/broken')
        ? ({ ok: false, status: 404 } as Response)
        : ({ ok: true, json: async () => ({ index: 'longsword' }) } as Response),
    ) as jest.MockedFunction<typeof fetch>

    await expect(load()).resolves.toEqual({ longsword: { index: 'longsword' } })
  })
})

describe('fetcher', () => {
  it('throws on a non-OK response so SWR reports an error', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 }) as Response) as never

    await expect(fetcher('/api/srd/spells')).rejects.toThrow('HTTP error! status: 500')
  })

  it('returns the parsed body on success', async () => {
    global.fetch = jest.fn(
      async () => ({ ok: true, json: async () => ({ count: 0 }) }) as Response,
    ) as never

    await expect(fetcher('/api/srd/spells')).resolves.toEqual({ count: 0 })
  })
})

describe('searchByName', () => {
  const rows = [{ name: 'Fireball' }, { name: 'Fire Bolt' }, { name: 'Cure Wounds' }]

  it('matches a case-insensitive substring', () => {
    expect(searchByName(rows, 'fire')).toEqual([{ name: 'Fireball' }, { name: 'Fire Bolt' }])
    expect(searchByName(rows, 'WOUNDS')).toEqual([{ name: 'Cure Wounds' }])
  })

  it('matches everything on an empty or whitespace-only query', () => {
    expect(searchByName(rows, '')).toEqual(rows)
    expect(searchByName(rows, '   ')).toEqual(rows)
  })

  it('survives a row with no name', () => {
    expect(searchByName([{ name: undefined }, { name: 'Bless' }], 'bless')).toEqual([
      { name: 'Bless' },
    ])
  })
})
