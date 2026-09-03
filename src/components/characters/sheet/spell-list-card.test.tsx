import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { AttackFields } from '@/lib/characters/attacks'
import type { CombatState } from '@/lib/characters/combat'

import { SpellListCard } from './spell-list-card'

jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useClassSpells: jest.fn(),
  useSpell: jest.fn(),
}))

import { useClassSpells, useSpell, type SpellRow } from '@/lib/srd/hooks'
import { SPELLS } from '@/lib/srd/spells'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>
const mockUseSpell = useSpell as jest.MockedFunction<typeof useSpell>

/** A row as `/api/srd/spells` sends it — every column a list view sorts by. */
function row(index: string, name: string, level: number): SpellRow {
  return { index, name, level, school: 'evocation', concentration: false, ritual: false }
}

const CLERIC_SPELLS = [
  row('bless', 'Bless', 1),
  row('guidance', 'Guidance', 0),
  row('cure-wounds', 'Cure Wounds', 1),
]

/** Enough rows to earn the filter box — the level-9 cleric problem, in miniature. */
const LONG_LIST = [
  ...CLERIC_SPELLS,
  row('guiding-bolt', 'Guiding Bolt', 1),
  row('aid', 'Aid', 2),
  row('silence', 'Silence', 2),
  row('revivify', 'Revivify', 3),
  row('sanctuary', 'Sanctuary', 1),
  row('shield-of-faith', 'Shield of Faith', 1),
]

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
    experience: null,
    classResources: [],
    preparedSpellIndexes,
    concentration: null,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    heroicInspiration: false,
  }
}

/** The columns the cast sheet's walkthrough reads: WIS +3 on a level-4 cleric. */
function fields(classIndex: string, level: number): AttackFields {
  return {
    classIndex,
    level,
    exhaustion: 0,
    strength: 12,
    dexterity: 12,
    constitution: 14,
    intelligence: 10,
    wisdom: 16,
    charisma: 10,
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
        character={fields(classIndex, level)}
        classIndex={classIndex}
        level={level}
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
  // The real SRD 5.2.1 Bless — the cast sheet this card opens reads the whole
  // spell, so a partial fixture would only prove the mock's shape.
  mockUseSpell.mockReturnValue({
    spell: SPELLS.get('bless'),
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
  it('gives a 2024 sorcerer the class list and its toggles, like any preparer', () => {
    // "Spells known" left the game with the 2024 rules: a sorcerer prepares
    // from their class list exactly as a cleric does.
    render(<Harness classIndex="sorcerer" prepared={['bless']} />)

    expect(screen.getByRole('checkbox', { name: 'Prepare Bless' })).toBeChecked()
    // A level 4 sorcerer prepares seven, per the SRD 5.2.1 Prepared Spells column.
    expect(screen.getByText('1 of 7 prepared')).toBeInTheDocument()
  })

  it('keeps a non-caster’s card exactly as it was: names, groups, no toggles', () => {
    render(<Harness classIndex="fighter" known={['bless']} />)

    expect(screen.getByRole('button', { name: 'Bless' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/prepared/)).not.toBeInTheDocument()
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

  it('offers Cast on every spell it can be cast on, cantrips included', () => {
    render(<Harness classIndex="cleric" slots={SLOTS} />)

    expect(screen.getByRole('button', { name: 'Cast Bless' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cast Cure Wounds' })).toBeInTheDocument()
    // Guidance is a cantrip: no slot to spend, but the flow is where the
    // walkthrough lives now (`learn-to-play/roll-walkthroughs`), so it opens.
    expect(screen.getByRole('button', { name: 'Cast Guidance' })).toBeInTheDocument()
  })

  it('offers no levelled cast when the character has no slots at all', () => {
    render(<Harness classIndex="cleric" />)

    expect(screen.queryByRole('button', { name: 'Cast Bless' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cast Cure Wounds' })).not.toBeInTheDocument()
    // A cantrip needs no slots to be castable, so it keeps its button.
    expect(screen.getByRole('button', { name: 'Cast Guidance' })).toBeInTheDocument()
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

  it('offers Cast to a warlock too — pact slots included', () => {
    render(
      <Harness classIndex="warlock" prepared={['bless']} slots={{ '5': { max: 2, used: 0 } }} />,
    )

    expect(screen.getByRole('button', { name: 'Cast Bless' })).toBeInTheDocument()
  })

  it('offers Cast from a non-caster’s stored list when they have slots at all', () => {
    render(<Harness classIndex="fighter" known={['bless']} slots={{ '1': { max: 1, used: 0 } }} />)

    expect(screen.getByRole('button', { name: 'Cast Bless' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
