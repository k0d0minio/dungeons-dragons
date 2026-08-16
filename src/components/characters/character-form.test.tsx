import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character } from '@/lib/db/characters'

import { CharacterForm } from './character-form'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

jest.mock('@/lib/dnd-api/swr-hooks', () => ({
  useClasses: jest.fn(),
  useRaces: jest.fn(),
  useClassSpells: jest.fn(),
}))

import { useClassSpells, useClasses, useRaces } from '@/lib/dnd-api/swr-hooks'

const mockUseClasses = useClasses as jest.MockedFunction<typeof useClasses>
const mockUseRaces = useRaces as jest.MockedFunction<typeof useRaces>
const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>

const CLASSES = [
  { index: 'fighter', name: 'Fighter', url: '/api/classes/fighter' },
  { index: 'wizard', name: 'Wizard', url: '/api/classes/wizard' },
]

const RACES = [
  { index: 'half-elf', name: 'Half-Elf', url: '/api/races/half-elf' },
  { index: 'human', name: 'Human', url: '/api/races/human' },
]

const WIZARD_SPELLS = [
  { index: 'fireball', name: 'Fireball', url: '/api/spells/fireball', level: 3 },
  { index: 'mage-hand', name: 'Mage Hand', url: '/api/spells/mage-hand', level: 0 },
]

// Radix's Select drives itself with pointer capture and scrolls the highlighted
// option into view — neither of which jsdom implements.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  mockUseClasses.mockReturnValue({
    classes: CLASSES,
    count: CLASSES.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useClasses>)

  mockUseRaces.mockReturnValue({
    races: RACES,
    count: RACES.length,
    isLoading: false,
    error: undefined,
    mutate: jest.fn(),
  } as unknown as ReturnType<typeof useRaces>)

  mockUseClassSpells.mockImplementation(
    (classIndex) =>
      ({
        spells: classIndex === 'wizard' ? WIZARD_SPELLS : [],
        count: classIndex === 'wizard' ? WIZARD_SPELLS.length : 0,
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      }) as unknown as ReturnType<typeof useClassSpells>,
  )
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ character: { id: 'c1' } }),
  })
})

/**
 * Pick an option out of a shadcn/Radix select.
 *
 * Addressed by position rather than by accessible name: the two selects sit in
 * a fixed order (class, then species), and pinning the test to Radix's internal
 * labelling would make it a test of Radix.
 */
async function chooseFromSelect(
  user: ReturnType<typeof userEvent.setup>,
  position: number,
  optionName: string,
) {
  await user.click(screen.getAllByRole('combobox')[position])
  await user.click(await screen.findByRole('option', { name: optionName }))
}

const CLASS_SELECT = 0
const SPECIES_SELECT = 1

/** Replace a number field's contents — every one of them starts pre-filled. */
async function setNumber(user: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const field = screen.getByLabelText(label)
  await user.clear(field)
  await user.type(field, value)
}

