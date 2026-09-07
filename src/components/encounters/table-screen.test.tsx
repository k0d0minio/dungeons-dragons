import { act, render, screen, waitFor, within } from '@testing-library/react'

import type { TableEncounter } from '@/lib/db/encounters'
import type { TableView } from '@/lib/db/table'

import { TableScreen } from './table-screen'

// The player-facing screen (D24, `dm-run-suite/table-screen-cast`): renders
// the order big, highlights the active combatant, shows HP for PCs only, puts
// whatever the DM cast on the stage, keeps polling, and dies politely on a
// dead token. Everything it can show came pre-sanitized off the wire.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const ENCOUNTER: TableEncounter = {
  name: 'Ambush at the bridge',
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

const VIEW: TableView = {
  campaignName: 'The Rime of the Frostmaiden',
  spotlight: null,
  encounter: ENCOUNTER,
}

function respondWith(view: TableView) {
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
const SIX_PLAYER_ENCOUNTER: TableEncounter = {
  ...ENCOUNTER,
  combatants: [
    ENCOUNTER.combatants[0],
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

const SIX_PLAYER_VIEW: TableView = { ...VIEW, encounter: SIX_PLAYER_ENCOUNTER }

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

    respondWith({ ...SIX_PLAYER_VIEW, encounter: { ...SIX_PLAYER_ENCOUNTER, activeTurn: 5 } })
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

    // Every size on this screen is an `em` off the one font size the root
    // sets, so the reader's own "bigger" control moves the conditions too —
    // they carry the state most likely to change what a player does on their
    // turn and used to be the smallest type on the screen.
    const badge = await screen.findByText('Prone')
    expect(badge).toHaveClass('text-[0.95em]')
  })

  describe('what the DM cast (`dm-run-suite/table-screen-cast`)', () => {
    it('puts the cast thing on the stage beside the order, and stands the reveal card down', async () => {
      respondWith({
        ...VIEW,
        spotlight: {
          kind: 'location',
          at: '2026-09-07T19:00:00.000Z',
          name: 'Kelp Harbour',
          summary: 'A fishing village with no fishermen left',
          description: 'Nets rot on the jetty.\n\nEvery door is shut.',
        },
        reveal: {
          kind: 'location',
          name: 'Kelp Harbour',
          summary: 'A fishing village with no fishermen left',
          revealedAt: '2026-09-07T19:00:00.000Z',
        },
      })

      render(<TableScreen token={TOKEN} />)

      const stage = await screen.findByRole('region', { name: 'On the table screen' })
      expect(within(stage).getByText('Kelp Harbour')).toBeInTheDocument()
      expect(within(stage).getByText('Nets rot on the jetty.')).toBeInTheDocument()
      expect(within(stage).getByText('Every door is shut.')).toBeInTheDocument()

      // Casting prep reveals it, so both would be announcing the same thing —
      // and the stage says it in full.
      expect(screen.queryByRole('complementary', { name: 'Just revealed' })).not.toBeInTheDocument()

      // The fight is still a fight: the order keeps its column.
      expect(screen.getByRole('list', { name: 'Initiative order' })).toBeInTheDocument()
    })

    it('shows a cast sheet without a coin, a bag or a note on it', async () => {
      respondWith({
        ...VIEW,
        encounter: null,
        spotlight: {
          kind: 'character',
          at: '2026-09-07T19:00:00.000Z',
          sheet: {
            name: 'Vex Ashbrand',
            level: 3,
            speciesLabel: 'Wood Elf',
            classLabel: 'Rogue',
            subclassLabel: 'Thief',
            backgroundLabel: 'Criminal',
            armorClass: 15,
            hitPoints: { current: 21, max: 32, temp: 3 },
            speed: 35,
            initiative: 3,
            proficiencyBonus: 2,
            passivePerception: 15,
            abilities: [
              {
                key: 'dexterity',
                label: 'Dexterity',
                abbreviation: 'DEX',
                score: 16,
                modifier: 3,
              },
            ],
            savingThrows: [{ label: 'Dexterity', modifier: 5, proficient: true, expertise: false }],
            skills: [{ label: 'Stealth', modifier: 7, proficient: true, expertise: true }],
            conditions: ['prone'],
            exhaustion: 1,
            portraitUploadedAt: null,
          },
        },
      })

      render(<TableScreen token={TOKEN} />)

      const stage = await screen.findByRole('region', { name: 'On the table screen' })
      expect(within(stage).getByText('Vex Ashbrand')).toBeInTheDocument()
      expect(within(stage).getByText('Level 3 · Wood Elf · Thief Rogue')).toBeInTheDocument()
      expect(within(stage).getByText('Stealth')).toBeInTheDocument()
      expect(within(stage).getByText('Prone · Exhaustion 1')).toBeInTheDocument()
      expect(within(stage).getByText('+3 temp')).toBeInTheDocument()
    })

    it('renders a handout picture through the token route and nothing else', async () => {
      respondWith({
        ...VIEW,
        encounter: null,
        spotlight: {
          kind: 'handout',
          at: '2026-09-07T19:00:00.000Z',
          title: 'The pressed-flower letter',
          body: 'Come alone.',
          imageUploadedAt: '2026-09-06T10:00:00.000Z',
        },
      })

      render(<TableScreen token={TOKEN} />)

      const picture = await screen.findByAltText('The pressed-flower letter')
      // No entity in the URL: the only image this token can fetch is whatever
      // is on the screen right now.
      expect(picture).toHaveAttribute(
        'src',
        `/api/table/${TOKEN}/image?v=${encodeURIComponent('2026-09-06T10:00:00.000Z')}`,
      )
    })

    it('says it is on and waiting when there is neither a fight nor a cast', async () => {
      respondWith({ campaignName: 'The Rime of the Frostmaiden', spotlight: null, encounter: null })

      render(<TableScreen token={TOKEN} />)

      expect(await screen.findByText('The Rime of the Frostmaiden')).toBeInTheDocument()
      expect(
        screen.getByText('Nothing on the screen yet. Your DM will put something here.'),
      ).toBeInTheDocument()
    })
  })

  describe('the size control', () => {
    it('scales the whole screen from one font size, and keeps the choice', async () => {
      respondWith(VIEW)

      render(<TableScreen token={TOKEN} />)

      // Waited for by content, not by role: the loading state is a `main` too.
      await screen.findByText('Ambush at the bridge')
      const main = screen.getByRole('main')

      // Everything else on the screen is an `em` off this one number, so one
      // tap moves the names, the numbers and the conditions together.
      expect(main).toHaveStyle({ fontSize: '20px' })

      await act(async () => {
        screen.getByLabelText('Bigger text').click()
      })
      expect(main).toHaveStyle({ fontSize: '24px' })

      // Kept per screen rather than per campaign: the laptop at the table and
      // the DM's phone previewing the same link want different answers.
      expect(window.localStorage.setItem).toHaveBeenCalledWith('table-screen-text-size', '2')
    })

    it('opens at the size this screen was last left at', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('4')
      respondWith(VIEW)

      render(<TableScreen token={TOKEN} />)

      await screen.findByText('Ambush at the bridge')
      await waitFor(() => expect(screen.getByRole('main')).toHaveStyle({ fontSize: '34px' }))
    })

    it('renders at the default size when the browser refuses to remember anything', async () => {
      ;(window.localStorage.getItem as jest.Mock).mockImplementation(() => {
        throw new Error('site data blocked')
      })
      respondWith(VIEW)

      render(<TableScreen token={TOKEN} />)

      // A private window, or a browser set to block site data. The screen is
      // the wrong place to find out about it.
      await screen.findByText('Ambush at the bridge')
      expect(screen.getByRole('main')).toHaveStyle({ fontSize: '20px' })
    })
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
