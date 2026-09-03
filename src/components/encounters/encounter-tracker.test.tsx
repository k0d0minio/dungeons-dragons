import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

// The XP award card reads monster prices through SWR (DND-055), and the stat
// block sheet reads one monster. Both stubbed here so the tracker's own
// requests are the only ones on `mockFetch` — every assertion below counts
// calls by position.
jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useMonsterDetails: jest.fn(),
  useMonster: jest.fn(),
}))

import { toast } from 'sonner'

import type { Character } from '@/lib/db/characters'
import type { CombatantWithCharacter, Encounter, EncounterCombatant } from '@/lib/db/encounters'
import { useMonster, useMonsterDetails } from '@/lib/srd/hooks'
import { MONSTERS } from '@/lib/srd/monsters'

import { EncounterTracker } from './encounter-tracker'

// The tracker's contract (DND-031, D13, D17): rows sort by initiative with
// blanks at the bottom, Next turn wraps into a new round, monster damage
// lands on the combatant row, and PC damage goes through the character API
// with the version guard — adopting the server's row out loud on a 409.

const mockToastWarning = toast.warning as jest.MockedFunction<typeof toast.warning>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const ENCOUNTER: Encounter = {
  id: ENCOUNTER_ID,
  campaignId: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  name: 'Ambush at the bridge',
  round: 1,
  activeTurn: 0,
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  completedAt: null,
  createdAt: new Date('2026-08-15T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T12:00:00.000Z'),
}

const CHARACTER: Character = {
  portrait: null,
  id: CHARACTER_ID,
  ownerId: 'user_9zQw1nBvRt',
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 21,
  temporaryHitPoints: 3,
  armorClass: 12,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 4,
  knownSpellIndexes: [],
  preparedSpellIndexes: [],
  concentration: null,
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  skillProficiencies: [],
  skillExpertise: [],
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-13T09:30:00.000Z'),
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
  featChoices: null,
}

function monster(
  id: string,
  label: string,
  initiative: number | null,
  sortOrder: number,
): EncounterCombatant {
  return {
    id,
    encounterId: ENCOUNTER_ID,
    characterId: null,
    monsterIndex: 'goblin',
    label,
    initiative,
    sortOrder,
    maxHitPoints: 7,
    currentHitPoints: 7,
    temporaryHitPoints: 0,
    conditions: [],
    createdAt: new Date('2026-08-15T12:05:00.000Z'),
    updatedAt: new Date('2026-08-15T12:05:00.000Z'),
  }
}

const GOBLIN_1 = monster('9d0e1f2a-3b4c-4d5e-8f9a-0b1c2d3e4f5a', 'Goblin 1', 17, 1)
const GOBLIN_2 = monster('8c9d0e1f-2a3b-4c5d-8e9f-0a1b2c3d4e5f', 'Goblin 2', null, 2)

const PC_ROW: CombatantWithCharacter = {
  combatant: {
    id: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
    encounterId: ENCOUNTER_ID,
    characterId: CHARACTER_ID,
    monsterIndex: null,
    label: 'Vex Ashbrand',
    initiative: 15,
    sortOrder: 0,
    maxHitPoints: null,
    currentHitPoints: null,
    temporaryHitPoints: 0,
    conditions: [],
    createdAt: new Date('2026-08-15T12:04:00.000Z'),
    updatedAt: new Date('2026-08-15T12:04:00.000Z'),
  },
  character: CHARACTER,
}

const COMBATANTS: CombatantWithCharacter[] = [
  PC_ROW,
  { combatant: GOBLIN_1, character: null },
  { combatant: GOBLIN_2, character: null },
]

/** The JSON body of the `call`-th fetch, parsed. */
function fetchBody(call: number): unknown {
  const [, init] = mockFetch.mock.calls[call]
  return JSON.parse((init as RequestInit).body as string)
}

