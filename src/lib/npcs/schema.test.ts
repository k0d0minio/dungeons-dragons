import { getTableColumns } from 'drizzle-orm'

import { campaignNpcs } from '@/lib/db/schema'

import {
  createNpcSchema,
  MAX_NPC_NAME_LENGTH,
  MAX_NPC_TEXT_LENGTH,
  NPC_FIELDS,
  NPC_PUBLIC_FIELDS,
  NPC_SECRET_FIELDS,
  patchNpcSchema,
} from './schema'

// The public/DM-only split is data in this module, and the editor renders from
// it. These tests hold that data honest: the two lists together account for
// every editable column, they do not overlap, and the secret list is exactly
// the set of columns `npcPublicColumns` refuses to select.

/** Columns that are not prep the DM types: identity, ownership, reveal, clocks. */
const NON_FIELD_COLUMNS = ['id', 'campaignId', 'revealedAt', 'createdAt', 'updatedAt', 'name']

describe('the field lists', () => {
  it('account for every editable column on the table, and invent none', () => {
    const editable = Object.keys(getTableColumns(campaignNpcs))
      .filter((column) => !NON_FIELD_COLUMNS.includes(column))
      .sort()

    expect(NPC_FIELDS.map((field) => field.key).sort()).toEqual(editable)
  })

  it('do not overlap — a field is public or it is the DM’s, never both', () => {
    const publicKeys = NPC_PUBLIC_FIELDS.map((field) => field.key)
    const secretKeys = NPC_SECRET_FIELDS.map((field) => field.key)

    expect(publicKeys.filter((key) => secretKeys.includes(key))).toEqual([])
  })

  it('keeps the secret layer as the register names it (D38)', () => {
    expect(NPC_SECRET_FIELDS.map((field) => field.key)).toEqual([
      'motivation',
      'secrets',
      'twist',
      'statReference',
      'dmNotes',
    ])
  })

  it('gives every field a label and a hint, so nothing renders bare', () => {
    for (const field of NPC_FIELDS) {
      expect(field.label.length).toBeGreaterThan(0)
      expect(field.hint.length).toBeGreaterThan(0)
      expect(['line', 'text']).toContain(field.kind)
    }
  })
})

describe('createNpcSchema', () => {
  it('takes a name on its own — a name and nothing else is prep', () => {
    const parsed = createNpcSchema.safeParse({ name: 'Harbourmaster Vane' })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.name).toBe('Harbourmaster Vane')
  })

  it('trims the name and refuses a blank one', () => {
    expect(createNpcSchema.safeParse({ name: '  Vane  ' }).data?.name).toBe('Vane')

    const blank = createNpcSchema.safeParse({ name: '   ' })
    expect(blank.success).toBe(false)
    expect(blank.error?.issues[0]?.message).toBe('Give them a name')
  })

  it('says what is missing when there is no name at all', () => {
    const parsed = createNpcSchema.safeParse({ summary: 'Runs the docks' })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe('Give them a name')
  })

  it('refuses a name longer than a tap target', () => {
    expect(createNpcSchema.safeParse({ name: 'V'.repeat(MAX_NPC_NAME_LENGTH + 1) }).success).toBe(
      false,
    )
  })

  it('collapses a blank optional field to null rather than an empty string', () => {
    const parsed = createNpcSchema.safeParse({ name: 'Vane', summary: '   ', secrets: '' })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.summary).toBeNull()
    expect(parsed.data?.secrets).toBeNull()
  })

  it('accepts an explicit null, which is how the editor clears a field', () => {
    expect(createNpcSchema.safeParse({ name: 'Vane', twist: null }).data?.twist).toBeNull()
  })

  it('refuses a field longer than its own limit', () => {
    const parsed = createNpcSchema.safeParse({
      name: 'Vane',
      dmNotes: 'x'.repeat(MAX_NPC_TEXT_LENGTH + 1),
    })

    expect(parsed.success).toBe(false)
  })

  it('ignores a revealedAt someone tries to send — reveals are not this surface', () => {
    const parsed = createNpcSchema.safeParse({ name: 'Vane', revealedAt: '2026-09-01T00:00:00Z' })

    expect(parsed.success).toBe(true)
    expect(parsed.data).not.toHaveProperty('revealedAt')
  })
})

describe('patchNpcSchema', () => {
  it('takes one field on its own', () => {
    const parsed = patchNpcSchema.safeParse({ motivation: 'Pay off the debt.' })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.motivation).toBe('Pay off the debt.')
  })

  it('refuses an empty patch rather than bumping updated_at for nothing', () => {
    const parsed = patchNpcSchema.safeParse({})

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe('Nothing to change')
  })

  it('still refuses a blank name — a patch may not erase the one required field', () => {
    expect(patchNpcSchema.safeParse({ name: '  ' }).success).toBe(false)
  })

  it('cannot reveal an NPC: revealedAt is not a field it knows', () => {
    const parsed = patchNpcSchema.safeParse({ revealedAt: new Date().toISOString() })

    // Unknown keys are stripped, so what is left is an empty patch — refused.
    expect(parsed.success).toBe(false)
  })
})
