import { render, screen } from '@testing-library/react'

import type { Character, CharacterItem } from '@/lib/db/schema'
import { EQUIPMENT } from '@/lib/srd/equipment'
import type { SrdEquipment } from '@/lib/srd/types'

import { AttacksCard } from './attacks-card'

const FIGHTER: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Brom Ironfist',
  classIndex: 'fighter',
  speciesIndex: 'human',
  level: 5,
  strength: 16,
  dexterity: 18,
  constitution: 14,
  intelligence: 10,
  wisdom: 12,
  charisma: 8,
  maxHitPoints: 44,
  currentHitPoints: 44,
  temporaryHitPoints: 0,
  armorClass: 16,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
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
  knownSpellIndexes: [],
  preparedSpellIndexes: [],
  concentration: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
  asiChoices: null,
}

function item(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    characterId: FIGHTER.id,
    equipmentIndex: 'longbow',
    customName: null,
    quantity: 1,
    equipped: true,
    attuned: false,
    notes: null,
    createdAt: new Date('2026-08-14T12:00:00.000Z'),
    updatedAt: new Date('2026-08-14T12:00:00.000Z'),
    ...overrides,
  }
}

/**
 * The real SRD 5.2.1 equipment rows. The card reads the *category* from these
 * to decide what is a weapon, and gets the dice, properties and mastery from
 * the local weapons table by the same index — so a fixture that invented its
 * own numbers would no longer be testing the join the card performs.
 */
function equipment(index: string): SrdEquipment {
  const entry = EQUIPMENT.get(index)
  if (!entry) throw new Error(`no SRD equipment "${index}"`)
  return entry
}

const LONGBOW = equipment('longbow')
const RAPIER = equipment('rapier')
const CHAIN_MAIL = equipment('chain-mail')

describe('AttacksCard', () => {
  it('uses Dexterity and shows the range for a ranged weapon', () => {
    render(
      <AttacksCard
        character={FIGHTER}
        items={[item()]}
        details={{ longbow: LONGBOW }}
        detailsLoading={false}
      />,
    )

    // DEX +4 + proficiency +3 = +7, and the ranged modifier lands on damage.
    expect(
      screen.getByLabelText('Longbow +7, 1d8+4 piercing · range 150/600 ft, Mastery: Slow'),
    ).toBeInTheDocument()
  })

  it('lets a finesse weapon take the better of STR and DEX', () => {
    render(
      <AttacksCard
        character={FIGHTER}
        items={[item({ equipmentIndex: 'rapier' })]}
        details={{ rapier: RAPIER }}
        detailsLoading={false}
      />,
    )

    // DEX 18 beats STR 16: +4 + 3 proficiency.
    expect(screen.getByLabelText('Rapier +7, 1d8+4 piercing, Mastery: Vex')).toBeInTheDocument()
  })

  it('honours a rename: the custom name over the reference name', () => {
    render(
      <AttacksCard
        character={FIGHTER}
        items={[item({ equipmentIndex: 'rapier', customName: 'Whisper' })]}
        details={{ rapier: RAPIER }}
        detailsLoading={false}
      />,
    )

    expect(screen.getByLabelText('Whisper +7, 1d8+4 piercing, Mastery: Vex')).toBeInTheDocument()
  })

  it('says which class cannot use the mastery property it names (2024)', () => {
    render(
      <AttacksCard
        character={{ ...FIGHTER, classIndex: 'wizard' }}
        items={[item({ equipmentIndex: 'rapier' })]}
        details={{ rapier: RAPIER }}
        detailsLoading={false}
      />,
    )

    expect(screen.getByText('Mastery: Vex — not available to your class')).toBeInTheDocument()
  })

  it('folds exhaustion into every attack bonus and footnotes it (2024)', () => {
    render(
      <AttacksCard
        character={{ ...FIGHTER, exhaustion: 2 }}
        items={[item({ equipmentIndex: 'rapier' })]}
        details={{ rapier: RAPIER }}
        detailsLoading={false}
      />,
    )

    // +7 less 2 per exhaustion level; the damage modifier is untouched.
    expect(screen.getByLabelText('Rapier +3, 1d8+4 piercing, Mastery: Vex')).toBeInTheDocument()
    expect(screen.getByText(/Exhaustion −4 is already in every attack bonus\./)).toBeInTheDocument()
  })

  it('keeps equipped armour out of the attack list', () => {
    render(
      <AttacksCard
        character={FIGHTER}
        items={[item({ equipmentIndex: 'chain-mail' })]}
        details={{ 'chain-mail': CHAIN_MAIL }}
        detailsLoading={false}
      />,
    )

    expect(screen.queryByText('Chain Mail')).not.toBeInTheDocument()
    // No weapon equipped, so the empty state shows beside the unarmed row.
    expect(screen.getByText('Equip a weapon in Inventory to see attacks.')).toBeInTheDocument()
  })

  it('holds a row open while its details load, and says when they never come', () => {
    const { rerender } = render(
      <AttacksCard character={FIGHTER} items={[item()]} details={{}} detailsLoading />,
    )

    expect(screen.getByLabelText('Longbow, Loading…')).toBeInTheDocument()

    rerender(
      <AttacksCard character={FIGHTER} items={[item()]} details={{}} detailsLoading={false} />,
    )

    expect(screen.getByLabelText('Longbow, stats unavailable')).toBeInTheDocument()
  })

  it('shows no spell row for a class without a casting ability', () => {
    render(<AttacksCard character={FIGHTER} items={[]} details={{}} detailsLoading={false} />)

    expect(screen.queryByText('Spell attack')).not.toBeInTheDocument()
    // Unarmed: +3 proficiency +3 STR to hit, 1 + 3 damage.
    expect(screen.getByLabelText('Unarmed strike +6, 4 bludgeoning')).toBeInTheDocument()
  })
})
