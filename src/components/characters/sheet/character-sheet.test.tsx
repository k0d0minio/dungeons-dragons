import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character, CharacterItem } from '@/lib/db/schema'

import { CharacterSheet } from './character-sheet'

// The hooks are stubbed one by one, but the module also carries pure helpers
// (`searchByName`, which the spell list filters with) — those stay real.
jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useClassSpells: jest.fn(),
  useSpell: jest.fn(),
  useEquipmentItem: jest.fn(),
  useEquipmentDetails: jest.fn(),
  useEquipment: jest.fn(),
  useMonster: jest.fn(),
}))

// A failed save is reported by a toast, so the sheet's own tree has nothing to
// assert against — `<Toaster />` is mounted app-wide in `src/app/providers.tsx`.
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn(), info: jest.fn() } }))

import { toast } from 'sonner'

import { EQUIPMENT } from '@/lib/srd/equipment'
import { useClassSpells, useEquipment, useEquipmentDetails, useSpell } from '@/lib/srd/hooks'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockToastWarning = toast.warning as jest.MockedFunction<typeof toast.warning>
const mockToastInfo = toast.info as jest.MockedFunction<typeof toast.info>
const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>
const mockUseSpell = useSpell as jest.MockedFunction<typeof useSpell>
const mockUseEquipmentDetails = useEquipmentDetails as jest.MockedFunction<
  typeof useEquipmentDetails
>
const mockUseEquipment = useEquipment as jest.MockedFunction<typeof useEquipment>

const CHARACTER: Character = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  ownerId: 'user_2mFq8xKpLd',
  name: 'Vex Ashbrand',
  classIndex: 'wizard',
  speciesIndex: 'half-elf',
  level: 5,
  strength: 8,
  dexterity: 14,
  constitution: 14,
  intelligence: 18,
  wisdom: 12,
  charisma: 10,
  maxHitPoints: 32,
  currentHitPoints: 32,
  temporaryHitPoints: 0,
  armorClass: 12,
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
  knownSpellIndexes: ['fireball', 'mage-hand'],
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

