import { render, screen } from '@testing-library/react'

import type { Character } from '@/lib/db/schema'

import { PartyGlance } from './party-glance'

// The DM's one screen during a session (DND-030): what these tests pin is
// that the vitals are the *real* numbers — passive Perception with the stored
// proficiencies folded in — and that a row is a link to the actual sheet.

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const CHARACTER: Character = {
  portrait: null,
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
  // Proficient in Perception: passive Perception must count it.
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

  it('shows what a character is concentrating on, and nothing when they are not (DND-049)', () => {
    const { unmount } = render(
      <PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} />,
    )

    expect(screen.queryByText(/Concentrating:/)).not.toBeInTheDocument()
    unmount()

    render(
      <PartyGlance
        campaignId={CAMPAIGN_ID}
        initialCharacters={[
          { ...CHARACTER, concentration: { index: 'moonbeam', name: 'Moonbeam' } },
        ]}
      />,
    )

    expect(screen.getByText('Concentrating: Moonbeam')).toBeInTheDocument()
  })

  it('links each row to the DM’s page for that character', () => {
    render(<PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[CHARACTER]} />)

    const link = screen.getByRole('link', { name: /Vex Ashbrand/ })
    expect(link).toHaveAttribute('href', `/dm/campaigns/${CAMPAIGN_ID}/party/${CHARACTER.id}`)
  })

  // `first-table/glance-derived-ac`: the AC the sheet prints, from the same
  // function. On production the glance said 10 for a paladin whose sheet said 18.
  it('derives AC from the worn armour the roster carries, and keeps the column without any', () => {
    render(
      <PartyGlance
        campaignId={CAMPAIGN_ID}
        initialCharacters={[CHARACTER, { ...CHARACTER, id: 'naked', name: 'Naked Nell' }]}
        initialArmor={{
          [CHARACTER.id]: [
            {
              index: 'chain-mail',
              categories: ['armor', 'heavy-armor'],
              armorClass: { base: 16, dexBonus: false, maxBonus: 0 },
            },
            {
              index: 'shield',
              categories: ['armor', 'shields'],
              armorClass: { base: 2, dexBonus: false, maxBonus: 0 },
            },
          ],
        }}
      />,
    )

    // Chain mail 16, no Dex, shield +2.
    expect(screen.getByText('18')).toBeInTheDocument()
    // Nell wears nothing: the stored 15 stands (and PP is 15 too).
    expect(screen.getAllByText('15')).toHaveLength(3)
  })

  it('says so when nobody has joined', () => {
    render(<PartyGlance campaignId={CAMPAIGN_ID} initialCharacters={[]} />)

    expect(
      screen.getByText('Nobody has joined yet. Send the join link to your players.'),
    ).toBeInTheDocument()
  })
})
