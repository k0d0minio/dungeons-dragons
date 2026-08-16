import { act, render, screen, waitFor } from '@testing-library/react'

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

    await act(async () => {})
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(5_000)
    })
    expect(mockFetch).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
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
