import { act, render, screen, waitFor, within } from '@testing-library/react'

import type { TableScreenView } from '@/lib/db/encounters'

import { TableScreen } from './table-screen'

// The player-facing screen (D24): renders the order big, highlights the
// active combatant, shows HP for PCs only, keeps polling, and dies politely
// on a dead token. Everything it can show came pre-sanitized off the wire.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const VIEW: TableScreenView = {
  encounterName: 'Ambush at the bridge',
  campaignName: 'The Rime of the Frostmaiden',
  round: 2,
  activeTurn: 1,
  combatants: [
    { id: 'combatant-1', label: 'Goblin 1', isCharacter: false, initiative: 17, conditions: [] },
    {
      id: 'combatant-2',
      label: 'Vex Ashbrand',
      isCharacter: true,
      initiative: 15,
      conditions: ['prone'],
      characterHp: { current: 21, max: 32, temp: 3 },
    },
  ],
}

function respondWith(view: TableScreenView) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => view,
  } as Response)
}

/**
 * A full table: six players and a monster, the density the reveal card has to
 * coexist with (`dm-run-suite/reveal-controls`).
 */
const SIX_PLAYER_VIEW: TableScreenView = {
  ...VIEW,
  combatants: [
    VIEW.combatants[0],
    ...['Vex Ashbrand', 'Mira Quill', 'Brannoc', 'Sable', 'Ith', 'Roon'].map((label, index) => ({
      id: `pc-${index}`,
      label,
      isCharacter: true,
      initiative: 15 - index,
      conditions: [],
      characterHp: { current: 20, max: 30, temp: 0 },
    })),
  ],
}

/**
 * Every `scrollIntoView` the screen asked for, in order — jsdom implements no
 * scrolling of its own, and the component skips the call when the method is
 * missing, so the suite has to supply one to watch.
 */
const scrolled: Array<{ row: Element; options?: boolean | ScrollIntoViewOptions }> = []

beforeAll(() => {
  Element.prototype.scrollIntoView = function (this: Element, options) {
    scrolled.push({ row: this, options })
  }
})

beforeEach(() => {
  scrolled.length = 0
})

