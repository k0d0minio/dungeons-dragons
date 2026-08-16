import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CombatState } from '@/lib/characters/combat'
import type { AbilityScores } from '@/lib/characters/rules'

import { SpellListCard } from './spell-list-card'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  ...jest.requireActual('@/lib/dnd-api/swr-hooks'),
  useClassSpells: jest.fn(),
  useSpell: jest.fn(),
}))

import { useClassSpells, useSpell } from '@/lib/dnd-api/swr-hooks'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>
const mockUseSpell = useSpell as jest.MockedFunction<typeof useSpell>

const CLERIC_SPELLS = [
  { index: 'bless', name: 'Bless', url: '/api/spells/bless', level: 1 },
  { index: 'guidance', name: 'Guidance', url: '/api/spells/guidance', level: 0 },
  { index: 'cure-wounds', name: 'Cure Wounds', url: '/api/spells/cure-wounds', level: 1 },
]

/** Enough rows to earn the filter box — the level-9 cleric problem, in miniature. */
const LONG_LIST = [
  ...CLERIC_SPELLS,
  { index: 'guiding-bolt', name: 'Guiding Bolt', url: '/api/spells/guiding-bolt', level: 1 },
  { index: 'aid', name: 'Aid', url: '/api/spells/aid', level: 2 },
  { index: 'silence', name: 'Silence', url: '/api/spells/silence', level: 2 },
  { index: 'revivify', name: 'Revivify', url: '/api/spells/revivify', level: 3 },
  { index: 'sanctuary', name: 'Sanctuary', url: '/api/spells/sanctuary', level: 1 },
  {
    index: 'shield-of-faith',
    name: 'Shield of Faith',
    url: '/api/spells/shield-of-faith',
    level: 1,
  },
]

const SCORES: AbilityScores = {
  strength: 12,
  dexterity: 10,
  constitution: 14,
  intelligence: 10,
  wisdom: 16,
  charisma: 12,
}

function stateWith(
  preparedSpellIndexes: string[],
  spellSlots: CombatState['spellSlots'] = {},
): CombatState {
  return {
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    spellSlots,
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
  slots = {},
  onSelect = jest.fn(),
}: {
  classIndex: string
  level?: number
  known?: string[]
  prepared?: string[]
  slots?: CombatState['spellSlots']
  onSelect?: (spell: { index: string; name: string }) => void
}) {
  const [state, setState] = useState(() => stateWith(prepared, slots))

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
      <output data-testid="slots">{JSON.stringify(state.spellSlots)}</output>
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
  mockUseSpell.mockReturnValue({
    spell: {
      index: 'bless',
      name: 'Bless',
      level: 1,
      ritual: false,
      concentration: true,
      desc: [],
      range: '30 feet',
      components: ['V', 'S', 'M'],
      duration: '1 minute',
      casting_time: '1 action',
      school: { index: 'enchantment', name: 'Enchantment', url: '/api/magic-schools/enchantment' },
      classes: [],
    },
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useSpell>)
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

describe('SpellListCard filtering (DND-050)', () => {
  it('filters a long list by name substring without leaving the sheet', async () => {
    const user = userEvent.setup()
    mockSpells({ spells: LONG_LIST, count: LONG_LIST.length })
    render(<Harness classIndex="cleric" />)

    expect(screen.getByRole('button', { name: 'Bless' })).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Filter spells' }), 'guid')

    // Case-insensitive substring, the DND-021 behaviour exactly.
    expect(screen.getByRole('button', { name: 'Guiding Bolt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guidance' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bless' })).not.toBeInTheDocument()
  })

  it('drops the level headings a filter has emptied, and says when nothing matches', async () => {
    const user = userEvent.setup()
    mockSpells({ spells: LONG_LIST, count: LONG_LIST.length })
    render(<Harness classIndex="cleric" />)

    await user.type(screen.getByRole('searchbox', { name: 'Filter spells' }), 'revivify')

    expect(screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)).toEqual([
      'Level 3',
    ])

    await user.clear(screen.getByRole('searchbox', { name: 'Filter spells' }))
    await user.type(screen.getByRole('searchbox', { name: 'Filter spells' }), 'zzz')

    expect(screen.getByText('No spells match “zzz”.')).toBeInTheDocument()
  })

  it('keeps the prepared count honest while a filter is on', async () => {
    const user = userEvent.setup()
    mockSpells({ spells: LONG_LIST, count: LONG_LIST.length })
    render(<Harness classIndex="cleric" prepared={['bless', 'aid']} />)

    await user.type(screen.getByRole('searchbox', { name: 'Filter spells' }), 'aid')

    // The header counts what is prepared, not what is on screen.
    expect(screen.getByText('2 of 7 prepared')).toBeInTheDocument()
  })

  it('leaves a short list unfurnished — no box over five spells', () => {
    render(<Harness classIndex="sorcerer" known={['bless', 'guidance']} />)

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})

describe('SpellListCard cast action (DND-050)', () => {
  const SLOTS = { '1': { max: 4, used: 0 } }

  it('offers Cast on a leveled spell and not on a cantrip', () => {
    render(<Harness classIndex="cleric" slots={SLOTS} />)

    expect(screen.getByRole('button', { name: 'Cast Bless' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cast Cure Wounds' })).toBeInTheDocument()
    // Guidance is a cantrip — free, so no flow.
    expect(screen.queryByRole('button', { name: 'Cast Guidance' })).not.toBeInTheDocument()
  })

  it('says nothing about casting when the character has no slots at all', () => {
    render(<Harness classIndex="cleric" />)

    expect(screen.queryByRole('button', { name: /^Cast / })).not.toBeInTheDocument()
  })

  it('spends the slot through apply, from the spell row', async () => {
    const user = userEvent.setup()
    render(<Harness classIndex="cleric" slots={SLOTS} />)

    await user.click(screen.getByRole('button', { name: 'Cast Bless' }))
    await user.click(screen.getByRole('button', { name: 'Cast at level 1 — spend a slot' }))

    expect(screen.getByTestId('slots')).toHaveTextContent('{"1":{"max":4,"used":1}}')
  })

  it('leaves the name tap on the detail view, not on the cast flow', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(<Harness classIndex="cleric" slots={SLOTS} onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Bless' }))

    expect(onSelect).toHaveBeenCalledWith({ index: 'bless', name: 'Bless' })
    expect(screen.queryByRole('button', { name: /spend a slot/ })).not.toBeInTheDocument()
  })

  it('offers Cast to a known-caster too — pact slots included', () => {
    render(<Harness classIndex="warlock" known={['bless']} slots={{ '5': { max: 2, used: 0 } }} />)

    expect(screen.getByRole('button', { name: 'Cast Bless' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
