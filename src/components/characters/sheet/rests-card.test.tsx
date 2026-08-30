import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { combatStateOf, type CombatState } from '@/lib/characters/combat'
import type { Character } from '@/lib/db/schema'

import { RestsCard } from './rests-card'

jest.mock('sonner', () => ({ toast: { info: jest.fn() } }))

import { toast } from 'sonner'

const mockToastInfo = toast.info as jest.MockedFunction<typeof toast.info>

const CLERIC: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Mira Dawnward',
  classIndex: 'cleric',
  speciesIndex: 'human',
  level: 4,
  strength: 12,
  dexterity: 10,
  constitution: 14,
  intelligence: 10,
  wisdom: 16,
  charisma: 12,
  maxHitPoints: 31,
  currentHitPoints: 12,
  temporaryHitPoints: 2,
  armorClass: 16,
  speed: 30,
  spellSlots: { '1': { max: 4, used: 3 }, '2': { max: 3, used: 3 } },
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  exhaustion: 1,
  hitDiceUsed: 1,
  experience: null,
  classResources: [
    { name: 'Channel Divinity', max: 1, used: 1, recharge: 'short-rest' },
    { name: 'Blessing', max: 1, used: 1, recharge: 'manual' },
  ],
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  skillProficiencies: [],
  skillExpertise: [],
  knownSpellIndexes: [],
  preparedSpellIndexes: [],
  concentration: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
  backgroundIndex: null,
  backgroundAbilitySpread: null,
  backgroundAbilities: null,
  originFeatIndex: null,
  subclassIndex: null,
  masteredWeaponIndexes: null,
  heroicInspiration: null,
}

/** Holds the state the way `useCombatState` does, minus the network. */
function Harness({ character = CLERIC }: { character?: Character }) {
  const [state, setState] = useState<CombatState>(() => combatStateOf(character))

  return (
    <>
      <RestsCard
        character={character}
        state={state}
        apply={(transition) => setState((current) => transition(current))}
      />
      <output data-testid="state">{JSON.stringify(state)}</output>
    </>
  )
}

function currentState(): CombatState {
  return JSON.parse(screen.getByTestId('state').textContent ?? '{}')
}

describe('RestsCard', () => {
  it('shows the hit dice pool with the class die once some have been spent', () => {
    render(<Harness />)

    // This cleric has spent one, so the beginner fold is already open.
    expect(screen.getByText('Hit dice')).toBeInTheDocument()
    expect(screen.getByText('3 of 4')).toBeInTheDocument()
    expect(screen.getByText('(d8)')).toBeInTheDocument()
  })

  it('folds the pool away for a character who has spent none', async () => {
    const user = userEvent.setup()
    render(<Harness character={{ ...CLERIC, hitDiceUsed: 0 }} />)

    expect(screen.queryByText('4 of 4')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Hit dice/ }))

    expect(screen.getByText('4 of 4')).toBeInTheDocument()
  })

  it('confirms a long rest, applies the whole patch, and nudges a prepared caster', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Long rest' }))
    expect(
      screen.getByText(
        'Restores HP and spell slots, returns half your hit dice, removes one level of exhaustion.',
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rest' }))

    const state = currentState()
    expect(state.currentHitPoints).toBe(31)
    expect(state.temporaryHitPoints).toBe(0)
    expect(state.hitDiceUsed).toBe(0)
    expect(state.exhaustion).toBe(0)
    expect(state.spellSlots).toEqual({ '1': { max: 4, used: 0 }, '2': { max: 3, used: 0 } })
    // Rest-recharging pools refill; the manual pool is the player's own business.
    expect(state.classResources).toEqual([
      { name: 'Channel Divinity', max: 1, used: 0, recharge: 'short-rest' },
      { name: 'Blessing', max: 1, used: 1, recharge: 'manual' },
    ])

    expect(mockToastInfo).toHaveBeenCalledWith(
      expect.stringMatching(/prepared spells/i),
      expect.anything(),
    )
  })

  it('backs out of the long rest without touching anything', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Long rest' }))
    await user.click(screen.getByRole('button', { name: 'Not yet' }))

    expect(currentState().currentHitPoints).toBe(12)
  })

  it('never offers more dice than remain', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Short rest' }))

    const more = screen.getByRole('button', { name: 'Spend one more hit die' })
    await user.click(more) // 2
    await user.click(more) // 3 — the pool's edge
    expect(more).toBeDisabled()
    expect(screen.getByLabelText('Roll 3')).toBeInTheDocument()
  })

  it('spends the typed rolls and heals with the Constitution modifier', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    await user.type(screen.getByLabelText('Roll 1'), '8')
    await user.click(screen.getByRole('button', { name: 'Take the short rest' }))

    const state = currentState()
    // 12 + (8 + CON 2) = 22, one die spent on top of the one already used.
    expect(state.currentHitPoints).toBe(22)
    expect(state.hitDiceUsed).toBe(2)
    // A cleric's short rest refills short-rest pools and nothing else.
    expect(state.classResources[0].used).toBe(0)
    expect(state.spellSlots['1'].used).toBe(3)
  })

  it('lets a breather spend no dice at all, and the panel close without a rest', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    await user.click(screen.getByRole('button', { name: 'Spend one fewer hit die' }))
    await user.click(screen.getByRole('button', { name: 'Take the short rest' }))

    // No healing, no dice — but the short-rest pool still came back.
    expect(currentState().currentHitPoints).toBe(12)
    expect(currentState().hitDiceUsed).toBe(1)
    expect(currentState().classResources[0].used).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('Roll 1')).not.toBeInTheDocument()
  })

  it('says nothing about pact slots to a non-warlock, and does to a warlock', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    expect(screen.queryByText(/pact slots/)).not.toBeInTheDocument()
    unmount()

    render(<Harness character={{ ...CLERIC, classIndex: 'warlock' }} />)
    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    expect(screen.getByText('Warlock pact slots return on a short rest.')).toBeInTheDocument()
  })

  it('nudges every 2024 caster about preparation after a long rest', async () => {
    const user = userEvent.setup()
    // A sorcerer prepares from their class list in the 2024 rules, so the
    // "review your prepared spells" nudge is theirs as much as a cleric's.
    render(<Harness character={{ ...CLERIC, classIndex: 'sorcerer' }} />)

    await user.click(screen.getByRole('button', { name: 'Long rest' }))
    await user.click(screen.getByRole('button', { name: 'Rest' }))

    expect(mockToastInfo).toHaveBeenCalledWith(
      expect.stringContaining('prepared spells'),
      expect.anything(),
    )
  })

  it('says nothing about preparation to a class with no spells', async () => {
    const user = userEvent.setup()
    render(<Harness character={{ ...CLERIC, classIndex: 'fighter' }} />)

    await user.click(screen.getByRole('button', { name: 'Long rest' }))
    await user.click(screen.getByRole('button', { name: 'Rest' }))

    expect(mockToastInfo).not.toHaveBeenCalled()
  })
})
