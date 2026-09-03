import { getTableColumns } from 'drizzle-orm'

import { campaignLocations } from '@/lib/db/schema'

import {
  createLocationSchema,
  LOCATION_FIELDS,
  LOCATION_PUBLIC_FIELDS,
  LOCATION_SECRET_FIELDS,
  patchLocationSchema,
} from './schema'

// The same three properties `src/lib/npcs/schema.test.ts` holds, against the
// second revealable entity: the two lists together account for every editable
// column, they do not overlap, and the secret list is exactly what a
// player-facing read may not select.

/** Columns that are not prep the DM types: identity, ownership, reveal, clocks. */
const NON_FIELD_COLUMNS = ['id', 'campaignId', 'revealedAt', 'createdAt', 'updatedAt', 'name']

describe('the field lists', () => {
  it('account for every editable column on the table, and invent none', () => {
    const editable = Object.keys(getTableColumns(campaignLocations))
      .filter((column) => !NON_FIELD_COLUMNS.includes(column))
      .sort()

    expect(LOCATION_FIELDS.map((field) => field.key).sort()).toEqual(editable)
  })

  it('do not overlap — a field is public or it is the DM’s, never both', () => {
    const publicKeys = LOCATION_PUBLIC_FIELDS.map((field) => field.key)
    const secretKeys = LOCATION_SECRET_FIELDS.map((field) => field.key)

    expect(publicKeys.filter((key) => secretKeys.includes(key))).toEqual([])
  })

  it('keeps the secret layer as the ticket names it (D38)', () => {
    expect(LOCATION_SECRET_FIELDS.map((field) => field.key)).toEqual(['secrets', 'dmNotes'])
  })

  it('gives every field a label and a hint, so nothing renders bare', () => {
    for (const field of LOCATION_FIELDS) {
      expect(field.label.length).toBeGreaterThan(0)
      expect(field.hint.length).toBeGreaterThan(0)
      expect(['line', 'text']).toContain(field.kind)
    }
  })
})

describe('createLocationSchema', () => {
  it('takes a name on its own — a name and nothing else is prep', () => {
    const parsed = createLocationSchema.safeParse({ name: 'Kelp Harbour' })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.name).toBe('Kelp Harbour')
  })

  it('trims the name and refuses a blank one', () => {
    expect(createLocationSchema.safeParse({ name: '  Kelp Harbour  ' }).data?.name).toBe(
      'Kelp Harbour',
    )

    const blank = createLocationSchema.safeParse({ name: '   ' })
    expect(blank.success).toBe(false)
    expect(blank.error?.issues[0]?.message).toBe('Give the place a name')
  })

  it('says what is missing when there is no name at all', () => {
    const parsed = createLocationSchema.safeParse({ summary: 'The docks' })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe('Give the place a name')
  })

  it('collapses a blank field to null, so cleared and never-filled agree', () => {
    const parsed = createLocationSchema.parse({ name: 'Kelp Harbour', summary: '   ' })

    expect(parsed.summary).toBeNull()
  })

  // The reveal seam: nothing in this ticket may stamp the column.
  it('cannot reveal a place, however the body is written', () => {
    const parsed = createLocationSchema.parse({
      name: 'Kelp Harbour',
      revealedAt: '2026-09-03T10:00:00.000Z',
    })

    expect(parsed).not.toHaveProperty('revealedAt')
  })
})

describe('patchLocationSchema', () => {
  it('takes one field on its own', () => {
    expect(patchLocationSchema.safeParse({ secrets: 'The lighthouse is a lie' }).success).toBe(true)
  })

  it('refuses a patch that would change nothing', () => {
    const parsed = patchLocationSchema.safeParse({})

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe('Nothing to change')
  })

  it('cannot reveal a place either', () => {
    expect(
      patchLocationSchema.parse({ name: 'Kelp Harbour', revealedAt: new Date() }),
    ).not.toHaveProperty('revealedAt')
  })
})
