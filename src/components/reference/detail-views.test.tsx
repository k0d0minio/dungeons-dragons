import { render, screen } from '@testing-library/react'
import { ClassDetail } from './class-detail'
import { EquipmentDetail } from './equipment-detail'
import { MagicItemDetail, requiresAttunement } from './magic-item-detail'
import { MonsterDetail, abilityModifier, formatChallengeRating } from './monster-detail'
import { RaceDetail } from './race-detail'
import { SpellDetail, formatSpellLevel } from './spell-detail'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useSpell: jest.fn(),
  useClass: jest.fn(),
  useRace: jest.fn(),
  useEquipmentItem: jest.fn(),
  useMonster: jest.fn(),
  useMagicItem: jest.fn(),
}))

const hooks = jest.requireMock('@/lib/dnd-api/swr-hooks')
const mockUseSpell = jest.mocked(hooks.useSpell)
const mockUseClass = jest.mocked(hooks.useClass)
const mockUseRace = jest.mocked(hooks.useRace)
const mockUseEquipmentItem = jest.mocked(hooks.useEquipmentItem)
const mockUseMonster = jest.mocked(hooks.useMonster)
const mockUseMagicItem = jest.mocked(hooks.useMagicItem)

const FIREBALL = {
  index: 'fireball',
  name: 'Fireball',
  level: 3,
  desc: ['A bright streak flashes from your pointing finger.'],
  higher_level: ['The damage increases by 1d6 for each slot above 3rd.'],
  range: '150 feet',
  components: ['V', 'S', 'M'],
  material: 'a tiny ball of bat guano and sulfur',
  ritual: false,
  concentration: false,
  duration: 'Instantaneous',
  casting_time: '1 action',
  attack_type: 'ranged',
  damage: {
    damage_type: { index: 'fire', name: 'Fire', url: '' },
    damage_at_slot_level: { '3': '8d6', '4': '9d6' },
  },
  school: { index: 'evocation', name: 'Evocation', url: '' },
  classes: [{ index: 'wizard', name: 'Wizard', url: '' }],
  subclasses: [{ index: 'lore', name: 'Lore', url: '' }],
}

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

    expect(screen.getByText('Level 3')).toBeInTheDocument()
    expect(screen.getByText('Evocation')).toBeInTheDocument()
    expect(screen.getByText('1 action')).toBeInTheDocument()
    expect(screen.getByText('150 feet')).toBeInTheDocument()
    expect(screen.getByText('Instantaneous')).toBeInTheDocument()
    expect(screen.getByText('V, S, M (a tiny ball of bat guano and sulfur)')).toBeInTheDocument()
    expect(screen.getByText('ranged')).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
    expect(
      screen.getByText('A bright streak flashes from your pointing finger.'),
    ).toBeInTheDocument()
    expect(screen.getByText('At Higher Levels')).toBeInTheDocument()
    expect(screen.getByText('8d6')).toBeInTheDocument()
    expect(screen.getByText('9d6')).toBeInTheDocument()
    expect(screen.getByText('Wizard')).toBeInTheDocument()
    expect(screen.getByText('Lore')).toBeInTheDocument()
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
  })

  it('labels level 0 spells as cantrips', () => {
    expect(formatSpellLevel(0)).toBe('Cantrip')
    expect(formatSpellLevel(5)).toBe('Level 5')
  })
})

