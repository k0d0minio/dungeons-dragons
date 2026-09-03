import { getTableColumns } from 'drizzle-orm'

import { campaignSessionPlans } from '@/lib/db/schema'

import {
  createSessionPlanItemSchema,
  createSessionPlanLinkSchema,
  createSessionPlanSchema,
  MAX_SESSION_PLAN_ITEM_LENGTH,
  MAX_SESSION_PLAN_ITEMS,
  patchSessionPlanItemSchema,
  patchSessionPlanSchema,
  reorderSessionPlanItemsSchema,
  SESSION_PLAN_FIELDS,
  SESSION_PLAN_PUBLIC_FIELDS,
  SESSION_PLAN_SECRET_FIELDS,
} from './schema'

// The public/DM-only split is data in this module and the editor renders from
// it, so these tests hold that data honest exactly as `npcs/schema.test.ts`
// does: the two lists together account for every editable column, they do not
// overlap, and the secret list is the set `sessionPlanPublicColumns` refuses.
//
// The schemas below it carry this ticket's own rule, and it is the one worth
// re-reading: **nothing here can announce a night, and nothing here can move a
// line between the two lists.**

/** Columns that are not prep the DM types: identity, ownership, reveal, clocks. */
const NON_FIELD_COLUMNS = ['id', 'campaignId', 'revealedAt', 'createdAt', 'updatedAt', 'title']

describe('the field lists', () => {
  it('account for every editable column on the table, and invent none', () => {
    const editable = Object.keys(getTableColumns(campaignSessionPlans))
      .filter((column) => !NON_FIELD_COLUMNS.includes(column))
      .sort()

    expect(SESSION_PLAN_FIELDS.map((field) => field.key).sort()).toEqual(editable)
  })

  it('do not overlap — a field is public or it is the DM’s, never both', () => {
    const publicKeys = SESSION_PLAN_PUBLIC_FIELDS.map((field) => field.key)
    const secretKeys = SESSION_PLAN_SECRET_FIELDS.map((field) => field.key)

    expect(publicKeys.filter((key) => secretKeys.includes(key))).toEqual([])
  })

  // A strong start is heard at the table, never read off the plan. Announcing
  // a night must not carry it, and this is where that is decided.
  it('keeps the prep behind the screen and only the night in front of it', () => {
    expect(SESSION_PLAN_PUBLIC_FIELDS.map((field) => field.key)).toEqual(['sessionDate'])
    expect(SESSION_PLAN_SECRET_FIELDS.map((field) => field.key)).toEqual([
      'strongStart',
      'treasure',
    ])
  })
})

describe('createSessionPlanSchema', () => {
  it('takes a title alone — the five sections fill in over the week', () => {
    expect(createSessionPlanSchema.safeParse({ title: 'Session 4' }).success).toBe(true)
  })

  it('refuses a missing or blank title, and says so in words about the plan', () => {
    const missing = createSessionPlanSchema.safeParse({})
    const blank = createSessionPlanSchema.safeParse({ title: '   ' })

    expect(missing.error?.issues[0]?.message).toBe('Give the session a title')
    expect(blank.error?.issues[0]?.message).toBe('Give the session a title')
  })

  it('collapses a blank field to null, so cleared and never-written read alike', () => {
    const parsed = createSessionPlanSchema.parse({
      title: 'Session 4',
      sessionDate: '',
      strongStart: '  ',
    })

    expect(parsed.sessionDate).toBeNull()
    expect(parsed.strongStart).toBeNull()
  })

  it('takes a real date and refuses a day that does not exist', () => {
    expect(
      createSessionPlanSchema.parse({ title: 'x', sessionDate: '2026-09-17' }).sessionDate,
    ).toBe('2026-09-17')
    expect(
      createSessionPlanSchema.safeParse({ title: 'x', sessionDate: '2026-02-30' }).success,
    ).toBe(false)
    expect(createSessionPlanSchema.safeParse({ title: 'x', sessionDate: 'thursday' }).success).toBe(
      false,
    )
  })

  // The seam `dm-run-suite/reveal-controls` owns. Until it ships there is no
  // request in this app that can stamp the column.
  it('cannot announce a night, however the body is hand-rolled', () => {
    const parsed = createSessionPlanSchema.parse({
      title: 'Session 4',
      revealedAt: new Date().toISOString(),
    })

    expect(parsed).not.toHaveProperty('revealedAt')
  })
})

