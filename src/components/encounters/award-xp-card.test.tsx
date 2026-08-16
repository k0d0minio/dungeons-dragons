import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({ useMonsterDetails: jest.fn() }))

import type { Character } from '@/lib/db/characters'
import type { CombatantWithCharacter, EncounterCombatant } from '@/lib/db/encounters'
import { useMonsterDetails } from '@/lib/dnd-api/swr-hooks'

import { AwardXpCard } from './award-xp-card'

// The card's contract (DND-055): the fight's monsters are priced from the
// reference data and divided by the characters in it, the split stays the
// DM's to edit, and a monster whose XP could not be read is named rather than
// silently counted as nothing.

const mockUseMonsterDetails = useMonsterDetails as jest.MockedFunction<typeof useMonsterDetails>

function combatant(overrides: Partial<EncounterCombatant>): EncounterCombatant {
  return {
    id: `combatant-${overrides.label ?? 'x'}`,
    encounterId: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
    characterId: null,
    monsterIndex: null,
    label: 'Someone',
    initiative: 10,
    sortOrder: 0,
    maxHitPoints: null,
    currentHitPoints: null,
    temporaryHitPoints: 0,
    conditions: [],
    createdAt: new Date('2026-08-15T12:00:00.000Z'),
    updatedAt: new Date('2026-08-15T12:00:00.000Z'),
    ...overrides,
  }
}

function monsterRow(index: string, label: string): CombatantWithCharacter {
  return { combatant: combatant({ monsterIndex: index, label }), character: null }
}

function partyRow(id: string, name: string): CombatantWithCharacter {
  return {
    combatant: combatant({ characterId: id, label: name }),
    character: { id, name } as Character,
  }
}

/** Two goblins and an orc against four adventurers: 200 XP, 50 each. */
const ROWS: CombatantWithCharacter[] = [
  monsterRow('goblin', 'Goblin 1'),
  monsterRow('goblin', 'Goblin 2'),
  monsterRow('orc', 'Orc'),
  partyRow('char-1', 'Vex'),
  partyRow('char-2', 'Brom'),
  partyRow('char-3', 'Sable'),
  partyRow('char-4', 'Pike'),
]

function mockDetails(details: Record<string, { xp: number }>, isLoading = false) {
  mockUseMonsterDetails.mockReturnValue({
    details,
    isLoading,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useMonsterDetails>)
}

describe('AwardXpCard', () => {
  beforeEach(() => {
    mockDetails({ goblin: { xp: 50 }, orc: { xp: 100 } })
  })

  it('prices the fight per instance and offers the split', () => {
    render(<AwardXpCard rows={ROWS} awarding={false} onAward={jest.fn()} />)

    expect(screen.getByText(/200 XP in the fight, split 4 ways/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/xp each/i)).toHaveValue(50)
  })

  it('awards what the field says', async () => {
    const user = userEvent.setup()
    const onAward = jest.fn()
    render(<AwardXpCard rows={ROWS} awarding={false} onAward={onAward} />)

    await user.click(screen.getByRole('button', { name: /award to party/i }))

    expect(onAward).toHaveBeenCalledWith(50)
  })

  it('lets the DM overrule the split — the table beats the book', async () => {
    const user = userEvent.setup()
    const onAward = jest.fn()
    render(<AwardXpCard rows={ROWS} awarding={false} onAward={onAward} />)

    const field = screen.getByLabelText(/xp each/i)
    await user.clear(field)
    await user.type(field, '500')
    await user.click(screen.getByRole('button', { name: /award to party/i }))

    expect(onAward).toHaveBeenCalledWith(500)
  })

  it('goes back to suggesting after an award, so nobody awards twice by leaving it typed', async () => {
    const user = userEvent.setup()
    render(<AwardXpCard rows={ROWS} awarding={false} onAward={jest.fn()} />)

    const field = screen.getByLabelText(/xp each/i)
    await user.clear(field)
    await user.type(field, '500')
    await user.click(screen.getByRole('button', { name: /award to party/i }))

    expect(screen.getByLabelText(/xp each/i)).toHaveValue(50)
  })

  it('names a monster it could not price rather than counting it as nothing', () => {
    mockDetails({ goblin: { xp: 50 } })
    render(<AwardXpCard rows={ROWS} awarding={false} onAward={jest.fn()} />)

    expect(screen.getByText(/no xp could be read for orc/i)).toBeInTheDocument()
    expect(screen.getByText(/100 XP in the fight/i)).toBeInTheDocument()
  })

  it('has nothing to award when the party is not in the fight', () => {
    render(
      <AwardXpCard
        rows={ROWS.filter((row) => row.character === null)}
        awarding={false}
        onAward={jest.fn()}
      />,
    )

    expect(screen.getByText(/nobody from the party is in this fight/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /award to party/i })).toBeDisabled()
  })

  it('says so and cannot re-fire while awards are in flight', () => {
    render(<AwardXpCard rows={ROWS} awarding onAward={jest.fn()} />)

    expect(screen.getByRole('button', { name: /awarding/i })).toBeDisabled()
  })

  it('waits for the reference data rather than offering a zero', () => {
    mockDetails({}, true)
    render(<AwardXpCard rows={ROWS} awarding={false} onAward={jest.fn()} />)

    expect(screen.getByText(/reading what these monsters are worth/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /award to party/i })).toBeDisabled()
  })
})