describe('ClassDetail', () => {
  const WIZARD = {
    index: 'wizard',
    name: 'Wizard',
    hit_die: 6,
    saving_throws: [{ index: 'int', name: 'INT', url: '' }],
    proficiencies: [{ index: 'daggers', name: 'Daggers', url: '' }],
    proficiency_choices: [
      {
        choose: 2,
        from: {
          options: [
            { item: { index: 'arcana', name: 'Skill: Arcana', url: '' } },
            { item: { index: 'history', name: 'Skill: History', url: '' } },
          ],
        },
      },
    ],
    starting_equipment: [
      { equipment: { index: 'quarterstaff', name: 'Quarterstaff', url: '' }, quantity: 1 },
    ],
    starting_equipment_options: [],
    subclasses: [{ index: 'evocation', name: 'Evocation', url: '' }],
    multi_classing: {
      prerequisites: [{ ability_score: { index: 'int', name: 'INT', url: '' }, minimum_score: 13 }],
    },
    spellcasting: {
      level: 1,
      spellcasting_ability: { index: 'int', name: 'INT', url: '' },
      info: [{ name: 'Cantrips', desc: ['You know three cantrips.'] }],
    },
  }

  it('renders hit die, proficiencies, choices and spellcasting', () => {
    mockUseClass.mockReturnValue({ class: WIZARD, isLoading: false, error: null })

    render(<ClassDetail index="wizard" />)

    expect(screen.getByText('Hit Die d6')).toBeInTheDocument()
    expect(screen.getByText('Daggers')).toBeInTheDocument()
    expect(screen.getByText('Choose 2 of the following')).toBeInTheDocument()
    expect(screen.getByText('Skill: Arcana')).toBeInTheDocument()
    expect(screen.getByText('Quarterstaff')).toBeInTheDocument()
    expect(screen.getByText('INT 13+')).toBeInTheDocument()
    expect(screen.getByText('You know three cantrips.')).toBeInTheDocument()
    expect(screen.getByText('Evocation')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseClass.mockReturnValue({ class: undefined, isLoading: false, error: new Error('boom') })

    render(<ClassDetail index="wizard" />)

    expect(screen.getByText('Error loading class')).toBeInTheDocument()
  })
})

describe('RaceDetail', () => {
  const ELF = {
    index: 'elf',
    name: 'Elf',
    speed: 30,
    size: 'Medium',
    size_description: 'Elves range from under 5 to over 6 feet tall.',
    age: 'Elves reach physical maturity at about the same age as humans.',
    alignment: 'Elves love freedom and variety.',
    ability_bonuses: [{ ability_score: { index: 'dex', name: 'DEX', url: '' }, bonus: 2 }],
    languages: [{ index: 'common', name: 'Common', url: '' }],
    language_desc: 'You can speak, read, and write Common and Elvish.',
    starting_proficiencies: [{ index: 'perception', name: 'Skill: Perception', url: '' }],
    traits: [{ index: 'darkvision', name: 'Darkvision', url: '' }],
    subraces: [{ index: 'high-elf', name: 'High Elf', url: '' }],
  }

  it('renders speed, size, bonuses, languages and traits', () => {
    mockUseRace.mockReturnValue({ race: ELF, isLoading: false, error: null })

    render(<RaceDetail index="elf" />)

    expect(screen.getByText('Speed 30 ft.')).toBeInTheDocument()
    expect(screen.getByText('DEX +2')).toBeInTheDocument()
    expect(screen.getByText('Common')).toBeInTheDocument()
    expect(
      screen.getByText('You can speak, read, and write Common and Elvish.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Skill: Perception')).toBeInTheDocument()
    expect(screen.getByText('Darkvision')).toBeInTheDocument()
    expect(screen.getByText('High Elf')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseRace.mockReturnValue({ race: undefined, isLoading: false, error: new Error('boom') })

    render(<RaceDetail index="elf" />)

    expect(screen.getByText('Error loading race')).toBeInTheDocument()
  })
})

describe('EquipmentDetail', () => {
  const LONGSWORD = {
    index: 'longsword',
    name: 'Longsword',
    equipment_category: { index: 'weapon', name: 'Weapon', url: '' },
    weapon_category: 'Martial',
    weapon_range: 'Melee',
    cost: { quantity: 15, unit: 'gp' },
    damage: {
      damage_dice: '1d8',
      damage_type: { index: 'slashing', name: 'Slashing', url: '' },
    },
    weight: 3,
    properties: [{ index: 'versatile', name: 'Versatile', url: '' }],
    desc: ['A versatile martial weapon.'],
  }

  it('renders cost, weight, damage and properties', () => {
    mockUseEquipmentItem.mockReturnValue({
      equipment: LONGSWORD,
      isLoading: false,
      error: null,
    })

    render(<EquipmentDetail index="longsword" />)

    expect(screen.getByText('15 gp')).toBeInTheDocument()
    expect(screen.getByText('3 lb.')).toBeInTheDocument()
    expect(screen.getByText('1d8 Slashing')).toBeInTheDocument()
    expect(screen.getByText('Versatile')).toBeInTheDocument()
    expect(screen.getByText('A versatile martial weapon.')).toBeInTheDocument()
  })

  it('renders armour stats for armour', () => {
    mockUseEquipmentItem.mockReturnValue({
      equipment: {
        index: 'chain-mail',
        name: 'Chain Mail',
        equipment_category: { index: 'armor', name: 'Armor', url: '' },
        armor_category: 'Heavy',
        armor_class: { base: 16, dex_bonus: false },
        stealth_disadvantage: true,
        cost: { quantity: 75, unit: 'gp' },
        weight: 55,
      },
      isLoading: false,
      error: null,
    })

    render(<EquipmentDetail index="chain-mail" />)

    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.getByText('Stealth Disadvantage')).toBeInTheDocument()
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
  const BAG_OF_HOLDING = {
    index: 'bag-of-holding',
    name: 'Bag of Holding',
    url: '/api/magic-items/bag-of-holding',
    equipment_category: { index: 'wondrous-items', name: 'Wondrous Items', url: '' },
    rarity: { name: 'Uncommon' },
    variants: [],
    variant: false,
    desc: [
      'Wondrous item, uncommon',
      'This bag has an interior space considerably larger than its outside dimensions.',
    ],
  }

  it('renders rarity, category, type line and description', () => {
    mockUseMagicItem.mockReturnValue({ magicItem: BAG_OF_HOLDING, isLoading: false, error: null })

    render(<MagicItemDetail index="bag-of-holding" />)

    expect(screen.getByText('Uncommon')).toBeInTheDocument()
    expect(screen.getByText('Wondrous Items')).toBeInTheDocument()
    expect(screen.getByText('Wondrous item, uncommon')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This bag has an interior space considerably larger than its outside dimensions.',
      ),
    ).toBeInTheDocument()
    // A Bag of Holding needs no attunement, and the view must not claim it does.
    expect(screen.queryByText('Requires attunement')).not.toBeInTheDocument()
  })

  it('surfaces the attunement requirement stated in the type line', () => {
    mockUseMagicItem.mockReturnValue({
      magicItem: {
        ...BAG_OF_HOLDING,
        index: 'holy-avenger',
        name: 'Holy Avenger',
        rarity: { name: 'Legendary' },
        desc: [
          'Weapon (any sword), legendary (requires attunement by a paladin)',
          'You gain a +3 bonus to attack and damage rolls made with this magic weapon.',
        ],
      },
      isLoading: false,
      error: null,
    })

    render(<MagicItemDetail index="holy-avenger" />)

    expect(screen.getByText('Requires attunement')).toBeInTheDocument()
    expect(screen.getByText('Legendary')).toBeInTheDocument()
  })

  it('lists the variants of a generic item', () => {
    mockUseMagicItem.mockReturnValue({
      magicItem: {
        ...BAG_OF_HOLDING,
        index: 'vicious-weapon',
        name: 'Vicious Weapon',
        variants: [{ index: 'vicious-longsword', name: 'Vicious Longsword', url: '' }],
      },
      isLoading: false,
      error: null,
    })

    render(<MagicItemDetail index="vicious-weapon" />)

    expect(screen.getByText('Variants')).toBeInTheDocument()
    expect(screen.getByText('Vicious Longsword')).toBeInTheDocument()
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

  it('parses attunement from the type line only when it is stated', () => {
    expect(requiresAttunement(['Wondrous item, rare (requires attunement)'])).toBe(true)
    expect(
      requiresAttunement(['Weapon (any sword), legendary (requires attunement by a paladin)']),
    ).toBe(true)
    expect(requiresAttunement(['Wondrous item, uncommon'])).toBe(false)
    expect(requiresAttunement([])).toBe(false)
    expect(requiresAttunement(undefined)).toBe(false)
  })
})

describe('MonsterDetail', () => {
  const GOBLIN = {
    index: 'goblin',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    alignment: 'neutral evil',
    armor_class: [{ type: 'armor', value: 15 }],
    hit_points: 7,
    hit_dice: '2d6',
    hit_points_roll: '2d6',
    speed: { walk: '30 ft.' },
    strength: 8,
    dexterity: 14,
    constitution: 10,
    intelligence: 10,
    wisdom: 8,
    charisma: 8,
    proficiencies: [
      { proficiency: { index: 'skill-stealth', name: 'Skill: Stealth', url: '' }, value: 6 },
    ],
    damage_vulnerabilities: [],
    damage_resistances: [],
    damage_immunities: ['poison'],
    condition_immunities: [{ index: 'charmed', name: 'Charmed', url: '' }],
    senses: { darkvision: '60 ft.', passive_perception: 9 },
    languages: 'Common, Goblin',
    challenge_rating: 0.25,
    xp: 50,
    special_abilities: [
      { name: 'Nimble Escape', desc: 'The goblin can Disengage as a bonus action.' },
    ],
    actions: [
      {
        name: 'Scimitar',
        desc: 'Melee Weapon Attack.',
        attack_bonus: 4,
        damage: [
          { damage_dice: '1d6+2', damage_type: { index: 'slashing', name: 'Slashing', url: '' } },
        ],
      },
    ],
    legendary_actions: [{ name: 'Detect', desc: 'The goblin makes a Perception check.' }],
  }

  it('renders the full stat block', () => {
    mockUseMonster.mockReturnValue({ monster: GOBLIN, isLoading: false, error: null })

    render(<MonsterDetail index="goblin" />)

    expect(screen.getByText('CR 1/4')).toBeInTheDocument()
    expect(screen.getByText('15 (armor)')).toBeInTheDocument()
    expect(screen.getByText('7 (2d6)')).toBeInTheDocument()
    expect(screen.getByText('walk 30 ft.')).toBeInTheDocument()
    // STR, WIS and CHA are all 8 on a goblin.
    expect(screen.getAllByText('8 (-1)')).toHaveLength(3)
    expect(screen.getByText('14 (+2)')).toBeInTheDocument()
    expect(screen.getByText('Skill: Stealth +6')).toBeInTheDocument()
    expect(screen.getByText('poison')).toBeInTheDocument()
    expect(screen.getByText('Charmed')).toBeInTheDocument()
    expect(screen.getByText('darkvision 60 ft., passive Perception 9')).toBeInTheDocument()
    expect(screen.getByText('Common, Goblin')).toBeInTheDocument()
    expect(screen.getByText('Nimble Escape')).toBeInTheDocument()
    expect(screen.getByText('Scimitar')).toBeInTheDocument()
    expect(screen.getByText('To hit +4')).toBeInTheDocument()
    expect(screen.getByText('1d6+2 Slashing')).toBeInTheDocument()
    expect(screen.getByText('Detect')).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockUseMonster.mockReturnValue({
      monster: undefined,
      isLoading: false,
      error: new Error('boom'),
    })

    render(<MonsterDetail index="goblin" />)

    expect(screen.getByText('Error loading monster')).toBeInTheDocument()
  })

  it('formats ability modifiers with a sign', () => {
    expect(abilityModifier(8)).toBe('-1')
    expect(abilityModifier(10)).toBe('+0')
    expect(abilityModifier(20)).toBe('+5')
  })

  it('formats fractional challenge ratings as fractions', () => {
    expect(formatChallengeRating(0.125)).toBe('1/8')
    expect(formatChallengeRating(0.25)).toBe('1/4')
    expect(formatChallengeRating(0.5)).toBe('1/2')
    expect(formatChallengeRating(5)).toBe('5')
  })
})
