import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}))

jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useMonsters: jest.fn(),
  useMonsterDetails: jest.fn(),
}))

import { useMonsterDetails, useMonsters } from '@/lib/srd/hooks'

import { EncounterBuilder, type AttendeeOption } from './encounter-builder'

// The builder's contract (`dm-prep-suite/encounter-builder`): monsters priced
// off the list rows, a budget that follows the attendance ticks, a warning past
// High, and a create that hands the tracker an encounter with the bodies
// already in it. The tracker itself is untouched by any of this.

const mockUseMonsters = useMonsters as jest.MockedFunction<typeof useMonsters>
const mockUseMonsterDetails = useMonsterDetails as jest.MockedFunction<typeof useMonsterDetails>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

/** Four at level 3 — the dm-guide's worked party: 600 / 900 / 1,600. */
const ROSTER: AttendeeOption[] = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Vex', level: 3 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Brom', level: 3 },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Sable', level: 3 },
  { id: '44444444-4444-4444-8444-444444444444', name: 'Pike', level: 3 },
]

const MONSTERS = [
  {
    index: 'ogre',
    name: 'Ogre',
    challengeRating: 2,
    challengeRatingText: '2',
    experiencePoints: 450,
    type: 'Giant',
  },
  {
    index: 'goblin-warrior',
    name: 'Goblin Warrior',
    challengeRating: 0.25,
    challengeRatingText: '1/4',
    experiencePoints: 50,
    type: 'Fey',
  },
]

beforeEach(() => {
  mockPush.mockClear()
  mockFetch.mockReset()
  mockUseMonsters.mockReturnValue({
    monsters: MONSTERS,
    count: MONSTERS.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonsters>)
  mockUseMonsterDetails.mockReturnValue({
    details: { ogre: { hitPoints: 68 }, 'goblin-warrior': { hitPoints: 7 } },
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonsterDetails>)
})

function renderBuilder(roster: AttendeeOption[] = ROSTER) {
  return render(<EncounterBuilder campaignId={CAMPAIGN_ID} roster={roster} />)
}

/** Tap a monster in the search results. */
async function add(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`^${name} CR`) }))
}

