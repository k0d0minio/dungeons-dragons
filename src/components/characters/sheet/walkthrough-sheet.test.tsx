import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SPELLS } from '@/lib/srd/spells'
import { WEAPONS } from '@/lib/srd/weapons'
import {
  savingThrowWalkthrough,
  skillCheckWalkthrough,
  spellWalkthrough,
  weaponAttackWalkthrough,
  type RollWalkthrough,
  type WalkthroughFields,
} from '@/lib/characters/walkthrough'

import { WalkthroughSheet } from './walkthrough-sheet'

// A 5th-level rogue: DEX 18, STR 8, proficiency +3, expertise in Stealth.
const ROGUE: WalkthroughFields = {
  classIndex: 'rogue',
  level: 5,
  exhaustion: 0,
  strength: 8,
  dexterity: 18,
  constitution: 12,
  intelligence: 12,
  wisdom: 12,
  charisma: 14,
  skillProficiencies: ['stealth'],
  skillExpertise: ['stealth'],
}

function weapon(index: string) {
  const found = WEAPONS.get(index)
  if (!found) throw new Error(`no SRD weapon "${index}"`)
  return found
}

function spell(index: string) {
  const found = SPELLS.get(index)
  if (!found) throw new Error(`no SRD spell "${index}"`)
  return found
}

function open(walkthrough: RollWalkthrough | null) {
  return render(<WalkthroughSheet walkthrough={walkthrough} onClose={jest.fn()} />)
}

describe('WalkthroughSheet — an attack', () => {
  const RAPIER = weaponAttackWalkthrough(ROGUE, weapon('rapier'))

  it('leads with the die to pick up', () => {
    open(RAPIER)

    expect(screen.getByRole('heading', { name: 'Pick up' })).toBeInTheDocument()
    expect(screen.getByText('d20')).toBeInTheDocument()
  })

  it('breaks the bonus down line by line, each with its reason', () => {
    open(RAPIER)

    // DEX +4 (finesse took the better score) and proficiency +3.
    expect(screen.getByLabelText(/^Dexterity \+4\. .*Finesse/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Proficiency \+3\. /)).toBeInTheDocument()
    expect(screen.getByLabelText('Add +7 in total')).toBeInTheDocument()
  })

  it('names the target without inventing a number for it', () => {
    open(RAPIER)

    expect(screen.getByRole('heading', { name: 'Beat' })).toBeInTheDocument()
    expect(screen.getByText("The target's Armour Class")).toBeInTheDocument()
    // The DM holds the AC; a "?" says so where a number would lie.
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('says what to roll on a hit, and what a natural 20 changes', () => {
    open(RAPIER)

    expect(screen.getByRole('heading', { name: 'Then' })).toBeInTheDocument()
    expect(screen.getByText('1d8+4 piercing')).toBeInTheDocument()
    expect(screen.getByText('If the d20 shows a 20')).toBeInTheDocument()
  })

  it('offers nothing that rolls anything (D8)', () => {
    open(RAPIER)

    // Every control in here is a glossary trigger — nothing produces a number.
    for (const control of screen.getAllByRole('button')) {
      const name = control.getAttribute('aria-label') ?? control.textContent ?? ''
      expect(name).not.toMatch(/^roll\b/i)
    }
  })

  it('titles itself with what was tapped', () => {
    open(RAPIER)

    expect(screen.getByRole('heading', { name: 'Rapier' })).toBeInTheDocument()
  })
})

describe('WalkthroughSheet — a check', () => {
  it('spells out expertise as the reason the number is that big', () => {
    open(skillCheckWalkthrough(ROGUE, 'stealth'))

    // DEX +4 and expertise's doubled +6 = +10.
    expect(
      screen.getByLabelText(/^Expertise \+6\. Expertise: your proficiency bonus counts twice/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Add +10 in total')).toBeInTheDocument()
  })

  it('leaves the DC with the DM', () => {
    open(skillCheckWalkthrough(ROGUE, 'athletics'))

    expect(screen.getByText('The DC your DM sets')).toBeInTheDocument()
  })

  it('keeps the zero line for a skill with no proficiency behind it', () => {
    open(skillCheckWalkthrough(ROGUE, 'athletics'))

    expect(screen.getByLabelText(/^Proficiency \+0\. You are not proficient/)).toBeInTheDocument()
  })
})

describe('WalkthroughSheet — a save', () => {
  it('says out loud when the class does not have this save', () => {
    open(savingThrowWalkthrough(ROGUE, 'constitution'))

    expect(screen.getByRole('heading', { name: 'Constitution save' })).toBeInTheDocument()
    expect(
      screen.getByLabelText(/^Proficiency \+0\. Your class is not proficient in this save/),
    ).toBeInTheDocument()
  })
})

describe('WalkthroughSheet — a spell that makes someone else roll', () => {
  const WIZARD: WalkthroughFields = {
    ...ROGUE,
    classIndex: 'wizard',
    intelligence: 18,
  }

  it('says the caster picks up no die, and shows the DC as a DC', () => {
    open(spellWalkthrough(WIZARD, spell('fireball'), 3))

    expect(screen.getByText(/No die — not for you/)).toBeInTheDocument()
    // 8 + INT +4 + proficiency +3, printed unsigned because it is a DC.
    expect(screen.getByLabelText('Your difficulty class is 15')).toBeInTheDocument()
    // And again as the number the target is rolling against.
    expect(screen.getByText('Their Dexterity saving throw')).toBeInTheDocument()
  })

  it('names the slot the cast spends', () => {
    open(spellWalkthrough(WIZARD, spell('fireball'), 4))

    expect(screen.getByText(/Mark off one level-4 spell slot/)).toBeInTheDocument()
  })
})

describe('WalkthroughSheet — opening and closing', () => {
  it('shows nothing at all until something is tapped', () => {
    open(null)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on the close control', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    render(
      <WalkthroughSheet
        walkthrough={weaponAttackWalkthrough(ROGUE, weapon('rapier'))}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onClose).toHaveBeenCalled()
  })

  it('opens a glossary definition from a term inside it', async () => {
    const user = userEvent.setup()
    open(weaponAttackWalkthrough(ROGUE, weapon('rapier')))

    await user.click(screen.getByRole('button', { name: 'What is Proficiency bonus?' }))

    expect(screen.getByRole('heading', { name: 'Proficiency bonus' })).toBeInTheDocument()
  })
})
