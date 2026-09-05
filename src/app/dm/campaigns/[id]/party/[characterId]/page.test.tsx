import { render, screen } from '@testing-library/react'

import type { Character, CharacterItem } from '@/lib/db/schema'

import DmCharacterPage from './page'

// The DM's page for one character (first-table/dm-character-profile): the
// two-arm scope, "played by" from the auth user, the readiness lines against
// a fixture in each state, and the sheet's own numbers.

const DM = 'jamie'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

const PALADIN: Character = {
  portrait: null,
  id: CHARACTER_ID,
  ownerId: 'user_ava',
  name: 'Ava Delacroix',
  classIndex: 'paladin',
  speciesIndex: 'human',
  level: 1,
  strength: 16,
  dexterity: 10,
  constitution: 14,
  intelligence: 8,
  wisdom: 12,
  charisma: 14,
  maxHitPoints: 12,
  currentHitPoints: 9,
  temporaryHitPoints: 0,
  armorClass: 10,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 4,
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 18,
  pp: 0,
  skillProficiencies: ['athletics', 'persuasion'],
  skillExpertise: [],
  knownSpellIndexes: ['bless', 'cure-wounds'],
  preparedSpellIndexes: ['bless', 'cure-wounds'],
  concentration: null,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  updatedAt: new Date('2026-09-01T12:00:00.000Z'),
  backgroundIndex: 'soldier',
  backgroundAbilitySpread: 'two-and-one',
  backgroundAbilities: ['strength', 'constitution'],
  originFeatIndex: 'savage-attacker',
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
  featChoices: null,
}

function item(overrides: Partial<CharacterItem>): CharacterItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    characterId: CHARACTER_ID,
    equipmentIndex: 'longsword',
    customName: null,
    quantity: 1,
    equipped: false,
    attuned: false,
    notes: null,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: new Date('2026-09-01T12:00:00.000Z'),
    ...overrides,
  }
}

const KIT: CharacterItem[] = [
  item({ id: 'chain', equipmentIndex: 'chain-mail', equipped: true }),
  item({ id: 'shield', equipmentIndex: 'shield', equipped: true }),
  item({ id: 'sword', equipmentIndex: 'longsword' }),
  item({ id: 'javelins', equipmentIndex: 'javelin', quantity: 6 }),
]

let roster: unknown = null
let items: CharacterItem[] | null = KIT
let playedBy: string | null = 'Sam'

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: DM })),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => true),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getCampaignRoster: jest.fn(async () => roster),
  gatesForCharacter: jest.fn(async () => ({
    spellPreparation: false,
    conditions: false,
    currency: false,
    classResources: false,
    experiencePoints: false,
    weaponMastery: false,
  })),
}))

jest.mock('@/lib/db/items', () => ({
  listItems: jest.fn(async () => items),
}))

jest.mock('@/lib/db/users', () => ({
  getUserName: jest.fn(async () => playedBy),
}))

jest.mock('@/lib/db/dm-notes', () => ({
  getCharacterDmNote: jest.fn(async () => ''),
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

function rosterWith(characters: Character[]) {
  return {
    campaign: { id: CAMPAIGN_ID, name: 'Tutorial', dmUserId: DM },
    members: [],
    characters,
    armor: {
      [CHARACTER_ID]: [
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
    },
  }
}

const params = Promise.resolve({ id: CAMPAIGN_ID, characterId: CHARACTER_ID })

beforeEach(() => {
  roster = rosterWith([PALADIN])
  items = KIT
  playedBy = 'Sam'
})

describe('/dm/campaigns/[id]/party/[characterId]', () => {
  it('404s for a campaign this DM does not run, before reading anything else', async () => {
    roster = null

    await expect(DmCharacterPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(jest.requireMock('@/lib/db/items').listItems).not.toHaveBeenCalled()
  })

  it('404s for a character that is not on this roster', async () => {
    roster = rosterWith([{ ...PALADIN, id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e' }])

    await expect(DmCharacterPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(jest.requireMock('@/lib/db/dm-notes').getCharacterDmNote).not.toHaveBeenCalled()
  })

  it('says who plays them, off the auth user', async () => {
    render(await DmCharacterPage({ params }))

    expect(screen.getByRole('heading', { name: 'Ava Delacroix' })).toBeInTheDocument()
    expect(screen.getByText(/Played by Sam · Level 1 Human Paladin · Soldier/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open sheet' })).toHaveAttribute(
      'href',
      `/characters/${CHARACTER_ID}?campaign=${CAMPAIGN_ID}`,
    )
    expect(screen.getByRole('link', { name: 'Tutorial' })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}`,
    )
  })

  it('reads the walkthrough’s findings as the readiness lines, each with its fix', async () => {
    render(await DmCharacterPage({ params }))

    // No weapon readied, no slots, no masteries — the state every one of the
    // seven Tutorial characters was in on 2026-09-05.
    expect(
      screen.getByText(/No weapon readied — longsword and javelin in the pack/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ready the longsword and javelin' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No spell slots/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Give them the standard table' })).toBeInTheDocument()
    expect(
      screen.getByText(/No weapon masteries chosen — hidden from the player/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Pick longsword and javelin from the kit' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Skills chosen')).toBeInTheDocument()
    expect(screen.getByText(/3 things to fix/)).toBeInTheDocument()
  })

  it('reads a fixed character as ready, with no buttons left', async () => {
    roster = rosterWith([
      {
        ...PALADIN,
        spellSlots: { '1': { max: 2, used: 0 } },
        masteredWeaponIndexes: ['longsword', 'javelin'],
      },
    ])
    items = KIT.map((entry) => (entry.id === 'sword' ? { ...entry, equipped: true } : entry))

    render(await DmCharacterPage({ params }))

    expect(screen.getByText('Weapon readied: longsword')).toBeInTheDocument()
    expect(screen.getByText('Spell slots set up')).toBeInTheDocument()
    expect(screen.getByText(/Weapon masteries chosen/)).toBeInTheDocument()
    expect(screen.getByText(/Everything the first fight needs/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ready the/ })).not.toBeInTheDocument()
    // The small DM screen prints the sheet's numbers: chain mail + shield = 18.
    expect(screen.getByText('18 (gear + shield)')).toBeInTheDocument()
    expect(screen.getByText('Longsword +5, 1d8+3 slashing')).toBeInTheDocument()
    expect(screen.getByText('Athletics, Persuasion')).toBeInTheDocument()
    expect(screen.getByText('2 prepared · slots 2/2 at 1')).toBeInTheDocument()
  })

  it('offers the Inspiration hand-over, the note and the retire control', async () => {
    playedBy = null

    render(await DmCharacterPage({ params }))

    expect(screen.getByRole('button', { name: 'Grant it to Ava Delacroix' })).toBeInTheDocument()
    expect(screen.getByLabelText('Your note on Ava Delacroix')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retire Ava Delacroix' })).toBeInTheDocument()
    expect(screen.getByText(/Played by an account no longer here/)).toBeInTheDocument()
  })
})