/** An inventory row: a longsword, equipped, ready to feed the attacks card. */
function item(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    characterId: CHARACTER.id,
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

/** The real SRD 5.2.1 rows — Longsword 1d8/1d10 versatile, Leather 11 + Dex. */
const LONGSWORD_DETAILS = EQUIPMENT.get('longsword')
const LEATHER_DETAILS = EQUIPMENT.get('leather-armor')

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

/** The route answers with the stored row; echo the patch back over it. */
function respondWithStoredRow(character: Character = CHARACTER) {
  mockFetch.mockImplementation(async (_url, init) => {
    // The `version` key is the DND-028 guard, not a column the patch writes —
    // the real route peels it off and answers with the bumped row version.
    const { version, ...patch } = JSON.parse(String((init as RequestInit).body))

    return {
      ok: true,
      status: 200,
      json: async () => ({ character: { ...character, ...patch, version: (version ?? 0) + 1 } }),
    } as Response
  })
}

function lastPatch() {
  const call = mockFetch.mock.calls.at(-1)
  return JSON.parse(String((call?.[1] as RequestInit).body))
}

/** The four segments of the sheet, by the label on the control. */
type Segment = 'Play' | 'Spells' | 'Gear' | 'Me'

/**
 * Open one segment of the sheet. Play is where the sheet lands, so a Play test
 * renders exactly as it did when this was one column; every other test says
 * which segment its cards live in, which is the layout assertion doing double
 * duty as setup.
 */
async function show(segment: Segment) {
  await userEvent.click(screen.getByRole('tab', { name: new RegExp(`^${segment}`) }))
}

/**
 * A card by the words in its title.
 *
 * Not `getByText(..., { selector })`: a card whose subject is a glossary term
 * wraps its title in that term's trigger (`learn-to-play/glossary-popovers`),
 * so the words stopped being a direct child text node of the title element and
 * `getByText`'s selector option cannot see them. Reading the whole title's
 * text sees both kinds, and `startsWith` steps over the count some titles
 * carry beside the words ("Spells 3 prepared").
 */
function cardTitle(text: string): HTMLElement {
  const title = screen
    .getAllByText(/.*/, { selector: '[data-slot="card-title"]' })
    .find((element) => (element.textContent ?? '').trim().startsWith(text))
  if (!title) throw new Error(`No card titled "${text}" is on screen`)
  return title
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  respondWithStoredRow()

  mockUseClassSpells.mockReturnValue({
    spells: [
      { index: 'fireball', name: 'Fireball', level: 3 },
      { index: 'mage-hand', name: 'Mage Hand', level: 0 },
    ],
    count: 2,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClassSpells>)

  mockUseSpell.mockReturnValue({
    spell: undefined,
    isLoading: true,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useSpell>)

  mockUseEquipmentDetails.mockReturnValue({
    details: { longsword: LONGSWORD_DETAILS, 'leather-armor': LEATHER_DETAILS },
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useEquipmentDetails>)

  // The inventory picker's two tabs are one equipment list, filtered.
  mockUseEquipment.mockReturnValue({
    equipment: [LONGSWORD_DETAILS, LEATHER_DETAILS],
    count: 2,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useEquipment>)
})

describe('hit points', () => {
  it('takes damage on one tap and persists it', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))

    expect(screen.getByLabelText('27 of 32 hit points')).toBeInTheDocument()
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER.id}`)
    expect((init as RequestInit).method).toBe('PATCH')
    expect(lastPatch().currentHitPoints).toBe(27)
    // Every save claims the row version it was based on (DND-028).
    expect(lastPatch().version).toBe(CHARACTER.version)
  })

  it('heals no further than the maximum', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Heal 5' }))

    expect(screen.getByLabelText('32 of 32 hit points')).toBeInTheDocument()
  })

  it('applies a typed amount as damage', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.type(screen.getByLabelText('Amount'), '18')
    await user.click(screen.getByRole('button', { name: 'Damage' }))

    expect(screen.getByLabelText('14 of 32 hit points')).toBeInTheDocument()
    // The field empties, so the next tap cannot repeat a number by accident.
    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('spends temporary hit points before real ones', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, temporaryHitPoints: 4 }} />)

    await user.click(screen.getByRole('button', { name: 'Take 1 damage' }))

    expect(screen.getByLabelText('32 of 32 hit points')).toBeInTheDocument()
    await waitFor(() => expect(lastPatch().temporaryHitPoints).toBe(3))
  })

  it('sends one request per burst of taps rather than one per tap', async () => {
    const user = userEvent.setup()
    // Hold the first response open so the taps below all land mid-flight.
    let release: (value: Response) => void = () => {}
    mockFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => (release = resolve)))

    render(<CharacterSheet character={CHARACTER} />)

    const damage = screen.getByRole('button', { name: 'Take 1 damage' })
    await user.click(damage)
    await user.click(damage)
    await user.click(damage)
    await user.click(damage)

    expect(screen.getByLabelText('28 of 32 hit points')).toBeInTheDocument()

    release({
      ok: true,
      status: 200,
      json: async () => ({ character: { ...CHARACTER, currentHitPoints: 31 } }),
    } as Response)

    // One in flight, one queued behind it carrying the final total — four taps,
    // two requests, and the last one is the one that counts.
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(lastPatch().currentHitPoints).toBe(28)
  })
})

describe('when a change cannot be saved', () => {
  it('rolls the sheet back to the last stored values and says so', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(mockToastError.mock.calls[0][0]).toMatch(/did not save/i)
    expect(screen.getByLabelText('32 of 32 hit points')).toBeInTheDocument()
  })

  it('says so plainly when the session has expired', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)

    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(mockToastError.mock.calls[0][0]).toMatch(/signed out/i)
  })

  it('reports a slot that did not save, not only a hit point change', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))
    const caster = { ...CHARACTER, spellSlots: { '3': { max: 2, used: 0 } } }

    render(<CharacterSheet character={caster} />)
    await show('Spells')

    await user.click(screen.getAllByRole('button', { name: 'Spend a level 3 slot' })[0])

    // The pip pops back, and the toast is what says why — the tap happened
    // roughly a screen below the top of the sheet (DND-023).
    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(screen.getAllByRole('button', { name: 'Spend a level 3 slot' })).toHaveLength(2)
  })

  it('replaces the message rather than stacking one per failed tap', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 1 damage' }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Take 1 damage' }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(2))

    const ids = mockToastError.mock.calls.map((call) => call[1]?.id)
    expect(ids[0]).toBe(`combat-save-${CHARACTER.id}`)
    expect(ids[1]).toBe(ids[0])
  })
})

describe('when someone else wrote first (DND-028)', () => {
  it('adopts the server row on a 409 and says so with a warning toast', async () => {
    const user = userEvent.setup()
    const current = { ...CHARACTER, currentHitPoints: 9, version: 5 }
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Someone else changed this character first',
        character: current,
      }),
    } as Response)

    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))

    // The optimistic 27 gives way to the row as the server holds it now.
    await waitFor(() => expect(screen.getByLabelText('9 of 32 hit points')).toBeInTheDocument())
    expect(mockToastWarning).toHaveBeenCalledTimes(1)
    expect(mockToastWarning.mock.calls[0][0]).toMatch(/updated this character first/i)
    expect(mockToastWarning.mock.calls[0][1]?.id).toBe(`combat-save-${CHARACTER.id}`)
    // A conflict is not a failure; the failure toast stays quiet.
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('claims the adopted version on the save that follows a conflict', async () => {
    const user = userEvent.setup()
    const current = { ...CHARACTER, currentHitPoints: 9, version: 5 }
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Someone else changed this character first',
        character: current,
      }),
    } as Response)

    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))
    await waitFor(() => expect(screen.getByLabelText('9 of 32 hit points')).toBeInTheDocument())

    // The next tap writes against the row the 409 delivered, not the stale one.
    await user.click(screen.getByRole('button', { name: 'Take 1 damage' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(lastPatch().currentHitPoints).toBe(8)
    expect(lastPatch().version).toBe(5)
  })
})

describe('death saves', () => {
  it('stay hidden until the character is at 0 hit points', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, currentHitPoints: 3 }} />)

    expect(screen.queryByText('Death saves')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))

    expect(screen.getByText('Death saves')).toBeInTheDocument()
  })

  it('mark, clear on a second tap, and persist', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, currentHitPoints: 0 }} />)

    await user.click(screen.getByRole('button', { name: 'Mark failures 2' }))
    await waitFor(() => expect(lastPatch().deathSaveFailures).toBe(2))

    await user.click(screen.getByRole('button', { name: 'Clear failures 2' }))
    await waitFor(() => expect(lastPatch().deathSaveFailures).toBe(1))
  })

  it('are cleared by any healing', async () => {
    const user = userEvent.setup()
    render(
      <CharacterSheet character={{ ...CHARACTER, currentHitPoints: 0, deathSaveFailures: 2 }} />,
    )

    await user.click(screen.getByRole('button', { name: 'Heal 1' }))

    expect(screen.queryByText('Death saves')).not.toBeInTheDocument()
    await waitFor(() => expect(lastPatch().deathSaveFailures).toBe(0))
  })
})

describe('conditions', () => {
  it('toggle on, explain themselves, and persist', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Change' }))
    await user.click(screen.getByRole('button', { name: 'Prone', pressed: false }))

    await waitFor(() => expect(lastPatch().conditions).toEqual(['prone']))
    // The chip is the toggle; the list above it says what being prone costs you.
    expect(screen.getByRole('list', { name: 'Active conditions' })).toHaveTextContent(
      'Disadvantage on your attacks; attacks within 5 ft. of you have advantage.',
    )

    await user.click(screen.getByRole('button', { name: 'Prone', pressed: true }))
    await waitFor(() => expect(lastPatch().conditions).toEqual([]))
  })

  it('keep the fifteen-chip picker shut until it is asked for', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, conditions: ['prone'] }} />)

    // What is on, and what it costs, is readable without a tap; the picker for
    // the other fourteen is not in the way of the spell slots above it.
    expect(screen.getByRole('list', { name: 'Active conditions' })).toHaveTextContent(
      'Disadvantage on your attacks; attacks within 5 ft. of you have advantage.',
    )
    expect(screen.queryByRole('button', { name: 'Blinded' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('button', { name: 'Blinded' })).toBeInTheDocument()
  })

  it('clear an active condition in one tap, with the picker still shut', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, conditions: ['prone'] }} />)

    const rows = within(screen.getByRole('list', { name: 'Active conditions' }))
    await user.click(rows.getByRole('button', { name: /^Prone/ }))

    await waitFor(() => expect(lastPatch().conditions).toEqual([]))
    expect(screen.queryByRole('list', { name: 'Active conditions' })).not.toBeInTheDocument()
  })

  it('lists a condition this build does not recognise so it can still be cleared', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, conditions: ['cursed'] }} />)

    const rows = within(screen.getByRole('list', { name: 'Active conditions' }))
    await user.click(rows.getByRole('button', { name: /^Cursed/ }))

    await waitFor(() => expect(lastPatch().conditions).toEqual([]))
  })

  it('link each active condition to its full rules text without hijacking the toggle', () => {
    render(<CharacterSheet character={{ ...CHARACTER, conditions: ['prone'] }} />)

    const rows = within(screen.getByRole('list', { name: 'Active conditions' }))

    // The DND-037 chapter anchor is the condition index; the link is its own
    // 44px target beside the row, so the row tap still clears the condition.
    expect(rows.getByRole('link', { name: 'Prone rules' })).toHaveAttribute(
      'href',
      '/rules/conditions#prone',
    )
    expect(rows.getByRole('button', { name: /^Prone/ })).toBeInTheDocument()
  })

  it('offer no rules link for a condition the chapter does not have', () => {
    render(<CharacterSheet character={{ ...CHARACTER, conditions: ['cursed'] }} />)

    const rows = within(screen.getByRole('list', { name: 'Active conditions' }))

    expect(rows.queryByRole('link')).not.toBeInTheDocument()
  })

  it('come last in Play, below everything a turn touches more often', () => {
    render(<CharacterSheet character={CHARACTER} />)

    const titles = screen
      .getAllByText(/.*/, { selector: '[data-slot="card-title"]' })
      .map((title) => title.textContent)

    // DND-023's rule was "spell slots above conditions" in one long column;
    // the column is four segments now and the slots are a segment of their
    // own, so what survives is the rule it was serving: conditions change
    // perhaps twice a session, so nothing a turn touches sits below them.
    expect(titles[0]).toBe('Hit points')
    expect(titles.at(-1)).toMatch(/^Conditions/)
    expect(screen.queryByText('Spell slots', { selector: '[data-slot="card-title"]' })).toBeNull()
  })
})

describe('spell slots', () => {
  it('offers the standard table when none have been set up', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)
    await show('Spells')

    expect(screen.getByText(/A level 5 Wizard gets the standard table/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Use the standard slots' }))

    // A level 5 full caster: four 1st, three 2nd, two 3rd.
    await waitFor(() =>
      expect(lastPatch().spellSlots).toEqual({
        '1': { max: 4, used: 0 },
        '2': { max: 3, used: 0 },
        '3': { max: 2, used: 0 },
      }),
    )
  })

  it('spends and regains one slot per tap', async () => {
    const user = userEvent.setup()
    const caster = { ...CHARACTER, spellSlots: { '3': { max: 2, used: 0 } } }

    render(<CharacterSheet character={caster} />)
    await show('Spells')

    await user.click(screen.getAllByRole('button', { name: 'Spend a level 3 slot' })[0])
    await waitFor(() => expect(lastPatch().spellSlots['3']).toEqual({ max: 2, used: 1 }))

    await user.click(screen.getByRole('button', { name: 'Regain a level 3 slot' }))
    await waitFor(() => expect(lastPatch().spellSlots['3']).toEqual({ max: 2, used: 0 }))
  })

  it('lets a build the tables do not describe set its own maxima', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, classIndex: 'fighter' }} />)
    await show('Spells')

    expect(screen.getByText(/has no spell slots by default/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Set them by hand' }))
    await user.click(screen.getByRole('button', { name: 'One more level 1 slot' }))

    await waitFor(() => expect(lastPatch().spellSlots).toEqual({ '1': { max: 1, used: 0 } }))
  })
})

describe('the read-only half', () => {
  it('computes the derived numbers rather than reading them off the row', async () => {
    render(<CharacterSheet character={CHARACTER} />)

    // The vitals strip leads Gear, beside the inventory that derives its AC.
    await show('Gear')
    // DEX 14 → +2 initiative; level 5 → +3 proficiency.
    expect(screen.getByLabelText('Initiative +2')).toBeInTheDocument()
    expect(screen.getByLabelText('Proficiency bonus +3')).toBeInTheDocument()

    await show('Me')
    // A wizard is proficient in Intelligence saves: INT 18 (+4) plus +3.
    expect(screen.getByLabelText('Intelligence saving throw +7, proficient')).toBeInTheDocument()
    // Strength is not a wizard save: STR 8 → −1, unchanged by proficiency.
    expect(screen.getByLabelText('Strength saving throw -1')).toBeInTheDocument()
  })

  it('folds stored skill proficiency and expertise into the bonuses (DND-015)', async () => {
    render(
      <CharacterSheet
        character={{
          ...CHARACTER,
          skillProficiencies: ['arcana', 'investigation'],
          skillExpertise: ['investigation'],
        }}
      />,
    )
    await show('Me')

    // INT +4, +3 proficiency — the sheet does the arithmetic now.
    expect(screen.getByLabelText('Arcana +7, proficient')).toBeInTheDocument()
    // Expertise doubles the proficiency bonus: 4 + 2×3.
    expect(screen.getByLabelText('Investigation +10, expertise')).toBeInTheDocument()
    // An unchosen skill stays at its bare ability modifier.
    expect(screen.getByLabelText('Athletics -1')).toBeInTheDocument()
    // The misleading "Class skill" badges and the DND-015 note are gone.
    expect(screen.queryByText('Class skill')).not.toBeInTheDocument()
    expect(screen.queryByText(/not stored yet/)).not.toBeInTheDocument()
  })

  it('notes Jack of All Trades on a bard of 2nd level or higher (D21)', async () => {
    render(
      <CharacterSheet character={{ ...CHARACTER, classIndex: 'bard', knownSpellIndexes: [] }} />,
    )
    await show('Me')

    // Level 5 → +3 proficiency, half rounded down is +1 — and it is already in
    // the numbers: WIS 12 gives Animal Handling +1 +1.
    expect(screen.getByText(/Jack of All Trades: \+1/)).toBeInTheDocument()
    expect(screen.getByLabelText('Animal Handling +2')).toBeInTheDocument()
  })

  it('opens the DND-003 spell detail when a spell is tapped', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)
    await show('Spells')

    await user.click(screen.getByRole('button', { name: 'Fireball' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Fireball')).toBeInTheDocument()
    expect(within(dialog).getByText('Spell')).toBeInTheDocument()
  })

  it('points a spell-less character at the edit form rather than at a dead end', async () => {
    render(<CharacterSheet character={{ ...CHARACTER, knownSpellIndexes: [] }} />)
    await show('Spells')

    expect(screen.getByRole('link', { name: 'Edit the character' })).toHaveAttribute(
      'href',
      `/characters/${CHARACTER.id}/edit`,
    )
  })

  it('falls back to the stored index when the reference list has not loaded', async () => {
    mockUseClassSpells.mockReturnValue({
      spells: [],
      count: 0,
      isLoading: false,
      error: new Error('offline'),
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useClassSpells>)

    render(<CharacterSheet character={CHARACTER} />)
    await show('Spells')

    expect(screen.getByRole('button', { name: 'Mage-Hand' })).toBeInTheDocument()
  })
})

describe('attacks (DND-034)', () => {
  it('computes an attack row from an equipped weapon and footnotes the assumption', () => {
    render(<CharacterSheet character={CHARACTER} items={[item()]} />)

    const attacks = within(screen.getByRole('list', { name: 'Attacks' }))

    // STR 8 (−1) + proficiency +3 = +2 on a melee longsword, with the same −1
    // on damage and the versatile die in parentheses.
    expect(
      attacks.getByLabelText(
        'Longsword +2, 1d8-1 slashing (1d10-1 slashing two-handed), Mastery: Sap — not available to your class',
      ),
    ).toBeInTheDocument()

    expect(screen.getByText('Assumes proficiency with equipped weapons.')).toBeInTheDocument()
  })

  it('shows the caster row and the unarmed strike', () => {
    render(<CharacterSheet character={CHARACTER} items={[]} />)

    const attacks = within(screen.getByRole('list', { name: 'Attacks' }))

    // Wizard, INT 18, level 5: spell attack +7, DC 15.
    expect(attacks.getByLabelText('Spell attack +7, save DC 15')).toBeInTheDocument()

    // Unarmed: proficiency +3 with STR −1 → +2 to hit, 1 − 1 = 0 damage.
    expect(attacks.getByLabelText('Unarmed strike +2, 0 bludgeoning')).toBeInTheDocument()
  })

  it('points at the inventory when nothing is equipped', () => {
    render(<CharacterSheet character={CHARACTER} items={[item({ equipped: false })]} />)

    expect(screen.getByText('Equip a weapon in Inventory to see attacks.')).toBeInTheDocument()
  })

  it('renders a custom item honestly: no invented numbers', () => {
    render(
      <CharacterSheet
        character={CHARACTER}
        items={[item({ equipmentIndex: null, customName: 'Ancestral blade' })]}
      />,
    )

    const attacks = within(screen.getByRole('list', { name: 'Attacks' }))
    expect(
      attacks.getByLabelText('Ancestral blade, stats unknown — custom item'),
    ).toBeInTheDocument()
  })
})

describe('rests (DND-033)', () => {
  it('applies a long rest in one confirmed tap and nudges a prepared caster', async () => {
    const user = userEvent.setup()
    const battered = {
      ...CHARACTER,
      currentHitPoints: 10,
      temporaryHitPoints: 3,
      hitDiceUsed: 4,
      exhaustion: 2,
      spellSlots: { '1': { max: 4, used: 4 } },
    }

    render(<CharacterSheet character={battered} />)

    await user.click(screen.getByRole('button', { name: 'Long rest' }))
    await user.click(screen.getByRole('button', { name: 'Rest' }))

    expect(screen.getByLabelText('32 of 32 hit points')).toBeInTheDocument()

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const patch = lastPatch()
    expect(patch.currentHitPoints).toBe(32)
    expect(patch.temporaryHitPoints).toBe(0)
    expect(patch.hitDiceUsed).toBe(2) // regained floor(5/2) of the 4 spent
    expect(patch.exhaustion).toBe(1)
    expect(patch.spellSlots).toEqual({ '1': { max: 4, used: 0 } })

    // Wizards prepare; a new day is the moment to re-choose.
    expect(mockToastInfo).toHaveBeenCalledWith(
      expect.stringMatching(/prepared spells/i),
      expect.anything(),
    )
  })

  it('spends typed hit dice on a short rest, blanks counting as the average', async () => {
    const user = userEvent.setup()
    const wounded = { ...CHARACTER, currentHitPoints: 10 }

    render(<CharacterSheet character={wounded} />)

    // Hit dice are folded away while none are spent (beginner mode); the
    // count is one tap in, and the short rest below opens the fold itself.
    await user.click(screen.getByRole('button', { name: /^Hit dice/ }))
    expect(screen.getByText('5 of 5')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Short rest' }))
    await user.click(screen.getByRole('button', { name: 'Spend one more hit die' }))
    await user.type(screen.getByLabelText('Roll 1'), '6')
    // Roll 2 stays blank: a wizard's d6 averages to 3.

    await user.click(screen.getByRole('button', { name: 'Take the short rest' }))

    // 6+2 and 3+2 (CON 14) on top of 10.
    expect(screen.getByLabelText('23 of 32 hit points')).toBeInTheDocument()
    await waitFor(() => expect(lastPatch().hitDiceUsed).toBe(2))
  })

  it('tells a warlock their pact slots come back with the breather', async () => {
    const user = userEvent.setup()
    render(
      <CharacterSheet character={{ ...CHARACTER, classIndex: 'warlock', knownSpellIndexes: [] }} />,
    )

    await user.click(screen.getByRole('button', { name: 'Short rest' }))

    expect(screen.getByText('Warlock pact slots return on a short rest.')).toBeInTheDocument()
  })
})

describe('class resources (D23)', () => {
  const raging = {
    ...CHARACTER,
    classIndex: 'barbarian',
    knownSpellIndexes: [],
    classResources: [{ name: 'Rage', max: 3, used: 1, recharge: 'long-rest' as const }],
  }

  it('spends and regains a pool in one tap each and persists', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={raging} />)

    const pools = within(screen.getByRole('list', { name: 'Class resources' }))
    expect(pools.getByText('2/3')).toBeInTheDocument()
    expect(pools.getByText('Long rest')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spend one Rage' }))
    await waitFor(() =>
      expect(lastPatch().classResources).toEqual([
        { name: 'Rage', max: 3, used: 2, recharge: 'long-rest' },
      ]),
    )

    await user.click(screen.getByRole('button', { name: 'Regain one Rage' }))
    await waitFor(() =>
      expect(lastPatch().classResources).toEqual([
        { name: 'Rage', max: 3, used: 1, recharge: 'long-rest' },
      ]),
    )
  })

  it('invites adding pools when none are tracked', () => {
    render(<CharacterSheet character={CHARACTER} />)

    expect(screen.getByText(/Rage, Ki, Channel Divinity/)).toBeInTheDocument()
  })

  it('adds a pool through the inline form', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, knownSpellIndexes: [] }} />)

    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Name'), 'Arcane Recovery')
    await user.type(screen.getByLabelText('Max'), '1')
    await user.click(screen.getByRole('button', { name: 'Add resource' }))

    await waitFor(() =>
      expect(lastPatch().classResources).toEqual([
        { name: 'Arcane Recovery', max: 1, used: 0, recharge: 'long-rest' },
      ]),
    )
  })
})

describe('temp HP and exhaustion (DND-038)', () => {
  it('sets temporary hit points to the typed amount in one action', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    // Typed temp HP is the advanced half of the card: folded away until this
    // character has some, so a first-timer sees damage and healing and no more.
    await user.click(screen.getByRole('button', { name: /^Temporary HP/ }))
    await user.type(screen.getByLabelText('Amount'), '12')
    await user.click(screen.getByRole('button', { name: 'Set temp HP' }))

    await waitFor(() => expect(lastPatch().temporaryHitPoints).toBe(12))
    // The field empties, same as damage and healing.
    expect(screen.getByLabelText('Amount')).toHaveValue(null)
  })

  it('steps exhaustion by level and totals the 2024 penalties', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, exhaustion: 2 }} />)

    // 2024: a flat −2 to every D20 Test and −5 ft of Speed per level, rather
    // than the 2014 ladder of six distinct effects.
    const effects = screen.getByRole('list', { name: 'Exhaustion effects' })
    expect(effects).toHaveTextContent('−4 to every d20 test')
    expect(effects).toHaveTextContent('−10 ft of speed')
    expect(effects).not.toHaveTextContent('Disadvantage')

    await user.click(screen.getByRole('button', { name: 'Increase exhaustion one level' }))
    await waitFor(() => expect(lastPatch().exhaustion).toBe(3))

    await user.click(screen.getByRole('button', { name: 'Reduce exhaustion one level' }))
    await waitFor(() => expect(lastPatch().exhaustion).toBe(2))
  })

  it('says plainly that level six is death', () => {
    render(<CharacterSheet character={{ ...CHARACTER, exhaustion: 6 }} />)

    expect(screen.getByRole('status')).toHaveTextContent('Level 6 — your character is dead.')
    expect(screen.getByRole('button', { name: 'Increase exhaustion one level' })).toBeDisabled()
  })

  it('no longer offers exhaustion as a boolean chip in the picker', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Change' }))

    expect(screen.getByRole('button', { name: 'Blinded' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Exhaustion' })).not.toBeInTheDocument()
  })
})

describe('spell preparation (DND-036)', () => {
  const CLERIC_SPELLS = [
    { index: 'bless', name: 'Bless', url: '/api/spells/bless', level: 1 },
    { index: 'cure-wounds', name: 'Cure Wounds', url: '/api/spells/cure-wounds', level: 1 },
  ]

  it('lets a cleric prepare from the whole class list and counts against the limit', async () => {
    const user = userEvent.setup()
    mockUseClassSpells.mockReturnValue({
      spells: CLERIC_SPELLS,
      count: CLERIC_SPELLS.length,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useClassSpells>)

    render(
      <CharacterSheet
        character={{
          ...CHARACTER,
          classIndex: 'cleric',
          knownSpellIndexes: [],
          preparedSpellIndexes: ['bless'],
        }}
      />,
    )
    await show('Spells')

    // The SRD 5.2.1 Cleric table prepares 9 at level 5 — by level, not by
    // Wisdom, which is the 2024 change.
    expect(screen.getByText('1 of 9 prepared')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Prepare Bless' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'Prepare Cure Wounds' }))
    await waitFor(() => expect(lastPatch().preparedSpellIndexes).toEqual(['bless', 'cure-wounds']))
  })

  it('holds a wizard to the spellbook: known spells with prepared toggles', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)
    await show('Spells')

    // The book is the two known spells, not the whole wizard list.
    expect(screen.getByRole('checkbox', { name: 'Prepare Fireball' })).toBeInTheDocument()
    expect(screen.getByText(/Your spellbook/)).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Prepare Fireball' }))
    await waitFor(() => expect(lastPatch().preparedSpellIndexes).toEqual(['fireball']))
  })

  it('warns, without blocking, when more is prepared than the limit allows', async () => {
    render(
      <CharacterSheet
        character={{
          ...CHARACTER,
          classIndex: 'paladin',
          level: 1,
          knownSpellIndexes: [],
          preparedSpellIndexes: ['bless', 'cure-wounds', 'command'],
        }}
      />,
    )
    await show('Spells')

    // A level 1 paladin prepares two.
    expect(screen.getByText('3 of 2 prepared')).toBeInTheDocument()
    expect(screen.getByText(/More prepared than your usual limit/)).toBeInTheDocument()
  })

  it('leaves a class with no spellcasting exactly as before: no toggles anywhere', async () => {
    // Every 2024 caster prepares, so the untouched card is now the one a
    // fighter carrying a wand gets.
    render(
      <CharacterSheet
        character={{ ...CHARACTER, classIndex: 'fighter', knownSpellIndexes: ['fireball'] }}
      />,
    )
    await show('Spells')

    expect(screen.getByRole('button', { name: 'Fireball' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Prepare/ })).not.toBeInTheDocument()
  })
})

describe('inventory and currency (DND-035)', () => {
  it('equips an item optimistically and PATCHes the item route', async () => {
    const user = userEvent.setup()
    const sword = item({ equipped: false })
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ item: { ...sword, equipped: true } }),
    } as Response)

    render(<CharacterSheet character={CHARACTER} items={[sword]} />)
    await show('Gear')

    await user.click(screen.getByRole('button', { name: 'Longsword equipped' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER.id}/items/${sword.id}`)
    expect((init as RequestInit).method).toBe('PATCH')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ equipped: true })
  })

  it('reverts an attunement the server refused and repeats its words', async () => {
    const user = userEvent.setup()
    const sword = item()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Only 3 items can be attuned at once — unattune one first',
      }),
    } as Response)

    render(<CharacterSheet character={CHARACTER} items={[sword]} />)
    await show('Gear')

    await user.click(screen.getByRole('button', { name: 'Longsword attuned' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(mockToastError.mock.calls[0][0]).toMatch(/unattune one first/)
    // The optimistic toggle came back off.
    expect(screen.getByRole('button', { name: 'Longsword attuned' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('counts attunement against the cap in the header', async () => {
    render(
      <CharacterSheet
        character={CHARACTER}
        items={[
          item({ attuned: true }),
          item({
            id: 'a1b2c3d4-0000-4000-8000-000000000002',
            equipmentIndex: null,
            customName: 'Cloak of Protection',
            attuned: true,
          }),
        ]}
      />,
    )
    await show('Gear')

    expect(screen.getByText('2/3 attuned')).toBeInTheDocument()
  })

  it('commits a typed coin amount on blur through the combat pipeline', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)
    await show('Gear')

    const gold = screen.getByLabelText('gp')
    await user.clear(gold)
    await user.type(gold, '25')
    await user.tab()

    await waitFor(() => expect(lastPatch().gp).toBe(25))
  })

  it('derives AC from equipped armour, shield included, and says so', async () => {
    render(
      <CharacterSheet character={CHARACTER} items={[item({ equipmentIndex: 'leather-armor' })]} />,
    )
    await show('Gear')

    // Leather 11 + DEX +2 — the stored AC 12 gives way to the derived 13.
    expect(screen.getByLabelText('Armour class 13, from equipment')).toBeInTheDocument()
  })

  it('leaves the stored AC alone when nothing is equipped', async () => {
    render(<CharacterSheet character={CHARACTER} items={[]} />)
    await show('Gear')

    expect(screen.getByLabelText('Armour class 12, set by hand')).toBeInTheDocument()
  })
})

describe('private notes (DND-058)', () => {
  it('shows the owner their notes card, last in Me', async () => {
    render(<CharacterSheet character={CHARACTER} notes="Owe 50gp to the smith." />)
    await show('Me')

    expect(screen.getByRole('textbox', { name: 'Your notes' })).toHaveValue(
      'Owe 50gp to the smith.',
    )
  })

  it('shows an empty card when the owner has written nothing yet', async () => {
    render(<CharacterSheet character={CHARACTER} notes="" />)
    await show('Me')

    expect(screen.getByRole('textbox', { name: 'Your notes' })).toHaveValue('')
  })

  it('renders no notes card at all for a viewer who is not the owner', async () => {
    // `null` is how the page says "this viewer may not see these" — a DM
    // reading a party member's sheet through the DND-027 viewer predicate. It
    // is distinct from `''`, which is an owner with nothing written.
    render(<CharacterSheet character={CHARACTER} notes={null} />)
    await show('Me')

    expect(screen.queryByRole('textbox', { name: 'Your notes' })).not.toBeInTheDocument()
    expect(screen.queryByText(/your DM cannot read these/i)).not.toBeInTheDocument()
  })

  it('defaults to no card, so a caller that forgets cannot leak them', async () => {
    render(<CharacterSheet character={CHARACTER} />)
    await show('Me')

    expect(screen.queryByRole('textbox', { name: 'Your notes' })).not.toBeInTheDocument()
  })
})

describe('the four segments (apple-redesign/sheet-segments)', () => {
  it('lands on Play, holding what a turn touches and nothing else', () => {
    render(<CharacterSheet character={CHARACTER} />)

    expect(screen.getByRole('tab', { name: 'Play' })).toHaveAttribute('aria-selected', 'true')

    // Play, in turn-frequency order (DND-023).
    const titles = screen
      .getAllByText(/.*/, { selector: '[data-slot="card-title"]' })
      .map((title) => title.textContent)
    expect(titles).toEqual([
      'Hit points',
      'Attacks',
      'Concentration',
      'Heroic Inspiration',
      'Rests',
      'Class resources',
      'Conditions',
    ])
  })

  it('keeps the rest of the sheet one tap away', async () => {
    render(<CharacterSheet character={CHARACTER} items={[item()]} notes="" />)

    await show('Spells')
    expect(cardTitle('Spell slots')).toBeVisible()
    expect(cardTitle('Spells')).toBeVisible()

    await show('Gear')
    expect(screen.getByLabelText('Armour class 12, set by hand')).toBeInTheDocument()
    expect(cardTitle('Inventory')).toBeVisible()

    await show('Me')
    expect(cardTitle('Ability scores')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Your notes' })).toBeInTheDocument()

    // Only the open segment is mounted — Play's cards are gone, not hidden.
    expect(screen.queryByLabelText('Take 5 damage')).not.toBeInTheDocument()
  })

  it('marks Play from anywhere when the character is down', async () => {
    render(<CharacterSheet character={{ ...CHARACTER, currentHitPoints: 0 }} />)

    await show('Gear')

    // The death saves card is in Play and nowhere else, so the segment has to
    // say so from a screen that cannot show it.
    expect(screen.getByRole('tab', { name: /^Play at 0 hit points$/ })).toBeInTheDocument()

    await show('Play')
    expect(cardTitle('Death saves')).toBeVisible()
  })

  it('keeps the combat state above the control, so a switch loses nothing', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    await show('Me')
    await show('Play')

    // The optimistic 27 survives the round trip, and no second write went out:
    // `useCombatState` lives above the segments, not inside one of them.
    expect(screen.getByLabelText('27 of 32 hit points')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('takes a DM edit from the poll while the player is in another segment (D25)', async () => {
    jest.useFakeTimers()

    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      // The poll is a bare GET; the writes still echo their patch back.
      mockFetch.mockImplementation(async (_url, init) => {
        if (!init) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ character: { ...CHARACTER, currentHitPoints: 11, version: 7 } }),
          } as Response
        }

        const { version, ...patch } = JSON.parse(String((init as RequestInit).body))
        return {
          ok: true,
          status: 200,
          json: async () => ({
            character: { ...CHARACTER, ...patch, version: (version ?? 0) + 1 },
          }),
        } as Response
      })

      render(<CharacterSheet character={CHARACTER} />)

      await user.click(screen.getByRole('tab', { name: 'Gear' }))

      await act(async () => {
        jest.advanceTimersByTime(15_000)
      })

      await user.click(screen.getByRole('tab', { name: 'Play' }))

      // The DM's write landed on a sheet showing the inventory, and the sheet
      // was already holding it by the time the player swiped back.
      expect(screen.getByLabelText('11 of 32 hit points')).toBeInTheDocument()
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('beginner mode', () => {
  it('folds typed temp HP away until the character has some', async () => {
    const { unmount } = render(<CharacterSheet character={CHARACTER} />)

    expect(screen.queryByRole('button', { name: 'Set temp HP' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add a temporary hit point' }),
    ).not.toBeInTheDocument()

    unmount()
    render(<CharacterSheet character={{ ...CHARACTER, temporaryHitPoints: 3 }} />)

    // Relevant now, so it is simply open — no toggle to find mid-combat.
    expect(screen.getByRole('button', { name: 'Set temp HP' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Temporary HP/ })).not.toBeInTheDocument()
  })

  it('steps the temporary hit points an open fold is showing', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, temporaryHitPoints: 3 }} />)

    await user.click(screen.getByRole('button', { name: 'Add a temporary hit point' }))
    await waitFor(() => expect(lastPatch().temporaryHitPoints).toBe(4))

    await user.click(screen.getByRole('button', { name: 'Remove a temporary hit point' }))
    await waitFor(() => expect(lastPatch().temporaryHitPoints).toBe(3))
  })

  it('folds exhaustion away until there is a level of it', () => {
    const { unmount } = render(<CharacterSheet character={CHARACTER} />)

    expect(
      screen.queryByRole('button', { name: 'Increase exhaustion one level' }),
    ).not.toBeInTheDocument()

    unmount()
    render(<CharacterSheet character={{ ...CHARACTER, exhaustion: 1 }} />)

    expect(
      screen.getByRole('button', { name: 'Increase exhaustion one level' }),
    ).toBeInTheDocument()
  })

  it('folds hit dice away until a short rest has spent some', () => {
    const { unmount } = render(<CharacterSheet character={CHARACTER} />)

    expect(screen.queryByText('5 of 5')).not.toBeInTheDocument()

    unmount()
    render(<CharacterSheet character={{ ...CHARACTER, hitDiceUsed: 2 }} />)

    expect(screen.getByText('3 of 5')).toBeInTheDocument()
  })

  it('opens a fold on request, so it is a default and not a cage', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    // The player the DM has just handed a level of exhaustion needs to set it
    // from zero, which is exactly when the fold says nothing is happening.
    await user.click(screen.getByRole('button', { name: /^Exhaustion/ }))
    await user.click(screen.getByRole('button', { name: 'Increase exhaustion one level' }))

    await waitFor(() => expect(lastPatch().exhaustion).toBe(1))
  })
})

describe('the 2024 origin block (srd-2024-migration/character-model-migration)', () => {
  it('shows what the row holds, in Me', async () => {
    render(
      <CharacterSheet
        character={{
          ...CHARACTER,
          classIndex: 'fighter',
          backgroundIndex: 'soldier',
          backgroundAbilitySpread: 'two-and-one',
          backgroundAbilities: ['strength', 'constitution'],
          originFeatIndex: 'savage-attacker',
          subclassIndex: 'champion',
          masteredWeaponIndexes: ['greataxe'],
          featChoices: [
            { level: 4, featIndex: 'ability-score-improvement', increases: { strength: 2 } },
            { level: 6, featIndex: 'grappler' },
          ],
        }}
      />,
    )

    await show('Me')

    expect(cardTitle('Origin')).toBeVisible()
    expect(screen.getByText('Soldier')).toBeInTheDocument()
    expect(screen.getByText('+2 Strength, +1 Constitution')).toBeInTheDocument()
    expect(screen.getByText('Savage Attacker')).toBeInTheDocument()
    expect(screen.getByText('Champion')).toBeInTheDocument()
    // The weapon, and the mastery property it is what brings.
    expect(screen.getByText('Greataxe (Cleave)')).toBeInTheDocument()
    // The level planner's ledger, read back — a Fighter's extra 6th-level feat
    // among them (`srd-2024-migration/asi-and-feats`).
    expect(
      screen.getByText('Ability Score Improvement (level 4), Grappler (level 6)'),
    ).toBeInTheDocument()
  })

  it('says so rather than shrinking when a character predates the columns', async () => {
    render(<CharacterSheet character={CHARACTER} />)

    await show('Me')

    // Six rows, six gaps — the gap is the thing worth seeing.
    expect(screen.getAllByText('Not recorded')).toHaveLength(6)
  })

  it('holds and spends heroic inspiration from Play', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    const grant = screen.getByRole('button', { name: 'You have it' })
    expect(grant).toHaveAttribute('aria-pressed', 'false')

    await user.click(grant)

    const spend = await screen.findByRole('button', { name: 'Spend it' })
    expect(spend).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const [, init] = (global.fetch as jest.Mock).mock.calls.at(-1)
    expect(JSON.parse(init.body)).toMatchObject({ heroicInspiration: true })
  })
})

describe('glossary terms on the sheet (learn-to-play/glossary-popovers)', () => {
  it('makes the vitals abbreviations tappable, since "AC" decodes to nothing', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await show('Gear')
    await user.click(screen.getByRole('button', { name: 'What is Armour Class (AC)?' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Armour Class (AC)')
    expect(dialog).toHaveTextContent(/an attack roll has to reach/i)
  })

  it('keeps the card titles readable as titles while making them tappable', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    expect(cardTitle('Hit points')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'What is Hit points?' }))

    expect(screen.getByRole('dialog')).toHaveTextContent(/knocks you unconscious/i)
  })

  it('wires the terms a first sheet stumbles on, across every segment', async () => {
    render(<CharacterSheet character={CHARACTER} />)

    const wired = () =>
      Array.from(document.querySelectorAll('[data-glossary-term]')).map((element) =>
        element.getAttribute('data-glossary-term'),
      )

    expect(wired()).toEqual(
      expect.arrayContaining(['hit-points', 'attack-roll', 'concentration', 'condition']),
    )

    await show('Spells')
    expect(wired()).toEqual(expect.arrayContaining(['spell-slot', 'prepared-spell']))

    await show('Gear')
    expect(wired()).toEqual(
      expect.arrayContaining(['armour-class', 'initiative', 'speed', 'proficiency-bonus']),
    )

    await show('Me')
    expect(wired()).toEqual(
      expect.arrayContaining(['ability-score', 'saving-throw', 'skill', 'experience-points']),
    )
  })
})
