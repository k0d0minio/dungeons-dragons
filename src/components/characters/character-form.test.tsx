import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Character } from '@/lib/db/characters'

import { CharacterForm } from './character-form'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

// Only the spell list is fetched. The class and species pickers read the local
// SRD data straight, so the options this form offers are the real twelve
// classes and nine species — half-elf among them no longer, which is the point.
jest.mock('@/lib/srd/hooks', () => ({
  ...jest.requireActual('@/lib/srd/hooks'),
  useClassSpells: jest.fn(),
}))

import { useClassSpells } from '@/lib/srd/hooks'

const mockUseClassSpells = useClassSpells as jest.MockedFunction<typeof useClassSpells>

const WIZARD_SPELLS = [
  { index: 'fireball', name: 'Fireball', level: 3 },
  { index: 'mage-hand', name: 'Mage Hand', level: 0 },
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

/**
 * Pick an option out of a select addressed by its label.
 *
 * The 2024 origin fields come and go with what has been chosen — the spread
 * appears once a background is set, the two ability selects once the spread is
 * `+2 and +1` — so their positions are not fixed and the label is the only
 * stable handle. Each one is a `<Label htmlFor>` over the trigger, which is
 * this app's markup rather than Radix's.
 */
async function chooseByLabel(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  optionName: string,
) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: optionName }))
}

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
    // Half-Elf left the SRD with the 2024 revision; the picker offers the nine
    // species 5.2.1 publishes.
    await chooseFromSelect(user, SPECIES_SELECT, 'Tiefling')
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
      speciesIndex: 'tiefling',
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
      skillProficiencies: [],
      skillExpertise: [],
      // The 2024 origin block, untouched: `null` is what an unanswered one of
      // these is, all the way from the field to the column.
      backgroundIndex: null,
      backgroundAbilitySpread: null,
      backgroundAbilities: null,
      originFeatIndex: null,
      subclassIndex: null,
      masteredWeaponIndexes: null,
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

  it('turns a 5xx refusal into a sentence rather than echoing the server', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'The database is not connected.' }),
    })

    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), 'Vex Ashbrand')
    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await chooseFromSelect(user, SPECIES_SELECT, 'Human')
    await user.click(screen.getByRole('button', { name: /create character/i }))

    expect(
      await screen.findByText('Could not save the character. Try again in a moment.'),
    ).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('tells a signed-out player they were signed out, not "Unauthorized"', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    })

    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), 'Vex Ashbrand')
    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await chooseFromSelect(user, SPECIES_SELECT, 'Human')
    await user.click(screen.getByRole('button', { name: /create character/i }))

    expect(
      await screen.findByText('You have been signed out. Sign in again to save this character.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized')).not.toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('CharacterForm skill proficiencies (DND-015, D21)', () => {
  it('asks for a class before offering skills', () => {
    render(<CharacterForm />)

    expect(
      screen.getByText(/Pick a class first — it says which skills are yours to choose/),
    ).toBeInTheDocument()
  })

  it('offers the eighteen skills with the class choice count as guidance, not a gate', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')

    expect(await screen.findByText(/Choose 2 — Fighter/)).toBeInTheDocument()

    // A class option is marked; picking beyond the count is not blocked.
    await user.click(screen.getByRole('checkbox', { name: /Athletics/ }))
    await user.click(screen.getByRole('checkbox', { name: /Perception/ }))
    await user.click(screen.getByRole('checkbox', { name: /Arcana/ }))

    expect(screen.getByText(/3 chosen/)).toBeInTheDocument()
  })

  it('sends the picked skills with the submission', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), 'Brom')
    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await chooseFromSelect(user, SPECIES_SELECT, 'Human')
    await user.click(screen.getByRole('checkbox', { name: /Athletics/ }))
    await user.click(screen.getByRole('checkbox', { name: /Perception/ }))

    await user.click(screen.getByRole('button', { name: /create character/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.skillProficiencies).toEqual(['athletics', 'perception'])
    expect(body.skillExpertise).toEqual([])
  })

  it('offers expertise only to a rogue, and only on chosen skills', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await user.click(screen.getByRole('checkbox', { name: /Athletics/ }))
    expect(screen.queryByRole('button', { name: 'Expertise in Athletics' })).not.toBeInTheDocument()

    await chooseFromSelect(user, CLASS_SELECT, 'Rogue')
    expect(screen.getByRole('button', { name: 'Expertise in Athletics' })).toBeInTheDocument()
    // Stealth is not chosen, so there is nothing to double yet.
    expect(screen.queryByRole('button', { name: 'Expertise in Stealth' })).not.toBeInTheDocument()
  })

  it('keeps expertise a subset of proficiencies: unticking one removes the other', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), 'Shade')
    await chooseFromSelect(user, CLASS_SELECT, 'Rogue')
    await chooseFromSelect(user, SPECIES_SELECT, 'Human')

    await user.click(screen.getByRole('checkbox', { name: /Stealth/ }))
    await user.click(screen.getByRole('button', { name: 'Expertise in Stealth' }))
    await user.click(screen.getByRole('checkbox', { name: /Stealth/ }))
    await user.click(screen.getByRole('checkbox', { name: /Deception/ }))

    await user.click(screen.getByRole('button', { name: /create character/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.skillProficiencies).toEqual(['deception'])
    expect(body.skillExpertise).toEqual([])
  })
})