describe('EncounterBuilder', () => {
  it('starts with the whole roster attending and their budget on screen', () => {
    renderBuilder()

    for (const character of ROSTER) {
      expect(screen.getByLabelText(new RegExp(character.name))).toBeChecked()
    }
    expect(screen.getByText(/Low 600 · Moderate 900 · High 1,600/)).toBeInTheDocument()
    expect(screen.getByText('No monsters yet')).toBeInTheDocument()
  })

  it('prices monsters off the list row as they are added', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await add(user, 'Ogre')
    expect(screen.getByText('Under Low')).toBeInTheDocument()
    expect(screen.getByText('450 XP · 4 characters')).toBeInTheDocument()

    // A second tap on the same stat block is one more of it, not a second row.
    await add(user, 'Ogre')
    expect(screen.getByText('Moderate')).toBeInTheDocument()
    expect(screen.getByText('900 XP · 4 characters')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'One more Ogre' })).toHaveLength(1)
  })

  it('re-prices the same fight when somebody cannot make it', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await add(user, 'Ogre')
    await add(user, 'Ogre')
    expect(screen.getByText('Moderate')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/Sable/))
    await user.click(screen.getByLabelText(/Pike/))

    // 900 XP against two level-3 characters is 100 past their High budget.
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('100 XP past a High fight')
  })

  it('withholds a verdict when nobody is ticked', async () => {
    const user = userEvent.setup()
    renderBuilder()

    for (const character of ROSTER) {
      await user.click(screen.getByLabelText(new RegExp(character.name)))
    }

    expect(screen.getByText('No difficulty yet')).toBeInTheDocument()
  })

  it('takes a line back off the fight at one', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await add(user, 'Goblin Warrior')
    await user.click(screen.getByRole('button', { name: 'Remove Goblin Warrior' }))

    expect(screen.getByText('Nothing in the fight yet.')).toBeInTheDocument()
    expect(screen.getByText('No monsters yet')).toBeInTheDocument()
  })

  it('hands the tracker an encounter with the party and the monsters already in it', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ encounter: { id: ENCOUNTER_ID } }),
    } as Response)

    renderBuilder()

    await user.type(screen.getByLabelText('Name'), 'Ambush at the bridge')
    await add(user, 'Goblin Warrior')
    await add(user, 'Goblin Warrior')
    await user.click(screen.getByLabelText(/Pike/))

    await user.click(screen.getByRole('button', { name: 'Create encounter' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/dm/encounters/${ENCOUNTER_ID}`))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/encounters`)
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: 'Ambush at the bridge',
      // Pike is unticked, so Pike is neither budgeted for nor seeded.
      characterIds: ROSTER.slice(0, 3).map((character) => character.id),
      monsters: [
        {
          monsterIndex: 'goblin-warrior',
          name: 'Goblin Warrior',
          count: 2,
          // Seeded from the stat block's average HP, per D17.
          maxHitPoints: 7,
        },
      ],
    })
  })

  it('saves a monster whose stat block has not landed as untracked HP', async () => {
    const user = userEvent.setup()
    mockUseMonsterDetails.mockReturnValue({
      details: {},
      isLoading: true,
      error: undefined,
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useMonsterDetails>)
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ encounter: { id: ENCOUNTER_ID } }),
    } as Response)

    renderBuilder()

    await user.type(screen.getByLabelText('Name'), 'Ambush at the bridge')
    await add(user, 'Ogre')
    await user.click(screen.getByRole('button', { name: 'Create encounter' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalled())

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.monsters[0].maxHitPoints).toBeNull()
  })

  it('refuses to create without a name', () => {
    renderBuilder()

    expect(screen.getByRole('button', { name: 'Create encounter' })).toBeDisabled()
  })

  it('shows the server’s words when the create is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Give the encounter a name' }),
    } as Response)

    renderBuilder()

    await user.type(screen.getByLabelText('Name'), 'x')
    await user.click(screen.getByRole('button', { name: 'Create encounter' }))

    // Nothing is in the fight, so the only alert on screen is this one.
    expect(await screen.findByRole('alert')).toHaveTextContent('Give the encounter a name')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('steps a line up and down without going back to the search', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await add(user, 'Goblin Warrior')
    await user.click(screen.getByRole('button', { name: 'One more Goblin Warrior' }))
    await user.click(screen.getByRole('button', { name: 'One more Goblin Warrior' }))

    expect(screen.getByText('150 XP · 4 characters')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'One fewer Goblin Warrior' }))
    expect(screen.getByText('100 XP · 4 characters')).toBeInTheDocument()
  })

  it('narrows the monster list as the DM types', async () => {
    const user = userEvent.setup()
    renderBuilder()

    await user.type(screen.getByLabelText('Search monsters'), 'goblin')

    expect(screen.getByRole('button', { name: /^Goblin Warrior CR/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Ogre CR/ })).not.toBeInTheDocument()
  })

  it('says so when a send never leaves the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    renderBuilder()

    await user.type(screen.getByLabelText('Name'), 'Ambush')
    await user.click(screen.getByRole('button', { name: 'Create encounter' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('stops at a dozen different stat blocks and says why', async () => {
    const user = userEvent.setup()
    // Thirteen distinct monsters: one more than the builder will hold.
    mockUseMonsters.mockReturnValue({
      monsters: Array.from({ length: 13 }, (_, i) => ({
        index: `beast-${i}`,
        name: `Beast ${i}`,
        challengeRating: 1,
        challengeRatingText: '1',
        experiencePoints: 200,
        type: 'Beast',
      })),
      count: 13,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useMonsters>)

    renderBuilder()

    for (let i = 0; i < 12; i += 1) {
      await user.click(screen.getByRole('button', { name: new RegExp(`^Beast ${i} CR`) }))
    }

    expect(screen.getByText(/12 different stat blocks is the limit/)).toBeInTheDocument()
    // The search list is gone, so the thirteenth cannot be tapped in at all.
    expect(screen.queryByRole('button', { name: /^Beast 12 CR/ })).not.toBeInTheDocument()
    expect(screen.getByText('2,400 XP · 4 characters')).toBeInTheDocument()
  })

  it('says so while the monster list is still loading', () => {
    mockUseMonsters.mockReturnValue({
      monsters: [],
      count: 0,
      isLoading: true,
      error: undefined,
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useMonsters>)

    renderBuilder()

    expect(screen.getByText('Loading the monster list…')).toBeInTheDocument()
  })

  it('still builds a fight for a campaign nobody has joined', () => {
    renderBuilder([])

    expect(screen.getByText(/Nobody has joined this campaign yet/)).toBeInTheDocument()
    expect(screen.getByText('No difficulty yet')).toBeInTheDocument()
  })
})
