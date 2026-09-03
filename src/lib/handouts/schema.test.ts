import { getTableColumns } from 'drizzle-orm'

import { campaignHandouts } from '@/lib/db/schema'

import {
  createHandoutSchema,
  HANDOUT_FIELDS,
  HANDOUT_PUBLIC_FIELDS,
  HANDOUT_SECRET_FIELDS,
  patchHandoutSchema,
} from './schema'

// The third revealable entity, and the one that carries an image. The extra
// property under test here is the one the image forces: `image` is in neither
// list and in neither schema, so no JSON body can point a handout at a stored
// object — the only way a row gets a picture is an upload this app validated.

/**
 * Columns these lists are not about: identity, reveal, clocks, the required
 * title, and `image`, which is bytes on its own endpoint.
 */
const NON_FIELD_COLUMNS = [
  'id',
  'campaignId',
  'revealedAt',
  'createdAt',
  'updatedAt',
  'title',
  'image',
]

describe('the field lists', () => {
  it('account for every editable text column on the table, and invent none', () => {
    const editable = Object.keys(getTableColumns(campaignHandouts))
      .filter((column) => !NON_FIELD_COLUMNS.includes(column))
      .sort()

    expect(HANDOUT_FIELDS.map((field) => field.key).sort()).toEqual(editable)
  })

  it('do not overlap — a field is public or it is the DM’s, never both', () => {
    const publicKeys = HANDOUT_PUBLIC_FIELDS.map((field) => field.key)
    const secretKeys = HANDOUT_SECRET_FIELDS.map((field) => field.key)

    expect(publicKeys.filter((key) => secretKeys.includes(key))).toEqual([])
  })

  // A handout's public layer is the artefact: the words on the thing.
  it('puts the artefact in the public layer and what it really is behind it', () => {
    expect(HANDOUT_PUBLIC_FIELDS.map((field) => field.key)).toEqual(['body'])
    expect(HANDOUT_SECRET_FIELDS.map((field) => field.key)).toEqual(['provenance', 'dmNotes'])
  })

  it('gives every field a label and a hint, so nothing renders bare', () => {
    for (const field of HANDOUT_FIELDS) {
      expect(field.label.length).toBeGreaterThan(0)
      expect(field.hint.length).toBeGreaterThan(0)
    }
  })
})

describe('createHandoutSchema', () => {
  it('takes a title on its own — the scan can come the night before', () => {
    const parsed = createHandoutSchema.safeParse({ title: 'The pressed-flower letter' })

    expect(parsed.success).toBe(true)
    expect(parsed.data?.title).toBe('The pressed-flower letter')
  })

  it('trims the title and refuses a blank one', () => {
    expect(createHandoutSchema.safeParse({ title: '  A letter  ' }).data?.title).toBe('A letter')

    const blank = createHandoutSchema.safeParse({ title: '  ' })
    expect(blank.success).toBe(false)
    expect(blank.error?.issues[0]?.message).toBe('Give the handout a title')
  })

  it('says what is missing when there is no title at all', () => {
    const parsed = createHandoutSchema.safeParse({ body: 'Dearest Mira,' })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe('Give the handout a title')
  })

  // The property the image column exists behind: bytes only, on their own route.
  it('cannot be talked into attaching an image', () => {
    const parsed = createHandoutSchema.parse({
      title: 'A letter',
      image: {
        pathname: 'campaigns/someone-elses/handouts/secret.jpg',
        contentType: 'image/jpeg',
        bytes: 1,
        uploadedAt: '2026-09-03T10:00:00.000Z',
      },
    })

    expect(parsed).not.toHaveProperty('image')
  })
})

describe('patchHandoutSchema', () => {
  it('takes one field on its own', () => {
    expect(patchHandoutSchema.safeParse({ provenance: 'A forgery' }).success).toBe(true)
  })

  it('refuses a patch that would change nothing', () => {
    const parsed = patchHandoutSchema.safeParse({})

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe('Nothing to change')
  })

  it('cannot attach an image or reveal a handout', () => {
    const parsed = patchHandoutSchema.parse({
      title: 'A letter',
      image: { pathname: 'x', contentType: 'image/png', bytes: 1, uploadedAt: 'now' },
      revealedAt: new Date(),
    })

    expect(parsed).not.toHaveProperty('image')
    expect(parsed).not.toHaveProperty('revealedAt')
  })
})
