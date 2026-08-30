import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import type { ClassResource } from '@/lib/db/schema'
import type { CombatState } from '@/lib/characters/combat'

import { ClassResourcesCard } from './class-resources-card'

function stateWith(classResources: ClassResource[]): CombatState {
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
    classResources,
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

function Harness({ resources = [] }: { resources?: ClassResource[] }) {
  const [state, setState] = useState(() => stateWith(resources))

  return (
    <>
      <ClassResourcesCard
        state={state}
        apply={(transition) => setState((current) => transition(current))}
      />
      <output data-testid="state">{JSON.stringify(state.classResources)}</output>
    </>
  )
}

function resources(): ClassResource[] {
  return JSON.parse(screen.getByTestId('state').textContent ?? '[]')
}

const RAGE: ClassResource = { name: 'Rage', max: 3, used: 1, recharge: 'long-rest' }

describe('ClassResourcesCard', () => {
  it('invites adding pools when none are tracked', () => {
    render(<Harness />)

    expect(screen.getByText(/Rage, Ki, Channel Divinity/)).toBeInTheDocument()
  })

  it('shows the remaining count and the recharge rule', () => {
    render(<Harness resources={[RAGE]} />)

    const pools = within(screen.getByRole('list', { name: 'Class resources' }))
    expect(pools.getByText('Rage')).toBeInTheDocument()
    expect(pools.getByText('2/3')).toBeInTheDocument()
    expect(pools.getByText('Long rest')).toBeInTheDocument()
  })

  it('spends and regains in one tap, stopping at the pool edges', async () => {
    const user = userEvent.setup()
    render(<Harness resources={[{ ...RAGE, used: 2 }]} />)

    await user.click(screen.getByRole('button', { name: 'Spend one Rage' }))
    expect(resources()[0].used).toBe(3)
    expect(screen.getByRole('button', { name: 'Spend one Rage' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Regain one Rage' }))
    expect(resources()[0].used).toBe(2)
  })

  it('adds a pool through the inline form, defaulting to a long rest recharge', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add' }))

    const add = screen.getByRole('button', { name: 'Add resource' })
    expect(add).toBeDisabled()

    await user.type(screen.getByLabelText('Name'), 'Ki')
    await user.type(screen.getByLabelText('Max'), '5')
    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    await user.click(add)

    expect(resources()).toEqual([{ name: 'Ki', max: 5, used: 0, recharge: 'short-rest' }])
  })

  it('edits a pool in place: rename, resize, recharge', async () => {
    const user = userEvent.setup()
    render(<Harness resources={[RAGE]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    // A controlled number field snaps back on an empty string, so set the new
    // maximum in one change event the way a numeric keyboard commit does.
    fireEvent.change(screen.getByLabelText('Maximum Rage'), { target: { value: '4' } })

    const recharge = within(screen.getByRole('group', { name: 'Rage recharge' }))
    await user.click(recharge.getByRole('button', { name: 'Manual' }))

    expect(resources()[0]).toMatchObject({ max: 4, recharge: 'manual' })
  })

  it('removes a pool', async () => {
    const user = userEvent.setup()
    render(<Harness resources={[RAGE]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Remove Rage' }))

    expect(resources()).toEqual([])
  })
})
