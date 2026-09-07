import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character } from '@/lib/db/schema'

import { PlayParty } from './play-party'

// The party, compacted for the Play tab (`dm-chronology/play-tab`). Same data
// and same poll as `PartyGlance`; what these pin is what the compact row adds
// — who plays the character, and the milestone as a value row that opens the
// control rather than a card sitting on a screen used mid-fight.

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const OWNER = 'user_9zQw1nBvRt'

const CHARACTER: Character = {
  portrait: null,
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: OWNER,
  name: 'Vex Ashbrand',
  classIndex: 'ranger',
  speciesIndex: 'half-elf',
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 10,
  wisdom: 14,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 21,
  temporaryHitPoints: 3,
  armorClass: 15,
  speed: 30,
  spellSlots: {},
  conditions: ['prone'],
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
  skillProficiencies: ['perception'],
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

describe('PlayParty', () => {
  it('says who plays each character, beside their class and level', () => {
    render(
      <PlayParty
        campaignId={CAMPAIGN_ID}
        initialCharacters={[CHARACTER]}
        playedBy={{ [OWNER]: 'Sam' }}
        milestoneLevel={null}
      />,
    )

    expect(screen.getByText('Vex Ashbrand')).toBeInTheDocument()
    expect(screen.getByText('Level 5 Ranger · Sam')).toBeInTheDocument()
  })

  it('prints the vitals the glance prints, and links to the same profile page', () => {
    render(
      <PlayParty campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} milestoneLevel={null} />,
    )

    expect(screen.getByText('21/32')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
    // WIS 14 (+2), level 5 (proficiency +3), proficient in Perception: 15.
    expect(screen.getByText('AC 15 · PP 15')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Vex Ashbrand/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/party/${CHARACTER.id}`,
    )
  })

  it('gives a row its conditions line only when there is something on it', () => {
    const { unmount } = render(
      <PlayParty
        campaignId={CAMPAIGN_ID}
        initialCharacters={[{ ...CHARACTER, conditions: [], exhaustion: 0 }]}
        milestoneLevel={null}
      />,
    )

    expect(screen.queryByText('Prone')).not.toBeInTheDocument()
    unmount()

    render(
      <PlayParty campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} milestoneLevel={null} />,
    )

    expect(screen.getByText('Prone')).toBeInTheDocument()
  })

  it('states the milestone as a value row, counting who has taken it', () => {
    render(
      <PlayParty
        campaignId={CAMPAIGN_ID}
        initialCharacters={[CHARACTER, { ...CHARACTER, id: 'behind', level: 4 }]}
        milestoneLevel={5}
      />,
    )

    expect(screen.getByText('Level 5 · 1 of 2 have taken it')).toBeInTheDocument()
  })

  it('says so plainly when no level has been called', () => {
    render(
      <PlayParty campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} milestoneLevel={null} />,
    )

    expect(screen.getByText('Not called')).toBeInTheDocument()
  })

  it('opens the milestone control in a sheet rather than sitting on the screen', async () => {
    const user = userEvent.setup()

    render(
      <PlayParty campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} milestoneLevel={4} />,
    )

    expect(
      screen.queryByRole('button', { name: /The party reaches level/ }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Milestone/ }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'The party reaches level 5' })).toBeInTheDocument()
  })

  it('shows the join-link nudge when nobody has joined', () => {
    render(<PlayParty campaignId={CAMPAIGN_ID} initialCharacters={[]} milestoneLevel={null} />)

    expect(screen.getByText(/Nobody has joined yet/)).toBeInTheDocument()
  })
})
