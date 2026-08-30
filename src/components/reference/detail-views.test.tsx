import { render, screen } from '@testing-library/react'

import { EQUIPMENT } from '@/lib/srd/equipment'
import { MAGIC_ITEMS } from '@/lib/srd/magic-items'
import { MONSTERS } from '@/lib/srd/monsters'
import { SPELLS } from '@/lib/srd/spells'

import { ClassDetail } from './class-detail'
import { EquipmentDetail } from './equipment-detail'
import { MagicItemDetail } from './magic-item-detail'
import { MonsterDetail } from './monster-detail'
import { SpeciesDetail } from './species-detail'
import { SpellDetail } from './spell-detail'

// Only the long tail is fetched; classes and species are read straight out of
// the local data, so those two views have no hook to mock and no loading state.
jest.mock('@/lib/srd/hooks', () => ({
  useSpell: jest.fn(),
  useEquipmentItem: jest.fn(),
  useMonster: jest.fn(),
  useMagicItem: jest.fn(),
}))

const hooks = jest.requireMock('@/lib/srd/hooks')
const mockUseSpell = jest.mocked(hooks.useSpell)
const mockUseEquipmentItem = jest.mocked(hooks.useEquipmentItem)
const mockUseMonster = jest.mocked(hooks.useMonster)
const mockUseMagicItem = jest.mocked(hooks.useMagicItem)

/**
 * Fixtures are the real SRD 5.2.1 rows rather than hand-written objects: these
 * views exist to render that data, and a fixture that drifts from it tests
 * nothing. It also means a regeneration that changes a shape fails here.
 */
function srd<T>(entry: T | null, what: string): T {
  if (!entry) throw new Error(`no SRD ${what}`)
  return entry
}

const FIREBALL = srd(SPELLS.get('fireball'), 'spell fireball')
const GOBLIN = srd(MONSTERS.get('goblin-warrior'), 'monster goblin-warrior')
const BAG_OF_HOLDING = srd(MAGIC_ITEMS.get('bag-of-holding'), 'magic item bag-of-holding')
const LONGSWORD = srd(EQUIPMENT.get('longsword'), 'equipment longsword')
const CHAIN_MAIL = srd(EQUIPMENT.get('chain-mail'), 'equipment chain-mail')

describe('SpellDetail', () => {
  it('shows a loading state while fetching', () => {
    mockUseSpell.mockReturnValue({ spell: undefined, isLoading: true, error: null })

    render(<SpellDetail index="fireball" />)

    expect(screen.getByText('Loading spell...')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseSpell.mockReturnValue({ spell: undefined, isLoading: false, error: new Error('boom') })

    render(<SpellDetail index="fireball" />)

    expect(screen.getByText('Error loading spell')).toBeInTheDocument()
  })

  it('renders the full mechanical detail (FR-003)', () => {
    mockUseSpell.mockReturnValue({ spell: FIREBALL, isLoading: false, error: null })

    render(<SpellDetail index="fireball" />)

    // Twice: the level badge, and the base row of the damage-by-slot table.
    expect(screen.getAllByText('Level 3')).toHaveLength(2)
    expect(screen.getByText('Evocation')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('150 feet')).toBeInTheDocument()
    expect(screen.getByText('Instantaneous')).toBeInTheDocument()
    expect(screen.getByText('V, S, M (a ball of bat guano and sulfur)')).toBeInTheDocument()
    expect(screen.getByText('Dexterity saving throw')).toBeInTheDocument()
    expect(screen.getByText(/A bright streak flashes from you/)).toBeInTheDocument()
    expect(screen.getByText('Using a Higher-Level Spell Slot')).toBeInTheDocument()
    // The SRD's damage-by-slot table, as the local data carries it — the
    // spell's own level first, then each higher slot.
    expect(screen.getByText('8d6')).toBeInTheDocument()
    expect(screen.getByText('Level 4')).toBeInTheDocument()
    expect(screen.getByText('9d6')).toBeInTheDocument()
    expect(screen.getByText('wizard')).toBeInTheDocument()
  })

  it('marks ritual and concentration spells', () => {
    mockUseSpell.mockReturnValue({
      spell: { ...FIREBALL, ritual: true, concentration: true },
      isLoading: false,
      error: null,
    })

    render(<SpellDetail index="fireball" />)

    expect(screen.getByText('Ritual')).toBeInTheDocument()
    expect(screen.getByText('Concentration')).toBeInTheDocument()
    // Concentration is folded into the Duration line the way the SRD prints it.
    expect(screen.getByText('Concentration, up to Instantaneous')).toBeInTheDocument()
  })
})

describe('ClassDetail', () => {
  it('renders hit die, saves, proficiencies, features and the SRD subclass', () => {
    render(<ClassDetail index="wizard" />)

    expect(screen.getByText('Hit Die d6')).toBeInTheDocument()
    expect(screen.getByText('d6')).toBeInTheDocument()
    expect(screen.getByText('Intelligence, Wisdom')).toBeInTheDocument()
    expect(screen.getByText('Level 3')).toBeInTheDocument()
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('Subclass')).toBeInTheDocument()
    expect(screen.getAllByText(/Evoker/).length).toBeGreaterThan(0)
  })

  it('shows an error state for a class SRD 5.2.1 does not define', () => {
    render(<ClassDetail index="artificer" />)

    expect(screen.getByText('Error loading class')).toBeInTheDocument()
  })
})

