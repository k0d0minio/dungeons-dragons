import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { planFeats, type FeatStep } from '@/lib/characters/level-up'
import type { AbilityScores } from '@/lib/characters/rules'

import {
  defaultFeatSelection,
  defaultGrantedAbility,
  FeatChoiceCard,
  grantableAbilities,
  selectionIncreases,
  selectionToLevelFeat,
  type FeatSelection,
} from './level-up-feats'

const SCORES: AbilityScores = {
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
}

/** A wizard's 4th- or 19th-level step, as the planner derives it. */
function stepAt(level: number, scores: AbilityScores = SCORES): FeatStep {
  const [step] = planFeats({ ...scores, classIndex: 'wizard', level: level - 1 }, level)

  return step
}

function selection(overrides: Partial<FeatSelection> = {}): FeatSelection {
  return { ...defaultFeatSelection(stepAt(4)), ...overrides }
}

describe('grantableAbilities', () => {
  it('offers Grappler the two scores it raises, and stops them at 20', () => {
    expect(grantableAbilities('grappler', SCORES)).toEqual(['strength', 'dexterity'])
    expect(grantableAbilities('grappler', { ...SCORES, dexterity: 20 })).toEqual(['strength'])
  })

  it('offers an Epic Boon every score, as far as 30', () => {
    expect(grantableAbilities('boon-of-fate', { ...SCORES, intelligence: 20 })).toContain(
      'intelligence',
    )
    expect(grantableAbilities('boon-of-fate', { ...SCORES, intelligence: 30 })).not.toContain(
      'intelligence',
    )
  })

  it('offers nothing for a feat that grants no score', () => {
    expect(grantableAbilities('savage-attacker', SCORES)).toEqual([])
    expect(defaultGrantedAbility('savage-attacker', SCORES)).toBeNull()
  })

  it('opens on the highest score the feat may raise', () => {
    expect(defaultGrantedAbility('grappler', SCORES)).toBe('dexterity')
    expect(defaultGrantedAbility('boon-of-fate', SCORES)).toBe('intelligence')
  })
})

describe('selectionIncreases, on a feat that grants a score', () => {
  it('spends the feat’s point on the chosen ability', () => {
    const chosen = selection({ featIndex: 'grappler', featAbility: 'strength' })

    expect(selectionIncreases(chosen)).toEqual({ strength: 1 })
    expect(selectionToLevelFeat(stepAt(4), chosen)).toEqual({
      level: 4,
      featIndex: 'grappler',
      increases: { strength: 1 },
    })
  })

  it('spends nothing on an ability the feat does not grant', () => {
    expect(selectionIncreases(selection({ featIndex: 'grappler', featAbility: 'wisdom' }))).toEqual(
      {},
    )
  })

  it('spends nothing for a feat that grants no score', () => {
    expect(
      selectionIncreases(selection({ featIndex: 'savage-attacker', featAbility: 'strength' })),
    ).toEqual({})
  })
})

describe('FeatChoiceCard, on a feat that grants a score', () => {
  function renderCard(step: FeatStep, chosen: FeatSelection) {
    const onChange = jest.fn()

    render(
      <FeatChoiceCard
        step={step}
        scores={SCORES}
        selection={chosen}
        classLabel="Wizard"
        onChange={onChange}
      />,
    )

    return onChange
  }

  it('prompts for the ability and reports what the level adds', () => {
    renderCard(stepAt(4), selection({ featIndex: 'grappler', featAbility: 'dexterity' }))

    expect(screen.getByRole('combobox', { name: 'and +1 to' })).toBeInTheDocument()
    expect(screen.getByText('This level: +1 Dexterity.')).toBeInTheDocument()
  })

  it('says so when every score the feat raises is at its cap', () => {
    const capped: AbilityScores = { ...SCORES, strength: 20, dexterity: 20 }
    const step = stepAt(4, capped)
    const onChange = jest.fn()

    render(
      <FeatChoiceCard
        step={step}
        scores={capped}
        selection={{ ...defaultFeatSelection(step), featIndex: 'grappler', featAbility: null }}
        classLabel="Wizard"
        onChange={onChange}
      />,
    )

    expect(screen.getByText(/every score it can raise is already at 20/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'and +1 to' })).not.toBeInTheDocument()
  })

  it('names 30 as an Epic Boon’s cap', () => {
    renderCard(stepAt(19), selection({ featIndex: 'boon-of-fate', featAbility: 'intelligence' }))

    expect(screen.getByText(/may pass 30/i)).toBeInTheDocument()
  })

  it('seeds the ability when the toggle turns the feat branch on', async () => {
    const user = userEvent.setup()
    const step = stepAt(4)
    // Ability Score Improvement leads the list, and grants nothing of its own.
    const onChange = renderCard(step, selection())

    await user.click(screen.getByLabelText('Take a feat instead'))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ featIndex: 'ability-score-improvement', featAbility: null }),
    )
  })

  it('points back at the toggle for the Ability Score Improvement itself', () => {
    renderCard(stepAt(4), selection({ featIndex: 'ability-score-improvement' }))

    expect(screen.getByText(/the ability increase itself/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'and +1 to' })).not.toBeInTheDocument()
  })

  it('says nothing about a score for a feat that raises none', () => {
    renderCard(stepAt(19), selection({ featIndex: 'savage-attacker' }))

    expect(screen.getByText(/raises no ability score/i)).toBeInTheDocument()
  })
})
