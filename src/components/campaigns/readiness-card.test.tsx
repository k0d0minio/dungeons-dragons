import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

import { toast } from 'sonner'

import type { CharacterReadiness } from '@/lib/characters/readiness'
import type { CharacterItem } from '@/lib/db/schema'

import { ReadinessCard } from './readiness-card'

// The DM's one-tap fixes (first-table/dm-character-profile): each button
// writes the readiness rule's own answer through the existing routes — items
// first with no version, the row with the version the page rendered — and the
// page re-renders after every one.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

function item(overrides: Partial<CharacterItem>): CharacterItem {
  return {
    id: 'row',
    characterId: CHARACTER_ID,
    equipmentIndex: 'longsword',
    customName: null,
    quantity: 1,
    equipped: false,
    attuned: false,
    notes: null,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: new Date('2026-09-01T12:00:00.000Z'),
    ...overrides,
  }
}

const NOT_READY: CharacterReadiness = {
  weapon: { applies: true, ready: false, fix: ['longsword', 'javelin'] },
  spellSlots: { applies: true, ready: false, fix: { '1': { max: 2, used: 0 } } },
  masteries: { applies: true, ready: false, fix: ['longsword', 'javelin'] },
  skills: { applies: true, ready: false },
}

const ITEMS = [
  item({ id: 'sword', equipmentIndex: 'longsword' }),
  item({ id: 'javelins', equipmentIndex: 'javelin', quantity: 6 }),
  item({ id: 'shield', equipmentIndex: 'shield', equipped: true }),
]

function ok(body: unknown = {}, status = 200) {
  return { ok: status < 300, status, json: async () => body } as unknown as Response
}

function renderCard(readiness = NOT_READY, items = ITEMS) {
  render(
    <ReadinessCard
      character={{ id: CHARACTER_ID, version: 4 }}
      items={items}
      readiness={readiness}
      masteryShown={false}
    />,
  )
}

describe('ReadinessCard', () => {
  it('readies the weapons the rule picked, one item row at a time, then refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Ready the longsword and javelin' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    const urls = mockFetch.mock.calls.map(([url]) => url)
    expect(urls).toEqual([
      `/api/characters/${CHARACTER_ID}/items/sword`,
      `/api/characters/${CHARACTER_ID}/items/javelins`,
    ])
    for (const [, init] of mockFetch.mock.calls) {
      expect((init as RequestInit).method).toBe('PATCH')
      expect(JSON.parse(String((init as RequestInit).body))).toEqual({ equipped: true })
    }
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Readied the longsword/))
  })

  it('readies one row per weapon when the pack holds the same one twice', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok())
    renderCard(NOT_READY, [
      item({ id: 'sword', equipmentIndex: 'longsword' }),
      item({ id: 'spare-sword', equipmentIndex: 'longsword' }),
      item({ id: 'javelins', equipmentIndex: 'javelin', quantity: 6 }),
    ])

    await user.click(screen.getByRole('button', { name: 'Ready the longsword and javelin' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
      `/api/characters/${CHARACTER_ID}/items/sword`,
      `/api/characters/${CHARACTER_ID}/items/javelins`,
    ])
  })

  it('writes the standard slot table through the row, with the version', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok({ character: { version: 5 } }))
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Give them the standard table' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER_ID}`)
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      spellSlots: { '1': { max: 2, used: 0 } },
      version: 4,
    })
  })

  it('writes the kit’s masteries as a build patch', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok({ character: { version: 5 } }))
    renderCard()

    await user.click(
      screen.getByRole('button', { name: 'Pick longsword and javelin from the kit' }),
    )

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({
      masteredWeaponIndexes: ['longsword', 'javelin'],
      version: 4,
    })
  })

  it('says so and refreshes when a player’s phone wrote first', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok({ error: 'conflict', character: {} }, 409))
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Give them the standard table' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/changed this character first/),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('links skills to the edit form rather than guessing them', () => {
    renderCard()

    expect(screen.getByRole('link', { name: 'Choose them on Edit' })).toHaveAttribute(
      'href',
      `/characters/${CHARACTER_ID}/edit`,
    )
  })

  it('leaves out the lines that do not apply, and counts what is left', () => {
    renderCard({
      ...NOT_READY,
      spellSlots: { applies: false, ready: false, fix: {} },
      masteries: { applies: false, ready: false, fix: null },
      skills: { applies: true, ready: true },
    })

    expect(screen.queryByText(/spell slots/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/masteries/i)).not.toBeInTheDocument()
    expect(screen.getByText(/1 thing to fix/)).toBeInTheDocument()
  })
})