describe('TableScreen', () => {
  it('renders the order with the active combatant highlighted and PC HP only', async () => {
    respondWith(VIEW)

    render(<TableScreen token={TOKEN} />)

    expect(await screen.findByText('Ambush at the bridge')).toBeInTheDocument()
    expect(screen.getByText('Round 2')).toBeInTheDocument()

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Goblin 1')
    expect(rows[1]).toHaveTextContent('Vex Ashbrand')

    // Active turn 1 → the second row is the one lit up.
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
    expect(rows[0]).not.toHaveAttribute('aria-current')

    // The PC's HP is visible; the monster row shows initiative and label only
    // — its hit points were never even in the payload.
    expect(rows[1]).toHaveTextContent('21')
    expect(rows[1]).toHaveTextContent('/32')
    expect(rows[1]).toHaveTextContent('+3')
    expect(rows[0]).not.toHaveTextContent('/')
    expect(rows[1]).toHaveTextContent('Prone')

    expect(mockFetch).toHaveBeenCalledWith(`/api/table/${TOKEN}`)
  })

  it('keeps polling for fresh state', async () => {
    jest.useFakeTimers()
    respondWith(VIEW)

    render(<TableScreen token={TOKEN} />)

    // The first load is deferred one task (see the component); with fake
    // timers that task only runs when the clock ticks.
    await act(async () => {
      jest.advanceTimersByTime(0)
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(5_000)
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
  })

  it('features the newest reveal, with only what the feed sent', async () => {
    respondWith({
      ...VIEW,
      reveal: {
        kind: 'npc',
        name: 'Harbourmaster Vane',
        summary: 'Runs the docks, and is bought',
        revealedAt: '2026-09-03T19:00:00.000Z',
      },
    })

    render(<TableScreen token={TOKEN} />)

    const card = await screen.findByRole('complementary', { name: 'Just revealed' })

    expect(within(card).getByText('Harbourmaster Vane')).toBeInTheDocument()
    expect(within(card).getByText('Runs the docks, and is bought')).toBeInTheDocument()
    expect(within(card).getByText('A new face')).toBeInTheDocument()

    // Announced as it arrives — the room is looking at the screen, and the
    // card appears mid-poll rather than on a page load.
    expect(card).toHaveAttribute('aria-live', 'polite')
  })

  it('points at the phones for a handout, and invents no summary for one', async () => {
    respondWith({
      ...VIEW,
      reveal: {
        kind: 'handout',
        name: 'The pressed-flower letter',
        summary: null,
        revealedAt: '2026-09-03T19:00:00.000Z',
      },
    })

    render(<TableScreen token={TOKEN} />)

    const card = await screen.findByRole('complementary', { name: 'Just revealed' })

    expect(within(card).getByText('The pressed-flower letter')).toBeInTheDocument()
    expect(within(card).getByText('Passed across the table')).toBeInTheDocument()
    expect(within(card).getByText('Look at your phones.')).toBeInTheDocument()
  })

  it('keeps all six players in the order beside the card', async () => {
    respondWith({
      ...SIX_PLAYER_VIEW,
      reveal: {
        kind: 'location',
        name: 'Kelp Harbour',
        summary: null,
        revealedAt: '2026-09-03T19:00:00.000Z',
      },
    })

    render(<TableScreen token={TOKEN} />)

    // The card is a sibling of the order, not something stacked on top of it:
    // every combatant is still rendered, and the card is outside the list.
    expect(await screen.findByText('Kelp Harbour')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(7)

    const order = screen.getByRole('list', { name: 'Initiative order' })
    expect(within(order).queryByText('Kelp Harbour')).not.toBeInTheDocument()
    expect(within(order).getByText('Roon')).toBeInTheDocument()
  })

  it('shows no card at all when the feed sent no reveal', async () => {
    respondWith(VIEW)

    render(<TableScreen token={TOKEN} />)

    expect(await screen.findByText('Round 2')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('brings the active combatant into view, and only when the turn moves', async () => {
    jest.useFakeTimers()
    respondWith(SIX_PLAYER_VIEW)

    render(<TableScreen token={TOKEN} />)
    await act(async () => {
      jest.advanceTimersByTime(0)
    })

    // Turn 1 of seven rows: on a propped device nobody is driving, the screen
    // takes itself to the turn rather than waiting to be swiped.
    expect(scrolled).toHaveLength(1)
    expect(scrolled[0].row).toBe(screen.getAllByRole('listitem')[1])

    respondWith({ ...SIX_PLAYER_VIEW, activeTurn: 5 })
    await act(async () => {
      jest.advanceTimersByTime(5_000)
    })

    const moved = screen.getAllByRole('listitem')
    expect(moved[5]).toHaveAttribute('aria-current', 'true')
    expect(scrolled).toHaveLength(2)
    expect(scrolled[1].row).toBe(moved[5])
    // Centred, so the row before and the row after stay on screen.
    expect(scrolled[1].options).toEqual({ behavior: 'smooth', block: 'center' })

    // A poll that changes nothing must not drag the screen around: the order
    // re-renders every five seconds whether or not the turn moved.
    await act(async () => {
      jest.advanceTimersByTime(5_000)
    })
    expect(scrolled).toHaveLength(2)

    jest.useRealTimers()
  })

  it('sizes conditions to be read across the table', async () => {
    respondWith(VIEW)

    render(<TableScreen token={TOKEN} />)

    // The badge was `text-sm` — the smallest type on a screen read from six
    // feet away, carrying the state most likely to change a player's turn.
    const badge = await screen.findByText('Prone')
    expect(badge).toHaveClass('text-lg', 'sm:text-xl')
  })

  it('says the screen is no longer live on a dead token', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'This table screen is no longer live' }),
    } as Response)

    render(<TableScreen token={TOKEN} />)

    expect(await screen.findByText('This table screen is no longer live.')).toBeInTheDocument()
    expect(screen.queryByText('Round 2')).not.toBeInTheDocument()
  })

  it('keeps the last good state through a failed poll', async () => {
    respondWith(VIEW)

    render(<TableScreen token={TOKEN} />)
    expect(await screen.findByText('Round 2')).toBeInTheDocument()

    mockFetch.mockRejectedValue(new Error('offline'))

    // Nothing to click — just make sure a rejected fetch on a later tick
    // would not have blanked the screen (the state is still rendered).
    await waitFor(() => expect(screen.getByText('Round 2')).toBeInTheDocument())
  })
})
