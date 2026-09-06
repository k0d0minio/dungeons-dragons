import {
  appendNoteSchema,
  characterNotesSchema,
  createNoteSchema,
  formatSessionDate,
  formatSessionDateLong,
  isSessionDate,
  MAX_NOTE_LENGTH,
  MAX_QUICK_NOTE_LENGTH,
  patchNoteSchema,
  todaySessionDate,
} from './schema'

describe('isSessionDate', () => {
  it('accepts a calendar date', () => {
    expect(isSessionDate('2026-08-15')).toBe(true)
    expect(isSessionDate('2024-02-29')).toBe(true)
  })

  it('rejects a date-shaped string that is not a day', () => {
    // The pattern alone would take all three; the round trip is what refuses
    // them, and a Postgres `date` column would raise on every one.
    expect(isSessionDate('2026-02-30')).toBe(false)
    expect(isSessionDate('2026-13-01')).toBe(false)
    expect(isSessionDate('2025-02-29')).toBe(false)
  })

  it('rejects anything that is not the one shape a date column is handed', () => {
    expect(isSessionDate('15/08/2026')).toBe(false)
    expect(isSessionDate('2026-8-15')).toBe(false)
    expect(isSessionDate('2026-08-15T20:00:00Z')).toBe(false)
    expect(isSessionDate('')).toBe(false)
  })
})

describe('todaySessionDate', () => {
  it('is a valid session date', () => {
    expect(isSessionDate(todaySessionDate())).toBe(true)
  })

  it('is UTC, the same clock the database decides "tonight" with', () => {
    expect(todaySessionDate()).toBe(new Date().toISOString().slice(0, 10))
  })
})

describe('formatSessionDate', () => {
  it('reads as a date a human would say at a table', () => {
    expect(formatSessionDate('2026-08-15')).toBe('Sat, 15 Aug 2026')
  })

  it('does not shift the day, whatever the reader’s timezone', () => {
    // Formatted in UTC on purpose: parsed as local time, a date-only string
    // renders as the day before for anyone west of Greenwich.
    expect(formatSessionDate('2026-01-01')).toContain('1 Jan 2026')
  })

  it('passes anything unparseable straight through rather than inventing a date', () => {
    expect(formatSessionDate('not a date')).toBe('not a date')
  })
})

// The announced form (`first-table/announce-the-night`): the date is the whole
// message, so it is spelled out and carries no year.
describe('formatSessionDateLong', () => {
  it('reads as the night is announced — weekday and month in full', () => {
    expect(formatSessionDateLong('2026-09-10')).toBe('Thursday 10 September')
  })

  it('does not shift the day, whatever the reader’s timezone', () => {
    expect(formatSessionDateLong('2026-01-01')).toBe('Thursday 1 January')
  })

  it('passes anything unparseable straight through rather than inventing a date', () => {
    expect(formatSessionDateLong('not a date')).toBe('not a date')
  })
})

describe('createNoteSchema', () => {
  it('trims the body and takes an optional date', () => {
    const parsed = createNoteSchema.safeParse({ body: '  They met a dragon.  ' })

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.body).toBe('They met a dragon.')
    expect(parsed.success && parsed.data.sessionDate).toBeUndefined()
  })

  it('refuses a blank body — the CHECK constraint would refuse it anyway', () => {
    expect(createNoteSchema.safeParse({ body: '   ' }).success).toBe(false)
  })

  it('refuses a body past the limit, and a date that is not one', () => {
    expect(createNoteSchema.safeParse({ body: 'x'.repeat(MAX_NOTE_LENGTH + 1) }).success).toBe(
      false,
    )
    expect(createNoteSchema.safeParse({ body: 'ok', sessionDate: '2026-02-30' }).success).toBe(
      false,
    )
  })
})

describe('patchNoteSchema', () => {
  it('takes any one field on its own', () => {
    expect(patchNoteSchema.safeParse({ sharedWithPlayers: true }).success).toBe(true)
    expect(patchNoteSchema.safeParse({ body: 'edited' }).success).toBe(true)
  })

  it('refuses an empty patch rather than bumping updated_at for nothing', () => {
    expect(patchNoteSchema.safeParse({}).success).toBe(false)
  })
})

describe('appendNoteSchema', () => {
  it('takes a trimmed line', () => {
    const parsed = appendNoteSchema.safeParse({ text: '  Innkeeper is Bram  ' })

    expect(parsed.success && parsed.data.text).toBe('Innkeeper is Bram')
  })

  it('is capped shorter than a written-up note — it is a thumb-typed line', () => {
    expect(MAX_QUICK_NOTE_LENGTH).toBeLessThan(MAX_NOTE_LENGTH)
    expect(
      appendNoteSchema.safeParse({ text: 'x'.repeat(MAX_QUICK_NOTE_LENGTH + 1) }).success,
    ).toBe(false)
  })

  it('refuses a blank line', () => {
    expect(appendNoteSchema.safeParse({ text: '  ' }).success).toBe(false)
  })
})

describe('characterNotesSchema', () => {
  it('accepts an empty body — clearing your notes is a legitimate save', () => {
    expect(characterNotesSchema.safeParse({ body: '' }).success).toBe(true)
  })

  it('does not trim: a player’s own layout is theirs to keep', () => {
    const parsed = characterNotesSchema.safeParse({ body: '  - owe 50gp\n  - ask the mayor' })

    expect(parsed.success && parsed.data.body).toBe('  - owe 50gp\n  - ask the mayor')
  })

  it('still refuses more than the column is meant to hold', () => {
    expect(characterNotesSchema.safeParse({ body: 'x'.repeat(MAX_NOTE_LENGTH + 1) }).success).toBe(
      false,
    )
  })
})