describe('SpeciesDetail', () => {
  it('renders size, speed, creature type and traits', () => {
    render(<SpeciesDetail index="elf" />)

    expect(screen.getByText('Speed 30 ft.')).toBeInTheDocument()
    expect(screen.getAllByText('Humanoid').length).toBeGreaterThan(0)
    expect(screen.getByText('Traits')).toBeInTheDocument()
    expect(screen.getAllByText(/Darkvision/).length).toBeGreaterThan(0)
    // 2024 lineages, the slot 5.1 called a subrace (D32).
    expect(screen.getByText('Drow')).toBeInTheDocument()
  })

  it('shows an error state for a species SRD 5.2.1 does not define', () => {
    // Half-elf left the SRD with the 2024 revision.
    render(<SpeciesDetail index="half-elf" />)

    expect(screen.getByText('Error loading species')).toBeInTheDocument()
  })
})

describe('EquipmentDetail', () => {
  it('renders cost, weight and the weapon columns from the weapons table', () => {
    mockUseEquipmentItem.mockReturnValue({
      equipment: LONGSWORD,
      isLoading: false,
      error: null,
    })

    render(<EquipmentDetail index="longsword" />)

    expect(screen.getByText('15 GP')).toBeInTheDocument()
    expect(screen.getByText('3 lb.')).toBeInTheDocument()
    // Damage, versatile damage and mastery all come from `weapons.json`, not
    // from the equipment row the hook returned.
    expect(screen.getByText('1d8 slashing (1d10 two-handed)')).toBeInTheDocument()
    expect(screen.getByText('Sap')).toBeInTheDocument()
    expect(screen.getByText('Versatile')).toBeInTheDocument()
  })

  it('renders armour stats for armour', () => {
    mockUseEquipmentItem.mockReturnValue({
      equipment: CHAIN_MAIL,
      isLoading: false,
      error: null,
    })

    render(<EquipmentDetail index="chain-mail" />)

    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByText('Stealth Disadvantage')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseEquipmentItem.mockReturnValue({
      equipment: undefined,
      isLoading: false,
      error: new Error('boom'),
    })

    render(<EquipmentDetail index="longsword" />)

    expect(screen.getByText('Error loading equipment')).toBeInTheDocument()
  })
})

