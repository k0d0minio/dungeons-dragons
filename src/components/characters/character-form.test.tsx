import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

  mockUseClassSpells.mockImplementation((classIndex) =>
    ({
      spells: classIndex === 'wizard' ? WIZARD_SPELLS : [],
      count: classIndex === 'wizard' ? WIZARD_SPELLS.length : 0,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    }) as unknown as ReturnType<typeof useClassSpells>
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
  optionName: string
) {
  await user.click(screen.getAllByRole('combobox')[position])
  await user.click(await screen.findByRole('option', { name: optionName }))
}

const CLASS_SELECT = 0
const SPECIES_SELECT = 1

/** Replace a number field's contents — every one of them starts pre-filled. */
async function setNumber(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string
) {
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
      await screen.findByText('Level must be a whole number between 1 and 20')
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