describe('patchSessionPlanSchema', () => {
  it('refuses an empty patch rather than reporting a save that saved nothing', () => {
    expect(patchSessionPlanSchema.safeParse({}).error?.issues[0]?.message).toBe('Nothing to change')
  })

  it('takes one field on its own', () => {
    expect(patchSessionPlanSchema.safeParse({ treasure: null }).success).toBe(true)
  })

  it('cannot announce a night either', () => {
    expect(patchSessionPlanSchema.parse({ title: 'x', revealedAt: null })).not.toHaveProperty(
      'revealedAt',
    )
  })
})

describe('createSessionPlanItemSchema', () => {
  it('takes a scene and a secret, and nothing else', () => {
    expect(createSessionPlanItemSchema.safeParse({ kind: 'scene', body: 'A fight' }).success).toBe(
      true,
    )
    expect(createSessionPlanItemSchema.safeParse({ kind: 'secret', body: 'A clue' }).success).toBe(
      true,
    )
    expect(createSessionPlanItemSchema.safeParse({ kind: 'treasure', body: 'x' }).success).toBe(
      false,
    )
  })

  it('refuses a blank line and one longer than a sentence', () => {
    expect(createSessionPlanItemSchema.safeParse({ kind: 'scene', body: '  ' }).success).toBe(false)
    expect(
      createSessionPlanItemSchema.safeParse({
        kind: 'scene',
        body: 'x'.repeat(MAX_SESSION_PLAN_ITEM_LENGTH + 1),
      }).success,
    ).toBe(false)
  })
})

describe('patchSessionPlanItemSchema', () => {
  it('rewords, ticks and unticks', () => {
    expect(patchSessionPlanItemSchema.safeParse({ body: 'Reworded' }).success).toBe(true)
    expect(patchSessionPlanItemSchema.safeParse({ checked: true }).success).toBe(true)
    expect(patchSessionPlanItemSchema.safeParse({ checked: false }).success).toBe(true)
  })

  it('refuses an empty patch', () => {
    expect(patchSessionPlanItemSchema.safeParse({}).error?.issues[0]?.message).toBe(
      'Nothing to change',
    )
  })

  // A secret that became a scene would vanish out of its own order, and the
  // DM would find out by not finding it.
  it('cannot move a line between the two lists', () => {
    expect(patchSessionPlanItemSchema.parse({ body: 'x', kind: 'scene' })).not.toHaveProperty(
      'kind',
    )
  })
})

describe('reorderSessionPlanItemsSchema', () => {
  it('takes a whole list of one kind', () => {
    expect(
      reorderSessionPlanItemsSchema.safeParse({ kind: 'scene', ids: ['a', 'b'] }).success,
    ).toBe(true)
  })

  it('refuses an empty order and one that repeats a line', () => {
    expect(reorderSessionPlanItemsSchema.safeParse({ kind: 'scene', ids: [] }).success).toBe(false)
    expect(
      reorderSessionPlanItemsSchema.safeParse({ kind: 'scene', ids: ['a', 'a'] }).error?.issues[0]
        ?.message,
    ).toBe('That order repeats a line')
  })

  it('refuses an unbounded array', () => {
    const ids = Array.from({ length: MAX_SESSION_PLAN_ITEMS + 1 }, (_, index) => `id-${index}`)

    expect(reorderSessionPlanItemsSchema.safeParse({ kind: 'scene', ids }).success).toBe(false)
  })
})

describe('createSessionPlanLinkSchema', () => {
  it('takes the three kinds a plan can point at', () => {
    for (const kind of ['npc', 'location', 'encounter']) {
      expect(createSessionPlanLinkSchema.safeParse({ kind, targetId: 'id' }).success).toBe(true)
    }
  })

  it('refuses a fourth kind and a missing target', () => {
    expect(createSessionPlanLinkSchema.safeParse({ kind: 'handout', targetId: 'id' }).success).toBe(
      false,
    )
    expect(createSessionPlanLinkSchema.safeParse({ kind: 'npc', targetId: '' }).success).toBe(false)
  })
})
