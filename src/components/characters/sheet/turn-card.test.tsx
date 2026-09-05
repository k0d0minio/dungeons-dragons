import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { combatStateOf } from '@/lib/characters/combat'
import type { Character, CharacterItem } from '@/lib/db/schema'

import { TurnCard } from './turn-card'

// The turn, at the top of the sheet (first-table/your-turn-card): every line
// is the walkthrough's own row read back as a sentence, and tapping an attack
// opens that same walkthrough. Nothing here computes a number.

const FIGHTER: Character = {
  portrait: null,
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Brom Ironfist',
  classIndex: 'fighter',
  speciesIndex: 'human',
  level: 1,
  strength: 16,
  dexterity: 12,
  constitution: 14,
  intelligence: 10,
  wisdom: 12,
  charisma: 8,
  maxHitPoints: 12,
  currentHitPoints: 12,
  temporaryHitPoints: 0,
  armorClass: 16,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  version: 0,
  exhaustion: 0,
  hitDiceUsed: 0,
  experience: null,
  classResources: [],
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
  featChoices: null,
}

const WIZARD: Character = {
  ...FIGHTER,
  classIndex: 'wizard',
  strength: 8,
  dexterity: 14,
  intelligence: 16,
  spellSlots: { '1': { max: 2, used: 1 } },
  knownSpellIndexes: ['fire-bolt', 'shield', 'magic-missile'],
  preparedSpellIndexes: ['shield', 'magic-missile'],
}

function item(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    characterId: FIGHTER.id,
    equipmentIndex: 'longsword',
    customName: null,
    quantity: 1,
    equipped: true,
    attuned: false,
    notes: null,
    createdAt: new Date('2026-08-14T12:00:00.000Z'),
    updatedAt: new Date('2026-08-14T12:00:00.000Z'),
    ...overrides,
  }
}

describe('TurnCard', () => {
  it('writes each readied weapon the way the DM says it, off the walkthrough', () => {
    render(
      <TurnCard
        character={FIGHTER}
        items={[item(), item({ id: 'javelins', equipmentIndex: 'javelin', quantity: 6 })]}
        state={combatStateOf(FIGHTER)}
        onWalkthrough={jest.fn()}
      />,
    )

    expect(screen.getByText('30 ft')).toBeInTheDocument()
    // Level 1, Strength 16: proficiency 2 + 3. A fighter with no recorded
    // choice can use every weapon's mastery, so the word rides along.
    expect(
      screen.getByRole('button', {
        name: 'Longsword: roll d20 + 5, hit if it beats their AC, then 1d8+3 slashing · Sap',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Javelin: roll d20 + 5, hit if it beats their AC, then 1d6+3 piercing · Slow',
      }),
    ).toBeInTheDocument()
  })

  it('names the class’s bonus action, the reaction everyone has, and no spells line', () => {
    render(
      <TurnCard
        character={FIGHTER}
        items={[item()]}
        state={combatStateOf(FIGHTER)}
        onWalkthrough={jest.fn()}
      />,
    )

    expect(screen.getByText('Second Wind')).toBeInTheDocument()
    expect(screen.getByText(/Opportunity Attack — when an enemy/)).toBeInTheDocument()
    expect(screen.queryByText(/slots? left/)).not.toBeInTheDocument()
    expect(screen.queryByText(/cantrips/)).not.toBeInTheDocument()
  })

  it('falls back to the unarmed strike when nothing is readied', async () => {
    const user = userEvent.setup()
    const onWalkthrough = jest.fn()
    render(
      <TurnCard
        character={FIGHTER}
        items={[item({ equipped: false })]}
        state={combatStateOf(FIGHTER)}
        onWalkthrough={onWalkthrough}
      />,
    )

    const strike = screen.getByRole('button', { name: /^Unarmed strike: roll d20 \+ 5/ })
    await user.click(strike)

    expect(onWalkthrough).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attack', title: 'Unarmed strike', total: 5 }),
    )
  })

  it('opens the same walkthrough the attack row would', async () => {
    const user = userEvent.setup()
    const onWalkthrough = jest.fn()
    render(
      <TurnCard
        character={FIGHTER}
        items={[item()]}
        state={combatStateOf(FIGHTER)}
        onWalkthrough={onWalkthrough}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^Longsword:/ }))

    expect(onWalkthrough).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'attack', title: 'Longsword', total: 5 }),
    )
  })

  it('counts cantrips and the slots left from the live state, and lists the reaction spell', () => {
    render(
      <TurnCard
        character={WIZARD}
        items={[item({ equipmentIndex: 'dagger' })]}
        state={combatStateOf(WIZARD)}
        onWalkthrough={jest.fn()}
      />,
    )

    expect(screen.getByText('cantrips always · 1 slot left')).toBeInTheDocument()
    expect(screen.getByText(/Opportunity Attack — .* · Shield —/)).toBeInTheDocument()
    expect(screen.getByText('none yet')).toBeInTheDocument()
  })

  it('reads the speed and the slots from the state, not the row', () => {
    const state = {
      ...combatStateOf(WIZARD),
      exhaustion: 1,
      spellSlots: { '1': { max: 2, used: 2 } },
    }
    render(<TurnCard character={WIZARD} items={[]} state={state} onWalkthrough={jest.fn()} />)

    // One level of exhaustion is −5 ft (2024).
    expect(screen.getByText('25 ft')).toBeInTheDocument()
    expect(screen.getByText('cantrips always · 0 slots left')).toBeInTheDocument()
  })

  it('adds the mastery word only while the gate is on', () => {
    const chose = { ...FIGHTER, masteredWeaponIndexes: ['longsword'] }
    const { rerender } = render(
      <TurnCard
        character={chose}
        items={[item()]}
        state={combatStateOf(chose)}
        mastery={false}
        onWalkthrough={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /^Longsword:/ })).not.toHaveAccessibleName(/Sap/)

    rerender(
      <TurnCard
        character={chose}
        items={[item()]}
        state={combatStateOf(chose)}
        mastery
        onWalkthrough={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /^Longsword:.*· Sap$/ })).toBeInTheDocument()
  })
})
