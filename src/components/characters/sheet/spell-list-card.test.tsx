import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CombatState } from '@/lib/characters/combat'
import type { AbilityScores } from '@/lib/characters/rules'

import { SpellListCard } from './spell-list-card'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useClassSpells: jest.fn(),
}))

import { useClassSpells } from '@/lib/dnd-api/swr-hooks'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>

const CLERIC_SPELLS = [
  { index: 'bless', name: 'Bless', url: '/api/spells/bless', level: 1 },
  { index: 'guidance', name: 'Guidance', url: '/api/spells/guidance', level: 0 },
  { index: 'cure-wounds', name: 'Cure Wounds', url: '/api/spells/cure-wounds', level: 1 },
]

const SCORES: AbilityScores = {
  strength: 12,
  dexterity: 10,
  constitution: 14,
  intelligence: 10,
  wisdom: 16,
  charisma: 12,
}

function stateWith(preparedSpellIndexes: string[]): CombatState {
  return {
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    spellSlots: {},
    conditions: [],
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    exhaustion: 0,
    hitDiceUsed: 0,
    classResources: [],
    preparedSpellIndexes,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
  }
}

function Harness({
  classIndex,
  level = 4,
  known = [],
  prepared = [],
  onSelect = jest.fn(),
}: {
  classIndex: string
  level?: number
  known?: string[]
  prepared?: string[]
  onSelect?: (spell: { index: string; name: string }) => void
}) {
  const [state, setState] = useState(() => stateWith(prepared))

  return (
    <>
      <SpellListCard
        classIndex={classIndex}
        level={level}
        scores={SCORES}
        knownSpellIndexes={known}
        state={state}
        apply={(transition) => setState((current) => transition(current))}
        editHref="/characters/c1/edit"
        onSelect={onSelect}
      />
      <output data-testid="prepared">{state.preparedSpellIndexes.join(',')}</output>
    </>
  )
}

function mockSpells(overrides: Partial<ReturnType<typeof useClassSpells>> = {}): void {
  mockUseClassSpells.mockReturnValue({
    spells: CLERIC_SPELLS,
    count: CLERIC_SPELLS.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useClassSpells>)
}

beforeEach(() => {
  mockSpells()
})

describe('SpellListCard for a class-list preparer', () => {
  it('offers the whole class list grouped by level, prepared count in the header', () => {
    render(<Harness classIndex="cleric" prepared={['bless']} />)

    // WIS +3 + level 4 = 7 preparable.
    expect(screen.getByText('1 of 7 prepared')).toBeInTheDocument()

    const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)
    expect(headings).toEqual(['Cantrips', 'Level 1'])

    expect(screen.getByRole('checkbox', { name: 'Prepare Bless' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Prepare Cure Wounds' })).not.toBeChecked()
  })

  it('toggles preparation through apply, one tap each way', async () => {
    const user = userEvent.setup()
    render(<Harness classIndex="cleric" />)

    await user.click(screen.getByRole('checkbox', { name: 'Prepare Guidance' }))
    expect(screen.getByTestId('prepared')).toHaveTextContent('guidance')

    await user.click(screen.getByRole('checkbox', { name: 'Prepare Guidance' }))
    expect(screen.getByTestId('prepared')).toBeEmptyDOMElement()
  })

  it('keeps the detail tap on the spell name', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<Harness classIndex="cleric" onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Bless' }))

    expect(onSelect).toHaveBeenCalledWith({ index: 'bless', name: 'Bless' })
  })

  it('still shows what is prepared when the class list will not load', () => {
    mockSpells({ spells: [], count: 0, error: new Error('offline') })

    render(<Harness classIndex="cleric" prepared={['cure-wounds']} />)

    // The stored index renders from its slug; the toggle still works.
    expect(screen.getByRole('checkbox', { name: 'Prepare Cure-Wounds' })).toBeChecked()
  })

  it('explains an empty card while loading rather than pointing at the edit form', () => {
    mockSpells({ spells: [], count: 0, isLoading: true })

    render(<Harness classIndex="cleric" />)

    expect(screen.getByText('Loading the class spell list…')).toBeInTheDocument()
    expect(screen.queryByText(/Edit the character/)).not.toBeInTheDocument()
  })
})

describe('SpellListCard for a wizard', () => {
  it('lists the spellbook, not the whole class list, with prepared toggles', () => {
    render(<Harness classIndex="wizard" known={['bless', 'guidance']} />)

    expect(screen.getByText(/Your spellbook/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Prepare Bless' })).toBeInTheDocument()
    // Cure Wounds is on the class list but not in the book.
    expect(screen.queryByRole('checkbox', { name: 'Prepare Cure Wounds' })).not.toBeInTheDocument()
  })

  it('points an empty spellbook at the edit form', () => {
    render(<Harness classIndex="wizard" known={[]} />)

    expect(screen.getByRole('link', { name: 'Edit the character' })).toHaveAttribute(
      'href',
      '/characters/c1/edit',
    )
  })
})

describe('SpellListCard for everyone else', () => {
  it('keeps the known-caster card exactly as it was: names, groups, no toggles', () => {
    render(<Harness classIndex="sorcerer" known={['bless']} />)

    expect(screen.getByRole('button', { name: 'Bless' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/prepared/)).not.toBeInTheDocument()
  })

  it('shows a bare prepared count when the limit is unknowable', () => {
    // A 1st-level paladin has no spellcasting yet, so no limit to hold to.
    render(<Harness classIndex="paladin" level={1} prepared={['bless']} />)

    expect(screen.getByText('1 prepared')).toBeInTheDocument()
  })
})