function renderTracker(encounter: Encounter = ENCOUNTER) {
  return render(
    <EncounterTracker initialEncounter={encounter} initialCombatants={COMBATANTS} roster={[]} />,
  )
}

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  } as Response)

  // Two goblins at 50 XP each, one character in the fight: 100 XP, 100 each.
  ;(useMonsterDetails as jest.MockedFunction<typeof useMonsterDetails>).mockReturnValue({
    details: { goblin: { experiencePoints: 50 } },
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonsterDetails>)
  ;(useMonster as jest.MockedFunction<typeof useMonster>).mockReturnValue({
    monster: MONSTERS.get('goblin-warrior'),
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonster>)
})

describe('EncounterTracker', () => {
  it('sorts by initiative descending with unset initiative sunk to the bottom, flagged', () => {
    renderTracker()

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Goblin 1')
    expect(rows[1]).toHaveTextContent('Vex Ashbrand')
    expect(rows[2]).toHaveTextContent('Goblin 2')
    expect(rows[2]).toHaveTextContent('no initiative')

    // Active turn 0 highlights the top of the order.
    expect(rows[0]).toHaveAttribute('aria-current', 'true')
    expect(rows[1]).not.toHaveAttribute('aria-current')
  })

  it('advances the turn, and wraps past the last combatant into a new round', async () => {
    const user = userEvent.setup()
    const onLastTurn = { ...ENCOUNTER, activeTurn: 2 }
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ encounter: { ...onLastTurn, round: 2, activeTurn: 0 } }),
    } as Response)

    renderTracker(onLastTurn)

    await user.click(screen.getByRole('button', { name: 'Next turn' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}`)
    expect((init as RequestInit).method).toBe('PATCH')
    expect(fetchBody(0)).toEqual({ round: 2, activeTurn: 0 })

    expect(await screen.findByText('2')).toBeInTheDocument() // Round 2
  })

  it('sends a monster damage tap to the combatant PATCH, temp soaking first', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ combatant: { ...GOBLIN_1, currentHitPoints: 2 } }),
    } as Response)

    renderTracker()

    await user.click(screen.getByRole('button', { name: 'Goblin 1 takes 5 damage' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}/combatants/${GOBLIN_1.id}`)
    expect((init as RequestInit).method).toBe('PATCH')
    expect(fetchBody(0)).toEqual({ currentHitPoints: 2, temporaryHitPoints: 0 })
  })

  it('sends PC damage through the character API with the version guard (D13)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        character: { ...CHARACTER, currentHitPoints: 19, temporaryHitPoints: 0, version: 5 },
      }),
    } as Response)

    renderTracker()

    await user.click(screen.getByRole('button', { name: 'Vex Ashbrand takes 5 damage' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER_ID}`)
    expect((init as RequestInit).method).toBe('PATCH')
    // Temp HP (3) soaks first; 21 − 2 = 19. Absolute values, version carried.
    expect(fetchBody(0)).toEqual({ currentHitPoints: 19, temporaryHitPoints: 0, version: 4 })
  })

  it('shows a PC’s concentration and drops it through the same guarded write (DND-049)', async () => {
    const user = userEvent.setup()
    const concentrating = {
      ...CHARACTER,
      concentration: { index: 'moonbeam', name: 'Moonbeam' },
    }

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ character: { ...concentrating, concentration: null, version: 5 } }),
    } as Response)

    render(
      <EncounterTracker
        initialEncounter={ENCOUNTER}
        initialCombatants={[
          { ...PC_ROW, character: concentrating },
          { combatant: GOBLIN_1, character: null },
        ]}
        roster={[]}
      />,
    )

    expect(screen.getByText('Concentrating: Moonbeam')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Vex Ashbrand loses concentration on Moonbeam' }),
    )

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(mockFetch.mock.calls[0][0]).toBe(`/api/characters/${CHARACTER_ID}`)
    expect(fetchBody(0)).toEqual({ concentration: null, version: 4 })

    await waitFor(() => expect(screen.queryByText(/Concentrating:/)).not.toBeInTheDocument())
  })

  it('leaves monster rows out of it — a monster instance has no concentration', () => {
    renderTracker()

    expect(screen.queryByText(/Concentrating:/)).not.toBeInTheDocument()
  })

  it('adopts the server’s row and says so when the PC write loses a race (409)', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        character: { ...CHARACTER, currentHitPoints: 10, temporaryHitPoints: 0, version: 6 },
      }),
    } as Response)

    renderTracker()

    await user.click(screen.getByRole('button', { name: 'Vex Ashbrand takes 5 damage' }))

    await waitFor(() => expect(mockToastWarning).toHaveBeenCalled())
    expect(mockToastWarning.mock.calls[0][0]).toContain('Someone else updated Vex Ashbrand first')

    // The adopted row is what renders now: 10 of 32.
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('removes a combatant with a scoped DELETE', async () => {
    const user = userEvent.setup()

    renderTracker()

    await user.click(screen.getByRole('button', { name: 'Remove Goblin 1' }))

    expect(screen.queryByText('Goblin 1')).not.toBeInTheDocument()

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}/combatants/${GOBLIN_1.id}`)
    expect((init as RequestInit).method).toBe('DELETE')
  })

  it('rolls a monster’s initiative with a plain d20', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ combatant: { ...GOBLIN_2, initiative: 11 } }),
    } as Response)

    renderTracker()

    await user.click(screen.getByRole('button', { name: 'Roll initiative for Goblin 2' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const body = fetchBody(0) as { initiative: number }
    expect(body.initiative).toBeGreaterThanOrEqual(1)
    expect(body.initiative).toBeLessThanOrEqual(20)
  })

  // DND-055: the award is the same version-guarded character write every other
  // PC change on this screen makes, so a player editing their own sheet during
  // the fight loses the award to a 409 rather than losing it silently.
  describe('awarding XP', () => {
    it('writes the split as an absolute total through the character API', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ character: { ...CHARACTER, experience: 100, version: 5 } }),
      } as Response)

      renderTracker()

      expect(screen.getByText(/100 XP in the fight, split 1 way/i)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /award to party/i }))

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe(`/api/characters/${CHARACTER_ID}`)
      // Absolute, not a delta, and carrying the version last read.
      expect(fetchBody(0)).toEqual({ experience: 100, version: 4 })
    })

    it('adds to what a character already has rather than replacing it', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ character: { ...CHARACTER, experience: 6_500, version: 5 } }),
      } as Response)

      render(
        <EncounterTracker
          initialEncounter={ENCOUNTER}
          initialCombatants={[
            { ...PC_ROW, character: { ...CHARACTER, experience: 6_400 } },
            { combatant: GOBLIN_1, character: null },
            { combatant: GOBLIN_2, character: null },
          ]}
          roster={[]}
        />,
      )

      await user.click(screen.getByRole('button', { name: /award to party/i }))

      await waitFor(() => expect(mockFetch).toHaveBeenCalled())
      expect(fetchBody(0)).toMatchObject({ experience: 6_500 })
    })

    it('says how many of the party the award actually reached', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ character: { ...CHARACTER, version: 9 } }),
      } as Response)

      renderTracker()

      await user.click(screen.getByRole('button', { name: /award to party/i }))

      await waitFor(() =>
        expect(mockToastWarning).toHaveBeenCalledWith(
          expect.stringContaining('0 of 1'),
          expect.anything(),
        ),
      )
    })
  })

  // `dm-run-suite/tracker-stat-blocks`: the stat block opens over the fight,
  // never instead of it. Nothing here navigates.
  describe('the stat block', () => {
    it('opens on a monster row’s name, titled by the row and not the SRD', async () => {
      const user = userEvent.setup()
      renderTracker()

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Goblin 2' }))

      const sheet = await screen.findByRole('dialog')
      expect(within(sheet).getByText('Goblin 2')).toBeInTheDocument()
      expect(useMonster).toHaveBeenCalledWith('goblin')
      // Read from the block itself, not re-fetched by the tracker.
      expect(within(sheet).getByText('AC')).toBeInTheDocument()
      expect(within(sheet).getAllByText('+4 to hit').length).toBeGreaterThan(0)
    })

    it('leaves a PC row linking to their sheet instead', () => {
      renderTracker()

      const link = screen.getByRole('link', { name: 'Vex Ashbrand' })
      expect(link).toHaveAttribute('href', `/characters/${CHARACTER_ID}`)
      expect(screen.queryByRole('button', { name: 'Vex Ashbrand' })).not.toBeInTheDocument()
    })
  })
})
