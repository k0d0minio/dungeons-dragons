import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { CombatState } from '@/lib/characters/combat'
import type { SpellSlotState } from '@/lib/db/schema'

import { CastSpellSheet } from './cast-spell-sheet'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useSpell: jest.fn(),
}))

import { useSpell } from '@/lib/dnd-api/swr-hooks'

const mockUseSpell = useSpell as jest.MockedFunction<typeof useSpell>

const FIREBALL = {
  index: 'fireball',
  name: 'Fireball',
  level: 3,
  ritual: false,
  concentration: false,
  desc: ['A bright streak flashes from your pointing finger.'],
  higher_level: [
    'When you cast this spell using a slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
  ],
  range: '150 feet',
  components: ['V', 'S', 'M'],
  duration: 'Instantaneous',
  casting_time: '1 action',
  damage: {
    damage_type: { index: 'fire', name: 'Fire', url: '/api/damage-types/fire' },
    damage_at_slot_level: { '3': '8d6', '4': '9d6', '5': '10d6' },
  },
  school: { index: 'evocation', name: 'Evocation', url: '/api/magic-schools/evocation' },
  classes: [],
}

function stateWith(spellSlots: SpellSlotState): CombatState {
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
    preparedSpellIndexes: [],
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
  }
}

function mockSpell(
  overrides: Partial<typeof FIREBALL> = {},
  rest: { isLoading?: boolean; error?: Error } = {},
): void {
  mockUseSpell.mockReturnValue({
    spell: rest.isLoading || rest.error ? undefined : { ...FIREBALL, ...overrides },
    isLoading: rest.isLoading ?? false,
    error: rest.error,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useSpell>)
}

/** The card's half of the contract: live state in, transitions applied. */
function Harness({ slots }: { slots: SpellSlotState }) {
  const [state, setState] = useState(() => stateWith(slots))
  const [target, setTarget] = useState<{ index: string; name: string } | null>({
    index: 'fireball',
    name: 'Fireball',
  })

  return (
    <>
      <CastSpellSheet
        target={target}
        state={state}
        apply={(transition) => setState((current) => transition(current))}
        onClose={() => setTarget(null)}
      />
      <output data-testid="slots">{JSON.stringify(state.spellSlots)}</output>
      <output data-testid="open">{target ? 'open' : 'closed'}</output>
    </>
  )
}

beforeEach(() => {
  mockSpell()
})

describe('CastSpellSheet — picking a level', () => {
  it('offers the spell’s own level and the higher ones with slots left', () => {
    render(
      <Harness
        slots={{
          '2': { max: 3, used: 0 },
          '3': { max: 2, used: 0 },
          '4': { max: 1, used: 0 },
        }}
      />,
    )

    // Level 2 is below Fireball, so it is never on offer.
    expect(screen.queryByRole('button', { name: /Lvl 2/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lvl 3/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lvl 4/ })).toBeInTheDocument()
  })

  it('leaves out a level whose slots are all spent', () => {
    render(<Harness slots={{ '3': { max: 2, used: 2 }, '4': { max: 1, used: 0 } }} />)

    expect(screen.queryByRole('button', { name: /Lvl 3/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lvl 4/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('defaults to the spell’s own level and shows what is left in each pool', () => {
    render(<Harness slots={{ '3': { max: 2, used: 1 }, '4': { max: 1, used: 0 } }} />)

    expect(screen.getByRole('button', { name: /Lvl 3/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Lvl 3 1 left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lvl 4 1 left' })).toBeInTheDocument()
  })
})

describe('CastSpellSheet — upcast scaling', () => {
  it('shows the damage for the chosen level, and re-reads it on a change', async () => {
    const user = userEvent.setup()
    render(<Harness slots={{ '3': { max: 2, used: 0 }, '5': { max: 1, used: 0 } }} />)

    expect(screen.getByText('8d6')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Lvl 5/ }))

    expect(screen.getByText('10d6')).toBeInTheDocument()
    expect(screen.getByText('Upcast to level 5')).toBeInTheDocument()
    expect(screen.queryByText('8d6')).not.toBeInTheDocument()
  })

  it('displays the damage without rolling it (D8)', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('8d6')).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
    // No total, no result — the dice on the table are the point.
    expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument()
  })

  it('carries the at-higher-levels prose the player would otherwise go looking for', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('At higher levels')).toBeInTheDocument()
    expect(screen.getByText(/damage increases by 1d6/)).toBeInTheDocument()
  })
})

describe('CastSpellSheet — spending the slot', () => {
  it('spends the chosen level and closes, in one flow', async () => {
    const user = userEvent.setup()
    render(<Harness slots={{ '3': { max: 2, used: 0 }, '4': { max: 1, used: 0 } }} />)

    await user.click(screen.getByRole('button', { name: /Lvl 4/ }))
    await user.click(screen.getByRole('button', { name: 'Cast at level 4 — spend a slot' }))

    expect(screen.getByTestId('slots')).toHaveTextContent(
      '{"3":{"max":2,"used":0},"4":{"max":1,"used":1}}',
    )
    expect(screen.getByTestId('open')).toHaveTextContent('closed')
  })

  it('refuses to be a dead end when every slot is gone', () => {
    render(<Harness slots={{ '3': { max: 2, used: 2 } }} />)

    expect(screen.getByText(/No slots left at level 3 or higher/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spend a slot/ })).not.toBeInTheDocument()
  })
})

describe('CastSpellSheet — rituals, cantrips and concentration', () => {
  it('offers a ritual cast that spends nothing', async () => {
    const user = userEvent.setup()
    mockSpell({ ritual: true })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    await user.click(screen.getByRole('button', { name: 'Cast as ritual — no slot' }))

    expect(screen.getByTestId('slots')).toHaveTextContent('{"3":{"max":2,"used":0}}')
    expect(screen.getByTestId('open')).toHaveTextContent('closed')
  })

  it('still offers the ritual when there is no slot to spend', () => {
    mockSpell({ ritual: true })
    render(<Harness slots={{ '3': { max: 2, used: 2 } }} />)

    expect(screen.getByRole('button', { name: 'Cast as ritual — no slot' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spend a slot/ })).not.toBeInTheDocument()
  })

  it('says a cantrip costs nothing rather than offering a slot', () => {
    mockSpell({ level: 0, damage: undefined, higher_level: undefined })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText(/A cantrip costs no slot/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lvl 3/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spend a slot/ })).not.toBeInTheDocument()
  })

  it('flags concentration without pretending to track it (DND-049 is not landed)', () => {
    mockSpell({ concentration: true })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('Concentration')).toBeInTheDocument()
    expect(screen.getByText(/ends any other concentration spell/)).toBeInTheDocument()
  })
})

describe('CastSpellSheet — when the reference API is having a day', () => {
  it('points at the slots card rather than failing silently', () => {
    mockSpell({}, { error: new Error('offline') })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText(/Spend the slot on the spell slots card instead/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spend a slot/ })).not.toBeInTheDocument()
  })

  it('says it is loading rather than showing an empty picker', () => {
    mockSpell({}, { isLoading: true })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('Loading the spell…')).toBeInTheDocument()
  })
})
