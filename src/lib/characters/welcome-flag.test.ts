import { CHARACTER_WELCOME_KEY, claimCharacterWelcome, markCharacterWelcome } from './welcome-flag'

// The flag's whole contract (`triage/creation-completion-learn-link`): the
// wizard leaves one note, exactly one sheet render may claim it, and every
// other question about every other character answers no.

const store = window.localStorage as jest.Mocked<Storage>

const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'
const OTHER_ID = '00000000-0000-4000-8000-000000000001'

/** The mock store is a set of `jest.fn`s; make it remember for one test. */
function storing(): void {
  const values = new Map<string, string>()

  store.getItem.mockImplementation((key) => values.get(key) ?? null)
  store.setItem.mockImplementation((key, value) => {
    values.set(key, value)
  })
  store.removeItem.mockImplementation((key) => {
    values.delete(key)
  })
}

beforeEach(() => {
  store.getItem.mockReturnValue(null)
})

describe('the note the wizard leaves', () => {
  it('is written under the versioned key', () => {
    markCharacterWelcome(CHARACTER_ID)

    expect(store.setItem).toHaveBeenCalledWith(CHARACTER_WELCOME_KEY, CHARACTER_ID)
  })

  it('is claimed by the character it names', () => {
    storing()
    markCharacterWelcome(CHARACTER_ID)

    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(true)
  })

  it('is claimed once and never again — a reload does not bring the band back', () => {
    storing()
    markCharacterWelcome(CHARACTER_ID)

    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(true)
    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(false)
  })

  it('holds one character at a time — the second build is the one being opened', () => {
    storing()
    markCharacterWelcome(CHARACTER_ID)
    markCharacterWelcome(OTHER_ID)

    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(false)
    expect(claimCharacterWelcome(OTHER_ID)).toBe(true)
  })

  // A DM may open a party member's sheet between making their own character and
  // looking at it; that must not spend the note they left for themselves.
  it('survives a sheet it does not name being opened first', () => {
    storing()
    markCharacterWelcome(CHARACTER_ID)

    expect(claimCharacterWelcome(OTHER_ID)).toBe(false)
    expect(store.removeItem).not.toHaveBeenCalled()
    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(true)
  })
})

// Nothing here is load-bearing: a browser that will not store anything costs
// the player one line about `/learn`, never the character or the sheet.
describe('when the browser will not store anything', () => {
  it('says no rather than throwing on a refused read', () => {
    store.getItem.mockImplementation(() => {
      throw new Error('denied')
    })

    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(false)
  })

  it('leaves no note rather than throwing on a refused write', () => {
    store.setItem.mockImplementation(() => {
      throw new Error('quota')
    })

    expect(() => markCharacterWelcome(CHARACTER_ID)).not.toThrow()
  })

  it('still claims when the removal itself is refused', () => {
    store.getItem.mockReturnValue(CHARACTER_ID)
    store.removeItem.mockImplementation(() => {
      throw new Error('denied')
    })

    expect(claimCharacterWelcome(CHARACTER_ID)).toBe(true)
  })
})