describe('MagicItemDetail', () => {
  it('renders rarity, category, type line and description', () => {
    mockUseMagicItem.mockReturnValue({ magicItem: BAG_OF_HOLDING, isLoading: false, error: null })

    render(<MagicItemDetail index="bag-of-holding" />)

    expect(screen.getByText('Uncommon')).toBeInTheDocument()
    expect(screen.getByText('Wondrous Items')).toBeInTheDocument()
    expect(screen.getByText('Wondrous Items, uncommon')).toBeInTheDocument()
    // A Bag of Holding needs no attunement, and the view must not claim it does.
    expect(screen.queryByText('Requires attunement')).not.toBeInTheDocument()
  })

  it('reads attunement from the structured flag, not the prose', () => {
    mockUseMagicItem.mockReturnValue({
      magicItem: { ...BAG_OF_HOLDING, attunement: true, rarity: 'Legendary' },
      isLoading: false,
      error: null,
    })

    render(<MagicItemDetail index="holy-avenger" />)

    expect(screen.getByText('Requires attunement')).toBeInTheDocument()
    expect(screen.getByText('Legendary')).toBeInTheDocument()
    expect(screen.getByText('Wondrous Items, legendary (requires attunement)')).toBeInTheDocument()
  })

  it('lists the variants of a generic item', () => {
    mockUseMagicItem.mockReturnValue({
      magicItem: { ...BAG_OF_HOLDING, variants: ['vicious-longsword'] },
      isLoading: false,
      error: null,
    })

    render(<MagicItemDetail index="vicious-weapon" />)

    expect(screen.getByText('Variants')).toBeInTheDocument()
    expect(screen.getByText('vicious longsword')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mockUseMagicItem.mockReturnValue({ magicItem: undefined, isLoading: true, error: null })

    render(<MagicItemDetail index="bag-of-holding" />)

    expect(screen.getByText('Loading magic item...')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseMagicItem.mockReturnValue({
      magicItem: undefined,
      isLoading: false,
      error: new Error('boom'),
    })

    render(<MagicItemDetail index="bag-of-holding" />)

    expect(screen.getByText('Error loading magic item')).toBeInTheDocument()
  })
})

describe('MonsterDetail', () => {
  it('renders a 2024 stat block', () => {
    mockUseMonster.mockReturnValue({ monster: GOBLIN, isLoading: false, error: null })

    render(<MonsterDetail index="goblin-warrior" />)

    expect(screen.getByText('CR 1/4')).toBeInTheDocument()
    // 2024 reclassified goblins as Fey; this is the visible proof the data moved.
    expect(screen.getByText('Fey')).toBeInTheDocument()
    expect(screen.getByText('Small')).toBeInTheDocument()
    expect(screen.getByText('15 (natural armor)')).toBeInTheDocument()
    expect(screen.getByText('10 (3d6)')).toBeInTheDocument()
    expect(screen.getByText('30 ft.')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('Stealth +6')).toBeInTheDocument()
    expect(screen.getByText('Darkvision 60 ft., Passive Perception 9')).toBeInTheDocument()
    expect(screen.getByText('Common, Goblin')).toBeInTheDocument()
    // Ability scores with their modifiers. DEX is the goblin's distinctive one.
    expect(screen.getByText('15 (+2)')).toBeInTheDocument()
    expect(screen.getAllByText('8 (-1)').length).toBeGreaterThan(0)
    // Actions and bonus actions are separate sections on a 2024 stat block.
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByText('Scimitar')).toBeInTheDocument()
    expect(screen.getByText('Bonus Actions')).toBeInTheDocument()
    expect(screen.getByText('Nimble Escape')).toBeInTheDocument()
  })

  it('shows a loading state while fetching', () => {
    mockUseMonster.mockReturnValue({ monster: undefined, isLoading: true, error: null })

    render(<MonsterDetail index="goblin-warrior" />)

    expect(screen.getByText('Loading monster...')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseMonster.mockReturnValue({
      monster: undefined,
      isLoading: false,
      error: new Error('boom'),
    })

    render(<MonsterDetail index="goblin-warrior" />)

    expect(screen.getByText('Error loading monster')).toBeInTheDocument()
  })
})
