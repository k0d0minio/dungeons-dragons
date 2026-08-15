import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character } from '@/lib/db/characters'

import { CharacterSheet } from './character-sheet'

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useClasses: jest.fn(),
  useClassSpells: jest.fn(),
  useSpell: jest.fn(),
  useClass: jest.fn(),
  useRace: jest.fn(),
  useEquipmentItem: jest.fn(),
  useMonster: jest.fn(),
}))

import { useClassSpells, useClasses, useSpell } from '@/lib/dnd-api/swr-hooks'

const mockUseClasses = useClasses as jest.MockedFunction<typeof useClasses>
const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>
const mockUseSpell = useSpell as jest.MockedFunction<typeof useSpell>

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
  knownSpellIndexes: ['fireball', 'mage-hand'],
  preparedSpellIndexes: [],
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

/** The route answers with the stored row; echo the patch back over it. */
function respondWithStoredRow(character: Character = CHARACTER) {
  mockFetch.mockImplementation(async (_url, init) => {
    const patch = JSON.parse(String((init as RequestInit).body))

    return {
      ok: true,
      status: 200,
      json: async () => ({ character: { ...character, ...patch } }),
    } as Response
  })
}

function lastPatch() {
  const call = mockFetch.mock.calls.at(-1)
  return JSON.parse(String((call?.[1] as RequestInit).body))
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  respondWithStoredRow()

  mockUseClasses.mockReturnValue({
    classes: [{ index: 'wizard', name: 'Wizard', url: '/api/classes/wizard' }],
    count: 1,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClasses>)

  mockUseClassSpells.mockReturnValue({
    spells: [
      { index: 'fireball', name: 'Fireball', url: '/api/spells/fireball', level: 3 },
      { index: 'mage-hand', name: 'Mage Hand', url: '/api/spells/mage-hand', level: 0 },
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
    mockFetch.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (release = resolve))
    )

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

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not save/i)
    expect(screen.getByLabelText('32 of 32 hit points')).toBeInTheDocument()
  })

  it('says so plainly when the session has expired', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as Response)

    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Take 5 damage' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/signed out/i)
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
      <CharacterSheet
        character={{ ...CHARACTER, currentHitPoints: 0, deathSaveFailures: 2 }}
      />
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

    await user.click(screen.getByRole('button', { name: 'Prone', pressed: false }))

    await waitFor(() => expect(lastPatch().conditions).toEqual(['prone']))
    // The chip is the toggle; the list above it says what being prone costs you.
    expect(screen.getByRole('list', { name: 'Active conditions' })).toHaveTextContent(
      'Melee attacks against you have advantage'
    )

    await user.click(screen.getByRole('button', { name: 'Prone', pressed: true }))
    await waitFor(() => expect(lastPatch().conditions).toEqual([]))
  })
})

describe('spell slots', () => {
  it('offers the standard table when none have been set up', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    expect(screen.getByText(/A level 5 Wizard gets the standard table/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Use the standard slots' }))

    // A level 5 full caster: four 1st, three 2nd, two 3rd.
    await waitFor(() =>
      expect(lastPatch().spellSlots).toEqual({
        '1': { max: 4, used: 0 },
        '2': { max: 3, used: 0 },
        '3': { max: 2, used: 0 },
      })
    )
  })

  it('spends and regains one slot per tap', async () => {
    const user = userEvent.setup()
    const caster = { ...CHARACTER, spellSlots: { '3': { max: 2, used: 0 } } }

    render(<CharacterSheet character={caster} />)

    await user.click(screen.getAllByRole('button', { name: 'Spend a level 3 slot' })[0])
    await waitFor(() => expect(lastPatch().spellSlots['3']).toEqual({ max: 2, used: 1 }))

    await user.click(screen.getByRole('button', { name: 'Regain a level 3 slot' }))
    await waitFor(() => expect(lastPatch().spellSlots['3']).toEqual({ max: 2, used: 0 }))
  })

  it('lets a build the tables do not describe set its own maxima', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={{ ...CHARACTER, classIndex: 'fighter' }} />)

    expect(screen.getByText(/has no spell slots by default/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Set them by hand' }))
    await user.click(screen.getByRole('button', { name: 'One more level 1 slot' }))

    await waitFor(() => expect(lastPatch().spellSlots).toEqual({ '1': { max: 1, used: 0 } }))
  })
})

describe('the read-only half', () => {
  it('computes the derived numbers rather than reading them off the row', () => {
    render(<CharacterSheet character={CHARACTER} />)

    // DEX 14 → +2 initiative; level 5 → +3 proficiency.
    expect(screen.getByLabelText('Initiative +2')).toBeInTheDocument()
    expect(screen.getByLabelText('Proficiency bonus +3')).toBeInTheDocument()

    // A wizard is proficient in Intelligence saves: INT 18 (+4) plus +3.
    expect(screen.getByLabelText('Intelligence saving throw +7, proficient')).toBeInTheDocument()
    // Strength is not a wizard save: STR 8 → −1, unchanged by proficiency.
    expect(screen.getByLabelText('Strength saving throw -1')).toBeInTheDocument()
  })

  it('shows skills at their ability modifier, without inventing proficiency', () => {
    render(<CharacterSheet character={CHARACTER} />)

    // Arcana is a wizard class skill, but which skills were actually chosen is
    // not stored — so the bonus stays INT +4 rather than a guessed +7.
    expect(screen.getByLabelText('Arcana +4, a class skill')).toBeInTheDocument()
    expect(screen.getByLabelText('Athletics -1')).toBeInTheDocument()
  })

  it('opens the DND-003 spell detail when a spell is tapped', async () => {
    const user = userEvent.setup()
    render(<CharacterSheet character={CHARACTER} />)

    await user.click(screen.getByRole('button', { name: 'Fireball' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Fireball')).toBeInTheDocument()
    expect(within(dialog).getByText('Spell')).toBeInTheDocument()
  })

  it('points a spell-less character at the edit form rather than at a dead end', () => {
    render(<CharacterSheet character={{ ...CHARACTER, knownSpellIndexes: [] }} />)

    expect(screen.getByRole('link', { name: 'Edit the character' })).toHaveAttribute(
      'href',
      `/characters/${CHARACTER.id}/edit`
    )
  })

  it('falls back to the stored index when the reference list has not loaded', () => {
    mockUseClassSpells.mockReturnValue({
      spells: [],
      count: 0,
      isLoading: false,
      error: new Error('offline'),
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useClassSpells>)

    render(<CharacterSheet character={CHARACTER} />)

    expect(screen.getByRole('button', { name: 'Mage-Hand' })).toBeInTheDocument()
  })
})
