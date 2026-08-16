import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CombatState } from '@/lib/characters/combat'

import { ConcentrationCard } from './concentration-card'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  ...jest.requireActual('@/lib/dnd-api/swr-hooks'),
  useClassSpells: jest.fn(),
}))

import { useClassSpells } from '@/lib/dnd-api/swr-hooks'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>

const CLERIC_SPELLS = [
  { index: 'bless', name: 'Bless', url: '/api/spells/bless', level: 1 },
  { index: 'guidance', name: 'Guidance', url: '/api/spells/guidance', level: 0 },
  { index: 'silence', name: 'Silence', url: '/api/spells/silence', level: 2 },
  { index: 'spiritual-weapon', name: 'Spiritual Weapon', url: '/api/spells/sw', level: 2 },
]

function stateWith(overrides: Partial<CombatState> = {}): CombatState {
  return {
    currentHitPoints: 20,
    temporaryHitPoints: 0,
    spellSlots: {},
    conditions: [],
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    exhaustion: 0,
    hitDiceUsed: 0,
    experience: null,
    classResources: [],
    preparedSpellIndexes: [],
    concentration: null,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    ...overrides,
  }
}

function Harness({
  classIndex = 'cleric',
  known = [],
  initial = stateWith(),
  onSelect = jest.fn(),
}: {
  classIndex?: string
  known?: string[]
  initial?: CombatState
  onSelect?: (spell: { index: string; name: string }) => void
}) {
  const [state, setState] = useState(initial)

  return (
    <>
      <ConcentrationCard
        classIndex={classIndex}
        knownSpellIndexes={known}
        state={state}
        apply={(transition) => setState((current) => transition(current))}
        onSelect={onSelect}
      />
      <output data-testid="stored">{JSON.stringify(state.concentration)}</output>
    </>
  )
}

beforeEach(() => {
  mockUseClassSpells.mockReturnValue({
    spells: CLERIC_SPELLS,
    count: CLERIC_SPELLS.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClassSpells>)
})

describe('ConcentrationCard (DND-049)', () => {
  it('says so when nothing is running', () => {
    render(<Harness />)

    expect(screen.getByText('Not concentrating on anything.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set' })).toBeInTheDocument()
  })

  it('starts concentration from the spells the character prepared', async () => {
    const user = userEvent.setup()
    render(<Harness initial={stateWith({ preparedSpellIndexes: ['bless', 'silence'] })} />)

    await user.click(screen.getByRole('button', { name: 'Set' }))
    await user.click(screen.getByRole('button', { name: 'Silence' }))

    expect(screen.getByTestId('stored')).toHaveTextContent(
      JSON.stringify({ index: 'silence', name: 'Silence' }),
    )
    // The picker closes behind the choice — one decision, one card again.
    expect(screen.queryByRole('button', { name: 'Bless' })).not.toBeInTheDocument()
  })

  it('offers a known-caster their known spells rather than a prepared list', async () => {
    const user = userEvent.setup()
    render(<Harness classIndex="sorcerer" known={['bless', 'silence']} />)

    await user.click(screen.getByRole('button', { name: 'Set' }))

    expect(screen.getByRole('button', { name: 'Bless' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Silence' })).toBeInTheDocument()
  })

  it('takes free text for what no class list has — an item, a readied spell', async () => {
    const user = userEvent.setup()
    render(<Harness initial={stateWith({ preparedSpellIndexes: ['bless'] })} />)

    await user.click(screen.getByRole('button', { name: 'Set' }))
    await user.type(
      screen.getByLabelText('Find a spell, or type what you are concentrating on'),
      'Amulet of the Devout',
    )
    await user.click(screen.getByRole('button', { name: 'Concentrate on “Amulet of the Devout”' }))

    expect(screen.getByTestId('stored')).toHaveTextContent(
      JSON.stringify({ index: null, name: 'Amulet of the Devout' }),
    )
  })

  it('filters the list as it is typed, and does not offer a duplicate free-text row', async () => {
    const user = userEvent.setup()
    render(<Harness initial={stateWith({ preparedSpellIndexes: ['bless', 'silence'] })} />)

    await user.click(screen.getByRole('button', { name: 'Set' }))
    await user.type(
      screen.getByLabelText('Find a spell, or type what you are concentrating on'),
      'Bless',
    )

    expect(screen.getByRole('button', { name: 'Bless' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Silence' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Concentrate on/ })).not.toBeInTheDocument()
  })

  it('drops it in one tap', async () => {
    const user = userEvent.setup()
    render(<Harness initial={stateWith({ concentration: { index: 'bless', name: 'Bless' } })} />)

    await user.click(screen.getByRole('button', { name: /Bless[\s\S]*Tap to drop it/ }))

    expect(screen.getByTestId('stored')).toHaveTextContent('null')
    expect(screen.getByText('Not concentrating on anything.')).toBeInTheDocument()
  })

  it('taps through to the spell, but only when the pick came from the list', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()

    const { unmount } = render(
      <Harness
        initial={stateWith({ concentration: { index: 'bless', name: 'Bless' } })}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Bless details' }))
    expect(onSelect).toHaveBeenCalledWith({ index: 'bless', name: 'Bless' })

    unmount()

    // Free text has no index, so there is nothing to look up.
    render(<Harness initial={stateWith({ concentration: { index: null, name: "DM's amulet" } })} />)
    expect(screen.queryByRole('button', { name: /details/ })).not.toBeInTheDocument()
  })

  it('tells a character with no spells to type one', async () => {
    const user = userEvent.setup()
    render(<Harness classIndex="fighter" />)

    await user.click(screen.getByRole('button', { name: 'Set' }))

    expect(
      screen.getByText('No spells on this character yet — type what you are concentrating on.'),
    ).toBeInTheDocument()
  })
})
