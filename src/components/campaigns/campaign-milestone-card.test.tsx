import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { Character } from '@/lib/db/schema'

import { CampaignMilestoneCard } from './campaign-milestone-card'

// The DM's half of D35. The property that matters most is the first one
// tested: the tap writes the **campaign**, once, and no character request is
// made — a party loop on a driver with no transactions is exactly what this
// feature exists to avoid.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const BASE: Character = {
  portrait: null,
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_9zQw1nBvRt',
  name: 'Vex Ashbrand',
  classIndex: 'ranger',
  speciesIndex: 'half-elf',
  level: 3,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 10,
  wisdom: 14,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 21,
  temporaryHitPoints: 0,
  armorClass: 15,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
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

function character(name: string, level: number): Character {
  return { ...BASE, id: `${name}-id`, name, level }
}

/** A fresh SWR cache per render — the party poll shares its key with the glance. */
function renderCard(props: { milestoneLevel: number | null; party: Character[] }) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <CampaignMilestoneCard
        campaignId={CAMPAIGN_ID}
        milestoneLevel={props.milestoneLevel}
        initialCharacters={props.party}
      />
    </SWRConfig>,
  )
}

function writes() {
  return mockFetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method)
}

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ campaign: { id: CAMPAIGN_ID } }),
  } as Response)
})

describe('CampaignMilestoneCard', () => {
  it('calls a level with one write to the campaign, and touches no character', async () => {
    const user = userEvent.setup()
    renderCard({ milestoneLevel: 3, party: [character('Vex', 3), character('Ora', 3)] })

    await user.click(screen.getByRole('button', { name: 'The party reaches level 4' }))

    await waitFor(() => expect(writes()).toHaveLength(1))

    const [url, init] = writes()[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/milestone`)
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ milestoneLevel: 4 })

    // The heart of D35: nothing is fanned out to the party.
    for (const [called] of mockFetch.mock.calls) {
      expect(String(called)).not.toContain('/api/characters/')
    }
  })

  it('offers a level past the party when no milestone has been called yet', () => {
    // A DM setting this mid-campaign has 3rd-level characters already.
    renderCard({ milestoneLevel: null, party: [character('Vex', 3), character('Ora', 2)] })

    expect(screen.getByText('No level called yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'The party reaches level 4' })).toBeInTheDocument()
  })

  it('says who has taken the level and who has not', async () => {
    renderCard({
      milestoneLevel: 4,
      party: [character('Vex', 4), character('Ora', 3), character('Bram', 3)],
    })

    expect(screen.getByText('Level 4')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 have levelled up.')).toBeInTheDocument()
    expect(screen.getByText(/Still to level up: Ora, Bram/)).toBeInTheDocument()
  })

  it('says so when the whole party has caught up', () => {
    renderCard({ milestoneLevel: 4, party: [character('Vex', 4), character('Ora', 5)] })

    expect(screen.getByText('All 2 have levelled up.')).toBeInTheDocument()
    expect(screen.queryByText(/Still to level up/)).not.toBeInTheDocument()
  })

  it('repaints at once and puts the number back when the write is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No such campaign' }),
    } as Response)

    renderCard({ milestoneLevel: 3, party: [character('Vex', 3)] })

    await user.click(screen.getByRole('button', { name: 'The party reaches level 4' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such campaign'))
    expect(screen.getByText('Level 3')).toBeInTheDocument()
  })

  it('mends a mis-tap by putting the level back, rather than asking first', async () => {
    const user = userEvent.setup()
    renderCard({ milestoneLevel: 4, party: [character('Vex', 4)] })

    await user.click(screen.getByRole('button', { name: 'Back to level 3' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(JSON.parse(String((writes()[0][1] as RequestInit).body))).toEqual({ milestoneLevel: 3 })
  })

  it('lets a table stop levelling by milestone entirely', async () => {
    const user = userEvent.setup()
    renderCard({ milestoneLevel: 4, party: [character('Vex', 4)] })

    await user.click(screen.getByRole('button', { name: 'Stop levelling by milestone' }))

    await waitFor(() => expect(writes()).toHaveLength(1))
    expect(JSON.parse(String((writes()[0][1] as RequestInit).body))).toEqual({
      milestoneLevel: null,
    })
  })

  it('has nothing to offer at the top of the table', () => {
    renderCard({ milestoneLevel: 20, party: [character('Vex', 20)] })

    expect(screen.queryByRole('button', { name: /reaches level/ })).not.toBeInTheDocument()
    expect(screen.getByText(/the top of the table/i)).toBeInTheDocument()
  })

  it('offers no repairs before a level has ever been called', () => {
    renderCard({ milestoneLevel: null, party: [character('Vex', 1)] })

    expect(screen.queryByRole('button', { name: /^Back to level/ })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Stop levelling by milestone' }),
    ).not.toBeInTheDocument()
  })
})