describe('CharacterForm', () => {
  it('offers the reference API’s classes and species, not hand-typed strings', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await user.click(screen.getAllByRole('combobox')[CLASS_SELECT])

    expect(await screen.findByRole('option', { name: 'Wizard' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Fighter' })).toBeInTheDocument()
  })

  it('refuses to submit a character with nothing filled in', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await user.click(screen.getByRole('button', { name: /create character/i }))

    expect(await screen.findByText('Give your character a name')).toBeInTheDocument()
    expect(screen.getByText('Pick a class')).toBeInTheDocument()
    expect(screen.getByText('Pick a species')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refuses a level outside 1–20', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await setNumber(user, 'Level', '21')
    await user.click(screen.getByRole('button', { name: /create character/i }))

    expect(
      await screen.findByText('Level must be a whole number between 1 and 20'),
    ).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('shows the live ability modifier as the score is typed', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await setNumber(user, 'INT', '18')

    expect(await screen.findByText('Intelligence · +4')).toBeInTheDocument()
  })

  it('posts the filled-in character and returns to the list', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), '  Vex Ashbrand  ')
    await chooseFromSelect(user, CLASS_SELECT, 'Wizard')
    await chooseFromSelect(user, SPECIES_SELECT, 'Half-Elf')
    await setNumber(user, 'Level', '5')
    await setNumber(user, 'INT', '18')
    await setNumber(user, 'Max HP', '32')
    await setNumber(user, 'AC', '12')

    await user.click(await screen.findByRole('checkbox', { name: 'Fireball' }))
    await user.click(screen.getByRole('button', { name: /create character/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('/api/characters')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      // Trimmed by the schema before it ever reaches the wire.
      name: 'Vex Ashbrand',
      classIndex: 'wizard',
      speciesIndex: 'half-elf',
      level: 5,
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 18,
      wisdom: 10,
      charisma: 10,
      maxHitPoints: 32,
      armorClass: 12,
      speed: 30,
      knownSpellIndexes: ['fireball'],
    })

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/characters'))
    // Without this the list page would serve the copy it rendered before the save.
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('drops spells that no longer belong to the chosen class', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Wizard')
    await user.click(await screen.findByRole('checkbox', { name: 'Fireball' }))
    expect(screen.getByText('1 spell')).toBeInTheDocument()

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    expect(await screen.findByText(/no spells in the reference data/i)).toBeInTheDocument()
    expect(screen.getByText('0 spells')).toBeInTheDocument()

    // Back to the wizard: the earlier pick is gone rather than lurking in state.
    await chooseFromSelect(user, CLASS_SELECT, 'Wizard')
    expect(await screen.findByRole('checkbox', { name: 'Fireball' })).not.toBeChecked()
  })

  it('opens blank, so nothing is pre-filled with someone else’s build', () => {
    render(<CharacterForm />)

    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByRole('button', { name: /create character/i })).toBeInTheDocument()
  })

  it('surfaces a save that the server rejected', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Database is not configured.' }),
    })

    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), 'Vex Ashbrand')
    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await chooseFromSelect(user, SPECIES_SELECT, 'Human')
    await user.click(screen.getByRole('button', { name: /create character/i }))

    expect(await screen.findByText('Database is not configured.')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})

const EXISTING: Character = {
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
  currentHitPoints: 24,
  temporaryHitPoints: 0,
  armorClass: 12,
  speed: 30,
  spellSlots: {},
  conditions: [],
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  knownSpellIndexes: ['fireball'],
  preparedSpellIndexes: [],
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
}

describe('CharacterForm, editing an existing character (DND-018)', () => {
  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ character: EXISTING }),
    })
  })

  it('opens on the stored build rather than on defaults', () => {
    render(<CharacterForm character={EXISTING} />)

    expect(screen.getByLabelText('Name')).toHaveValue('Vex Ashbrand')
    expect(screen.getByLabelText('Level')).toHaveValue(5)
    expect(screen.getByLabelText('INT')).toHaveValue(18)
    expect(screen.getByLabelText('Max HP')).toHaveValue(32)
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('patches the character and returns to its sheet', async () => {
    const user = userEvent.setup()
    render(<CharacterForm character={EXISTING} />)

    // The typo this whole ticket exists for: an ability score entered wrong.
    await setNumber(user, 'INT', '17')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`/api/characters/${EXISTING.id}`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Vex Ashbrand',
      classIndex: 'wizard',
      speciesIndex: 'half-elf',
      level: 5,
      strength: 8,
      dexterity: 14,
      constitution: 14,
      intelligence: 17,
      wisdom: 12,
      charisma: 10,
      maxHitPoints: 32,
      armorClass: 12,
      speed: 30,
      knownSpellIndexes: ['fireball'],
    })

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/characters/${EXISTING.id}`))
    // Without this the sheet would come back rendering the pre-edit numbers.
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('lets the level be changed as a plain number', async () => {
    const user = userEvent.setup()
    render(<CharacterForm character={EXISTING} />)

    await setNumber(user, 'Level', '6')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)

    // Nothing is recomputed from it here — the guided level-up is DND-032.
    expect(body.level).toBe(6)
    expect(body.maxHitPoints).toBe(32)
  })

  it('holds an edit to the same rules creation is held to', async () => {
    const user = userEvent.setup()
    render(<CharacterForm character={EXISTING} />)

    await user.clear(screen.getByLabelText('Name'))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Give your character a name')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('keeps the player on the form when the save is refused', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No such character' }),
    })

    render(<CharacterForm character={EXISTING} />)

    await setNumber(user, 'AC', '15')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('No such character')).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