describe('CharacterForm for prepared casters (DND-036, D22)', () => {
  it('replaces the class-list picker with one sentence for a cleric', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Cleric')

    expect(
      screen.getByText(
        'Clerics prepare from the whole class list on the sheet — nothing to pick here.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('searchbox', { name: /search spells/i })).not.toBeInTheDocument()
    // The spell counter goes with the picker — "0 spells" would be a lie.
    expect(screen.queryByText('0 spells')).not.toBeInTheDocument()
  })

  it('keeps the picker for a wizard, relabelled as the spellbook', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Wizard')

    expect(screen.getByText('Spellbook')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Fireball' })).toBeInTheDocument()
  })

  it('leaves a known-caster exactly as before', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')

    expect(screen.getByText('Spells', { selector: '[data-slot="card-title"]' })).toBeInTheDocument()
    expect(screen.getByText(/no spells in the reference data/i)).toBeInTheDocument()
  })
})

const EXISTING: Character = {
  portrait: null,
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
  knownSpellIndexes: ['fireball'],
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
      // The stored index round-trips untouched: this character was rolled as a
      // half-elf, which SRD 5.2.1 no longer publishes. The form does not offer it
      // any more, and does not silently rewrite it either.
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
      skillProficiencies: [],
      skillExpertise: [],
      // Sent as the row holds them — `EXISTING` predates the 2024 columns, so
      // an edit that touches none of them sends back the `null`s it opened on.
      backgroundIndex: null,
      backgroundAbilitySpread: null,
      backgroundAbilities: null,
      originFeatIndex: null,
      subclassIndex: null,
      masteredWeaponIndexes: null,
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

    expect(
      await screen.findByText('This character is no longer there. It may have been deleted.'),
    ).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('CharacterForm — the 2024 origin block', () => {
  it('fills in the origin feat the chosen background grants', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseByLabel(user, 'Background', 'Soldier')

    // The SRD grants each background one Origin feat, so the field answers
    // itself — and stays editable, because a DM may hand out another.
    expect(screen.getByRole('combobox', { name: 'Origin feat' })).toHaveTextContent(
      'Savage Attacker',
    )
    expect(screen.getByText(/Soldier grants Savage Attacker/)).toBeInTheDocument()
  })

  it('asks which abilities the spread is spent on, in order', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    // Nothing to ask until there is a background whose three abilities to ask about.
    expect(screen.queryByRole('combobox', { name: 'Ability score increases' })).toBeNull()

    await chooseByLabel(user, 'Background', 'Soldier')
    await chooseByLabel(user, 'Ability score increases', '+2 and +1')

    await user.click(screen.getByRole('combobox', { name: '+2 to' }))
    // Only the Soldier's own three are offered — Charisma is not one of them.
    expect(await screen.findByRole('option', { name: 'Strength' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Charisma' })).toBeNull()
  })

  it('spends +1 on all three without asking, on the other spread', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseByLabel(user, 'Background', 'Soldier')
    await chooseByLabel(user, 'Ability score increases', '+1 to each')

    expect(screen.queryByRole('combobox', { name: '+2 to' })).toBeNull()
  })

  it('offers weapon mastery only to the classes that have it', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    expect(screen.queryByText('Weapon mastery')).toBeNull()

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    // A 1st-level fighter gets three.
    expect(await screen.findByText('0 of 3 weapons chosen')).toBeInTheDocument()

    await chooseFromSelect(user, CLASS_SELECT, 'Wizard')
    expect(screen.queryByText(/weapons chosen/)).toBeNull()
  })

  it('posts the origin block the player filled in', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await user.type(screen.getByLabelText('Name'), 'Karlach')
    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await chooseFromSelect(user, SPECIES_SELECT, 'Human')
    await chooseByLabel(user, 'Background', 'Soldier')
    await chooseByLabel(user, 'Ability score increases', '+2 and +1')
    await chooseByLabel(user, '+2 to', 'Strength')
    await chooseByLabel(user, '+1 to', 'Constitution')
    await user.click(await screen.findByRole('checkbox', { name: /^Greataxe/ }))

    await user.click(screen.getByRole('button', { name: /create character/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(JSON.parse(init.body)).toMatchObject({
      backgroundIndex: 'soldier',
      backgroundAbilitySpread: 'two-and-one',
      backgroundAbilities: ['strength', 'constitution'],
      originFeatIndex: 'savage-attacker',
      masteredWeaponIndexes: ['greataxe'],
    })
  })

  it('drops a subclass and weapon masteries when the class changes under them', async () => {
    const user = userEvent.setup()
    render(<CharacterForm />)

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    await setNumber(user, 'Level', '5')
    await chooseByLabel(user, 'Subclass', 'Champion')
    await user.click(await screen.findByRole('checkbox', { name: /^Greataxe/ }))
    // Four at 5th level, not the three a 1st-level fighter has.
    expect(screen.getByText('1 of 4 weapons chosen')).toBeInTheDocument()

    // A Champion is a fighter's, and so are their masteries. The wizard has a
    // subclass of their own, so the field stays — emptied, not gone.
    await chooseFromSelect(user, CLASS_SELECT, 'Wizard')
    expect(screen.getByRole('combobox', { name: 'Subclass' })).toHaveTextContent(
      'Choose a subclass',
    )
    expect(screen.queryByText(/weapons chosen/)).toBeNull()

    await chooseFromSelect(user, CLASS_SELECT, 'Fighter')
    expect(await screen.findByText('0 of 4 weapons chosen')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Subclass' })).toHaveTextContent(
      'Choose a subclass',
    )
  })
})
