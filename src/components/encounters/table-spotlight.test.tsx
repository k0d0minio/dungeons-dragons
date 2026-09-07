import { render, screen } from '@testing-library/react'

import type { SpotlightView } from '@/lib/db/table'
import type { SrdMonster, SrdSpell } from '@/lib/srd/types'

import { TableSpotlight } from './table-spotlight'

// What the DM cast, on the stage (`dm-run-suite/table-screen-cast`). The prep
// and character kinds are covered through the screen itself; what this file
// pins is the third family — the SRD kinds, which the *browser* fetches from
// the public reference endpoints rather than through the table token. That is
// what keeps a stat block on the wall the book's page and not a leak of the
// fight, so the fetch not going through the token is the property under test.

const monsterState: { monster?: SrdMonster; error?: unknown } = {}
const spellState: { spell?: SrdSpell; error?: unknown } = {}
const asked: string[] = []

jest.mock('@/lib/srd/hooks', () => ({
  useMonster: (index: string | null) => {
    if (index) asked.push(`monsters/${index}`)
    return { ...monsterState, isLoading: false }
  },
  useSpell: (index: string | null) => {
    if (index) asked.push(`spells/${index}`)
    return { ...spellState, isLoading: false }
  },
}))

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'
const AT = '2026-09-07T19:00:00.000Z'

const OWLBEAR = {
  index: 'owlbear',
  name: 'Owlbear',
  size: 'Large',
  type: 'Monstrosity',
  alignment: 'Unaligned',
  armorClass: 13,
  armorDetail: 'natural armor',
  hitPoints: 59,
  hitDice: '7d10 + 21',
  speed: { walk: 40, climb: 30 },
  abilityScores: {
    strength: 20,
    dexterity: 12,
    constitution: 17,
    intelligence: 3,
    wisdom: 12,
    charisma: 7,
  },
  modifiers: {
    strength: 5,
    dexterity: 1,
    constitution: 3,
    intelligence: -4,
    wisdom: 1,
    charisma: -2,
  },
  initiativeBonus: 1,
  savingThrows: {},
  skillBonuses: { perception: 5 },
  passivePerception: 15,
  senses: { darkvision: 60 },
  languages: null,
  challengeRating: 3,
  challengeRatingText: '3',
  experiencePoints: 700,
  proficiencyBonus: 2,
  damageVulnerabilities: null,
  damageResistances: null,
  damageImmunities: null,
  conditionImmunities: null,
  traits: [],
  actions: [{ name: 'Multiattack', description: 'The owlbear makes two Rend attacks.' }],
  bonusActions: [],
  reactions: [],
  legendaryActions: [],
} as unknown as SrdMonster

const FIREBALL = {
  index: 'fireball',
  name: 'Fireball',
  level: 3,
  school: 'Evocation',
  castingTime: 'Action',
  range: '150 feet',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  components: ['V', 'S', 'M'],
  material: 'a ball of bat guano and sulfur',
  description: 'A bright streak flashes from you.',
} as unknown as SrdSpell

function renderSpotlight(spotlight: SpotlightView) {
  return render(<TableSpotlight spotlight={spotlight} token={TOKEN} />)
}

beforeEach(() => {
  asked.length = 0
  delete monsterState.monster
  delete monsterState.error
  delete spellState.spell
  delete spellState.error
})

describe('TableSpotlight', () => {
  it('reads a monster off the public reference data, never off the token', () => {
    monsterState.monster = OWLBEAR

    renderSpotlight({ kind: 'monster', at: AT, index: 'owlbear' })

    expect(screen.getByRole('heading', { name: 'Owlbear' })).toBeInTheDocument()
    expect(screen.getByText(/Large Monstrosity, Unaligned · CR 3/)).toBeInTheDocument()
    expect(screen.getByText(/two Rend attacks/)).toBeInTheDocument()

    // The book's page — asked for by index, from the collection the Library
    // reads. Nothing about *this* fight came anywhere near it.
    expect(asked).toContain('monsters/owlbear')
    expect(asked).not.toContain(`spells/owlbear`)
  })

  it('says so plainly when the reference data cannot be reached', () => {
    monsterState.error = new Error('offline')

    renderSpotlight({ kind: 'monster', at: AT, index: 'owlbear' })

    expect(screen.getByText('Could not reach the monster manual.')).toBeInTheDocument()
  })

  it('waits without a blank screen', () => {
    renderSpotlight({ kind: 'spell', at: AT, index: 'fireball' })

    expect(screen.getByText('Finding it…')).toBeInTheDocument()
  })

  it('prints a spell with the four numbers a table asks for', () => {
    spellState.spell = FIREBALL

    renderSpotlight({ kind: 'spell', at: AT, index: 'fireball' })

    expect(screen.getByRole('heading', { name: 'Fireball' })).toBeInTheDocument()
    expect(screen.getByText('Level 3 Evocation')).toBeInTheDocument()
    expect(screen.getByText('150 feet')).toBeInTheDocument()
    expect(screen.getByText('A bright streak flashes from you.')).toBeInTheDocument()
  })

  it('answers a condition out of the bundle, with nothing to wait for', () => {
    renderSpotlight({ kind: 'condition', at: AT, index: 'prone' })

    expect(screen.getByRole('heading', { name: 'Prone' })).toBeInTheDocument()
    // Conditions ship in the bundle — they are fifteen rows and already there
    // for the sheet — so no request is made at all.
    expect(asked).toHaveLength(0)
  })

  it('says so for an index the book does not define', () => {
    renderSpotlight({ kind: 'condition', at: AT, index: 'bewildered' })

    expect(screen.getByText('That is not a condition this book knows.')).toBeInTheDocument()
  })

  it('shows an NPC’s public layer and a face, and asks for the face through the token', () => {
    renderSpotlight({
      kind: 'npc',
      at: AT,
      name: 'Harbourmaster Vane',
      summary: 'Runs the docks, and is bought',
      description: 'A wet coat and a wetter smile.',
      imageUploadedAt: '2026-09-06T10:00:00.000Z',
    })

    expect(screen.getByRole('heading', { name: 'Harbourmaster Vane' })).toBeInTheDocument()
    expect(screen.getByText('Runs the docks, and is bought')).toBeInTheDocument()
    expect(screen.getByAltText('Harbourmaster Vane')).toHaveAttribute(
      'src',
      `/api/table/${TOKEN}/image?v=${encodeURIComponent('2026-09-06T10:00:00.000Z')}`,
    )
  })

  it('renders no picture element at all when there is no picture', () => {
    renderSpotlight({
      kind: 'location',
      at: AT,
      name: 'Kelp Harbour',
      summary: null,
      description: null,
    })

    expect(screen.getByRole('heading', { name: 'Kelp Harbour' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
