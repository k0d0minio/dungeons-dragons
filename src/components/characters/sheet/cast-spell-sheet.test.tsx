import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { AttackFields } from '@/lib/characters/attacks'
import type { CombatState } from '@/lib/characters/combat'
import type { SpellSlotState } from '@/lib/db/schema'

import { CastSpellSheet } from './cast-spell-sheet'

jest.mock('@/lib/srd/hooks', () => ({
  useSpell: jest.fn(),
}))

import { useSpell } from '@/lib/srd/hooks'
import { SPELLS } from '@/lib/srd/spells'

const mockUseSpell = useSpell as jest.MockedFunction<typeof useSpell>

// The real SRD 5.2.1 Fireball, so the slot table this sheet reads is the one
// the app ships rather than a hand-written echo of it.
const FIREBALL = (() => {
  const spell = SPELLS.get('fireball')
  if (!spell) throw new Error('no SRD spell "fireball"')
  return spell
})()

// A 5th-level wizard with INT 18: spell attack +7, save DC 15. The
// walkthrough inside the sheet derives its numbers from these columns.
const WIZARD: AttackFields = {
  classIndex: 'wizard',
  level: 5,
  exhaustion: 0,
  strength: 8,
  dexterity: 14,
  constitution: 12,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
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
    experience: null,
    classResources: [],
    preparedSpellIndexes: [],
    concentration: null,
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
    heroicInspiration: false,
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
        character={WIZARD}
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

    expect(screen.getByText('8d6 fire')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Lvl 5/ }))

    expect(screen.getByText('10d6 fire')).toBeInTheDocument()
    expect(screen.getByText('Damage at level 5')).toBeInTheDocument()
    expect(screen.queryByText('8d6 fire')).not.toBeInTheDocument()
  })

  it('displays the damage without rolling it (D8)', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('8d6 fire')).toBeInTheDocument()
    // No total, no result — the dice on the table are the point.
    expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument()
  })

  it('carries the at-higher-levels prose the player would otherwise go looking for', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('Using a higher-level spell slot')).toBeInTheDocument()
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
    mockSpell({ level: 0, higherLevelDamage: [], higherLevel: null })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText(/A cantrip costs no slot/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lvl 3/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spend a slot/ })).not.toBeInTheDocument()
  })

  it('flags concentration, and says in the walkthrough what it costs', () => {
    mockSpell({ concentration: true })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    // The badge at the top and the walkthrough's own line lower down.
    expect(screen.getAllByText('Concentration').length).toBeGreaterThan(1)
    expect(screen.getByText(/starting this one ends any other you have going/)).toBeInTheDocument()
  })
})

// The teaching half of the flow (`learn-to-play/roll-walkthroughs`): the sheet
// that spends the slot is also the one that says what to roll and why.
describe('CastSpellSheet — the walkthrough', () => {
  it('says the caster picks up no die at all on a save spell, and names the DC', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    // Fireball is a Dexterity save: the target rolls, the wizard does not.
    expect(screen.getByText(/No die — not for you/)).toBeInTheDocument()
    expect(screen.getByLabelText('Your difficulty class is 15')).toBeInTheDocument()
    expect(screen.getByText('Their Dexterity saving throw')).toBeInTheDocument()
  })

  it('breaks the DC down into where each part came from', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    // 8 + INT +4 + proficiency +3 = 15, each line saying why it is there.
    expect(screen.getByLabelText(/^Base \+8\./)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Intelligence \+4\./)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Proficiency \+3\./)).toBeInTheDocument()
  })

  it('rolls the d20 against AC for an attack-roll spell instead', () => {
    mockSpell({ attackRoll: true, savingThrow: null })
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.getByText('d20')).toBeInTheDocument()
    expect(screen.getByLabelText('Add +7 in total')).toBeInTheDocument()
    expect(screen.getByText("The target's Armour Class")).toBeInTheDocument()
  })

  it('tells the player which slot the cast will cost', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 }, '5': { max: 1, used: 0 } }} />)

    expect(screen.getByText(/Mark off one level-3 spell slot/)).toBeInTheDocument()
  })

  it('never offers to roll anything (D8)', () => {
    render(<Harness slots={{ '3': { max: 2, used: 0 } }} />)

    expect(screen.queryByRole('button', { name: /roll/i })).not.toBeInTheDocument()
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
