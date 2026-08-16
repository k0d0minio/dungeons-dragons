import { render, screen } from '@testing-library/react'

import type { Character } from '@/lib/db/schema'

import { PartyGlance } from './party-glance'

// The DM's one screen during a session (DND-030): what these tests pin is
// that the vitals are the *real* numbers — passive Perception with the stored
// proficiencies folded in — and that a row is a link to the actual sheet.

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const CHARACTER: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_9zQw1nBvRt',
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
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  // Proficient in Perception: passive Perception must count it.
  skillProficiencies: ['perception'],
  skillExpertise: [],
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-13T09:30:00.000Z'),
}

describe('PartyGlance', () => {
  it('renders the vitals: HP with temp, AC, and the real passive Perception', () => {
    render(<PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} />)

    expect(screen.getByText('Vex Ashbrand')).toBeInTheDocument()
    expect(screen.getByText('21/32')).toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
    // WIS 14 (+2), level 5 (proficiency +3), proficient in Perception:
    // 10 + 2 + 3 = 15 — the proficiency term included, no caveat needed.
    // AC is also 15, so the number appears twice: once under each header.
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('PP')).toBeInTheDocument()
    expect(screen.getAllByText('15')).toHaveLength(2)
  })

  it('shows conditions without tapping through', () => {
    render(<PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} />)

    expect(screen.getByText('Prone')).toBeInTheDocument()
  })

  it('links each row to the character’s full sheet', () => {
    render(<PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} />)

    const link = screen.getByRole('link', { name: /Vex Ashbrand/ })
    expect(link).toHaveAttribute('href', `/characters/${CHARACTER.id}`)
  })

  it('says so when nobody has joined', () => {
    render(<PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[]} />)

    expect(
      screen.getByText('Nobody has joined yet. Send the join link to your players.'),
    ).toBeInTheDocument()
  })
})
