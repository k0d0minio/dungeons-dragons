import { render, screen, within } from '@testing-library/react'

import { MONSTERS } from '@/lib/srd/monsters'

import { MonsterStatBlock, MonsterStatBlockSheet } from './monster-stat-block'

// The tracker's stat block (`dm-run-suite/tracker-stat-blocks`): the three
// numbers a fight asks for every round come first, the actions the DM rolls
// carry their to-hit and damage as chips, and traits sit below the actions —
// the opposite of the Library's book order, which is the point of this view.
jest.mock('@/lib/srd/hooks', () => ({ useMonster: jest.fn() }))

const mockUseMonster = jest.mocked(jest.requireMock('@/lib/srd/hooks').useMonster)

/** Real SRD rows, not hand-written fixtures — this view exists to render them. */
function srd(index: string) {
  const monster = MONSTERS.get(index)
  if (!monster) throw new Error(`no SRD monster ${index}`)
  return monster
}

const GOBLIN = srd('goblin-warrior')
const DRAGON = srd('adult-red-dragon')

function loaded(monster: unknown) {
  mockUseMonster.mockReturnValue({ monster, isLoading: false, error: undefined })
}

describe('MonsterStatBlock', () => {
  /** The cell of the headline row carrying `label` — AC, HP or Speed. */
  function headline(label: string) {
    const cell = screen.getByText(label).parentElement
    if (!cell) throw new Error(`no headline cell for ${label}`)
    return within(cell)
  }

  it('leads with AC, the HP formula and speed', () => {
    loaded(GOBLIN)
    render(<MonsterStatBlock index="goblin-warrior" />)

    expect(headline('AC').getByText('15')).toBeInTheDocument()
    expect(headline('AC').getByText('natural armor')).toBeInTheDocument()

    expect(headline('HP').getByText('10')).toBeInTheDocument()
    // The formula, so a DM who prefers to roll a monster's HP can.
    expect(headline('HP').getByText('3d6')).toBeInTheDocument()

    expect(headline('Speed').getByText('30 ft.')).toBeInTheDocument()
  })

  it('puts the leading movement mode in the headline and the rest under it', () => {
    loaded(DRAGON)
    render(<MonsterStatBlock index="adult-red-dragon" />)

    expect(headline('Speed').getByText('40 ft.')).toBeInTheDocument()
    expect(headline('Speed').getByText(/Climb 40 ft\., Fly 80 ft\./)).toBeInTheDocument()
  })

  it('names the SRD creature, which the combatant label may not', () => {
    loaded(GOBLIN)
    render(<MonsterStatBlock index="goblin-warrior" />)

    expect(screen.getByText(/Goblin Warrior · Small Fey · CR 1\/4/)).toBeInTheDocument()
  })

  it('lifts the to-hit, reach and damage out of each attack', () => {
    loaded(GOBLIN)
    render(<MonsterStatBlock index="goblin-warrior" />)

    // Both the Scimitar and the Shortbow are +4; the reach and the damage
    // type are what tell them apart at a glance.
    expect(screen.getAllByText('+4 to hit')).toHaveLength(2)
    expect(screen.getByText('reach 5 ft.')).toBeInTheDocument()
    expect(screen.getByText('5 (1d6 + 2) Slashing')).toBeInTheDocument()
    expect(screen.getByText('range 80/320 ft.')).toBeInTheDocument()
    expect(screen.getByText('5 (1d6 + 2) Piercing')).toBeInTheDocument()
  })

  it('keeps the SRD sentence whole under the chips', () => {
    loaded(GOBLIN)
    render(<MonsterStatBlock index="goblin-warrior" />)

    expect(
      screen.getByText(/plus 2 \(1d4\) Slashing damage if the attack roll had Advantage/),
    ).toBeInTheDocument()
  })

  it('chips a breath weapon by its save rather than a to-hit', () => {
    loaded(DRAGON)
    render(<MonsterStatBlock index="adult-red-dragon" />)

    expect(screen.getByText('DC 21 Dex')).toBeInTheDocument()
    expect(screen.getByText('59 (17d6) Fire')).toBeInTheDocument()
  })

  it('orders actions above traits — the reverse of the book', () => {
    loaded(DRAGON)
    render(<MonsterStatBlock index="adult-red-dragon" />)

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings.indexOf('Actions')).toBeLessThan(headings.indexOf('Traits'))
    expect(headings).toContain('Legendary actions')
  })

  it('omits a group the creature has nothing in', () => {
    loaded(GOBLIN)
    render(<MonsterStatBlock index="goblin-warrior" />)

    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toContain('Bonus actions')
    expect(headings).not.toContain('Traits')
    expect(headings).not.toContain('Legendary actions')
  })

  it('shows a save beside the ability where the creature is proficient', () => {
    loaded(DRAGON)
    render(<MonsterStatBlock index="adult-red-dragon" />)

    // The dragon is proficient in Dex (+6) and Wis (+7) saves; Strength is
    // not a save it makes, so that cell shows the raw score instead.
    expect(screen.getByText('save +6')).toBeInTheDocument()
    expect(screen.getByText('save +7')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
  })

  it('files the once-a-fight facts below everything rolled each round', () => {
    loaded(GOBLIN)
    render(<MonsterStatBlock index="goblin-warrior" />)

    const senses = screen.getByRole('heading', { level: 3, name: /Defences & senses/ })
    expect(senses).toBeInTheDocument()
    expect(screen.getByText(/Darkvision 60 ft\., Passive Perception 9/)).toBeInTheDocument()
    expect(screen.getByText('Common, Goblin')).toBeInTheDocument()
  })

  it('says so, and keeps the tracker usable, when the fetch fails', () => {
    mockUseMonster.mockReturnValue({ monster: undefined, isLoading: false, error: new Error('no') })
    render(<MonsterStatBlock index="goblin-warrior" />)

    expect(screen.getByText('Could not load this stat block')).toBeInTheDocument()
  })

  it('announces the wait while the block is loading', () => {
    mockUseMonster.mockReturnValue({ monster: undefined, isLoading: true, error: undefined })
    render(<MonsterStatBlock index="goblin-warrior" />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading stat block...')
  })
})

describe('MonsterStatBlockSheet', () => {
  it('renders nothing with no monster selected', () => {
    render(<MonsterStatBlockSheet selection={null} onClose={jest.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockUseMonster).not.toHaveBeenCalled()
  })

  it('titles the sheet with the combatant’s own label, not the SRD name', () => {
    loaded(GOBLIN)
    render(
      <MonsterStatBlockSheet
        selection={{ index: 'goblin-warrior', label: 'Goblin Warrior 2' }}
        onClose={jest.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Goblin Warrior 2')).toBeInTheDocument()
    expect(within(dialog).getByText('Stat block')).toBeInTheDocument()
    expect(mockUseMonster).toHaveBeenCalledWith('goblin-warrior')
  })
})
