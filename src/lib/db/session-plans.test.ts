import { getTableColumns } from 'drizzle-orm'

import {
  addSessionPlanItem,
  addSessionPlanLink,
  checkStamp,
  createSessionPlan,
  deleteSessionPlan,
  deleteSessionPlanItem,
  deleteSessionPlanLink,
  getSessionPlan,
  listSessionPlans,
  listSessionPlanTargets,
  reorderSessionPlanItems,
  sessionPlanPublicColumns,
  updateSessionPlan,
  updateSessionPlanItem,
} from './session-plans'
import {
  campaignSessionPlans,
  sessionPlanItems,
  type CampaignSessionPlan,
  type SessionPlanItem,
} from './schema'

// The same real-Drizzle-over-a-stub-driver pattern as `locations.test.ts`,
// against the fourth revealable entity — and the first one that owns rows of
// its own.
//
// Two properties are on trial here. The first is D38's and is not new: a DM's
// prep is the DM's, so every statement folds `campaigns.dm_user_id` into its
// WHERE. The second is this ticket's: the scenes, the secrets and the links
// have no `campaign_id` to fold, so every statement that touches one must carry
// the EXISTS *through the plan* instead — and these tests read the generated
// SQL to prove that none of them forgot.
type DriverCall = { sql: string; params: unknown[] }

const mockCalls: DriverCall[] = []
let mockRows: unknown[][] = []
let mockRowsQueue: unknown[][][] | undefined

const mockClient = async (sql: string, params: unknown[]) => {
  mockCalls.push({ sql, params })
  return { rows: mockRowsQueue ? (mockRowsQueue.shift() ?? []) : mockRows }
}

jest.mock('./client', () => {
  let db: ReturnType<typeof import('drizzle-orm/neon-http').drizzle> | undefined

  return {
    getDb: () => {
      const { drizzle } = require('drizzle-orm/neon-http')
      db ??= drizzle(mockClient)
      return db
    },
    isDatabaseConfigured: () => true,
  }
})

const DM = 'user_2mFq8xKpLd'
const PLAYER = 'user_9zQw1nBvRt'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const SCENE_ID = '11111111-2222-4333-8444-555555555555'
const OTHER_SCENE_ID = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const NPC_ID = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff'
const LINK_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'

const PLAN: CampaignSessionPlan = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'Session 4 — the shrine',
  sessionDate: '2026-09-17',
  strongStart: 'The tide is out further than it has ever been, and something is standing in it.',
  treasure: 'A silver holy symbol, tarnished black. 60gp of coral.',
}

const SCENE: SessionPlanItem = {
  id: SCENE_ID,
  planId: PLAN_ID,
  kind: 'scene',
  body: 'The harbourmaster tries to stop them leaving',
  sortOrder: 0,
  checkedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
}

/** A row, positionally, as the Neon HTTP driver hands it back. */
function driverRow<T extends object>(table: Record<string, unknown>, row: T): unknown[] {
  return Object.keys(table).map((column) => {
    const value = row[column as keyof T]
    return value instanceof Date ? value.toISOString() : value
  })
}

const planRow = (plan: CampaignSessionPlan) =>
  driverRow(getTableColumns(campaignSessionPlans), plan)
const itemRow = (item: SessionPlanItem) => driverRow(getTableColumns(sessionPlanItems), item)

/** One row saying "yes, this exists" — what the authority pre-reads select. */
const EXISTS_ROW = [[1]]

beforeEach(() => {
  mockCalls.length = 0
  mockRows = []
  mockRowsQueue = undefined
})

describe('sessionPlanPublicColumns', () => {
  it('names the public layer and nothing else', () => {
    expect(Object.keys(sessionPlanPublicColumns).sort()).toEqual([
      'campaignId',
      'id',
      'revealedAt',
      'sessionDate',
      'title',
    ])
  })

  it('carries no prep — announcing a night can never carry what happens on it', () => {
    expect(sessionPlanPublicColumns).not.toHaveProperty('strongStart')
    expect(sessionPlanPublicColumns).not.toHaveProperty('treasure')
  })
})

describe('checkStamp', () => {
  it('stamps a tick and clears an untick, so there is no time on a thing undone', () => {
    expect(checkStamp(true).checkedAt).toBeInstanceOf(Date)
    expect(checkStamp(false).checkedAt).toBeNull()
  })
})

describe('listSessionPlans', () => {
  it('scopes to the DM and puts the next night first', async () => {
    mockRowsQueue = [EXISTS_ROW, [planRow(PLAN)]]

    const plans = await listSessionPlans(DM, CAMPAIGN_ID)

    const [authority, list] = mockCalls
    expect(authority.sql).toContain('from "campaigns"')
    expect(list.sql).toContain('from "campaign_session_plans"')
    expect(list.sql).toContain('"dm_user_id"')
    expect(list.sql).toContain('desc nulls first')

    expect(plans).toEqual([PLAN])
  })

  it('is a miss for a campaign this DM does not run — nothing is read', async () => {
    mockRowsQueue = [[]]

    expect(await listSessionPlans(PLAYER, CAMPAIGN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss rather than a Postgres type error', async () => {
    expect(await listSessionPlans(DM, 'not-a-uuid')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('getSessionPlan', () => {
  it('reads the plan, its lines and its links, each scoped through the DM', async () => {
    mockRowsQueue = [
      [planRow(PLAN)],
      [itemRow(SCENE)],
      [[LINK_ID, NPC_ID, null, null, 'Halda', null, null]],
    ]

    const detail = await getSessionPlan(DM, CAMPAIGN_ID, PLAN_ID)

    const [plan, items, links] = mockCalls
    expect(plan.sql).toContain('"dm_user_id"')
    expect(items.sql).toContain('from "session_plan_items"')
    // The child rows have no `campaign_id`, so authority arrives through the
    // plan — this is the EXISTS that has to be on every one of them.
    expect(items.sql).toContain('from "campaign_session_plans"')
    expect(items.sql).toContain('"dm_user_id"')
    expect(links.sql).toContain('from "session_plan_links"')
    expect(links.sql).toContain('"dm_user_id"')
    expect(links.sql).toContain('left join')

    expect(detail?.plan).toEqual(PLAN)
    expect(detail?.items).toEqual([SCENE])
    expect(detail?.links).toEqual([{ id: LINK_ID, kind: 'npc', targetId: NPC_ID, label: 'Halda' }])
  })

  it('resolves a place link and an encounter link to their own names', async () => {
    mockRowsQueue = [
      [planRow(PLAN)],
      [],
      [
        [LINK_ID, null, NPC_ID, null, null, 'Kelp Harbour', null],
        [SCENE_ID, null, null, NPC_ID, null, null, 'Ambush on the mole'],
      ],
    ]

    const detail = await getSessionPlan(DM, CAMPAIGN_ID, PLAN_ID)

    expect(detail?.links).toEqual([
      { id: LINK_ID, kind: 'location', targetId: NPC_ID, label: 'Kelp Harbour' },
      { id: SCENE_ID, kind: 'encounter', targetId: NPC_ID, label: 'Ambush on the mole' },
    ])
  })

  it('drops a link with no target rather than rendering an untappable blank', async () => {
    mockRowsQueue = [[planRow(PLAN)], [], [[LINK_ID, null, null, null, null, null, null]]]

    expect((await getSessionPlan(DM, CAMPAIGN_ID, PLAN_ID))?.links).toEqual([])
  })

  it('stops at the plan when the DM does not run its campaign', async () => {
    mockRowsQueue = [[]]

    expect(await getSessionPlan(PLAYER, CAMPAIGN_ID, PLAN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await getSessionPlan(DM, CAMPAIGN_ID, 'nope')).toBeNull()
    expect(await getSessionPlan(DM, 'nope', PLAN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('listSessionPlanTargets', () => {
  it('offers only this campaign’s prep, as id and name', async () => {
    mockRowsQueue = [
      EXISTS_ROW,
      [[NPC_ID, 'Halda']],
      [[NPC_ID, 'Kelp Harbour']],
      [[NPC_ID, 'Ambush']],
    ]

    const targets = await listSessionPlanTargets(DM, CAMPAIGN_ID)

    const [, npcs, locations, fights] = mockCalls
    for (const call of [npcs, locations, fights]) {
      expect(call.sql).toContain('"dm_user_id"')
      expect(call.params).toEqual(expect.arrayContaining([CAMPAIGN_ID, DM]))
    }

    // Names only. A picker of NPC names must not be a way to ship every
    // secret in the campaign into a page prop.
    expect(npcs.sql).not.toContain('"secrets"')
    expect(targets).toEqual({
      npcs: [{ id: NPC_ID, name: 'Halda' }],
      locations: [{ id: NPC_ID, name: 'Kelp Harbour' }],
      encounters: [{ id: NPC_ID, name: 'Ambush' }],
    })
  })

  it('is a miss for a campaign this DM does not run', async () => {
    mockRowsQueue = [[]]

    expect(await listSessionPlanTargets(PLAYER, CAMPAIGN_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await listSessionPlanTargets(DM, 'nope')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('createSessionPlan', () => {
  it('settles authority before inserting', async () => {
    mockRowsQueue = [EXISTS_ROW, [planRow(PLAN)]]

    const plan = await createSessionPlan(DM, CAMPAIGN_ID, { title: 'Session 4 — the shrine' })

    const [authority, insert] = mockCalls
    expect(authority.sql).toContain('from "campaigns"')
    expect(insert.sql).toContain('insert into "campaign_session_plans"')

    expect(plan).toEqual(PLAN)
  })

  it('never writes an announced row — campaign content starts hidden', async () => {
    mockRowsQueue = [EXISTS_ROW, [planRow(PLAN)]]

    await createSessionPlan(DM, CAMPAIGN_ID, {
      title: 'Session 4',
      strongStart: 'The tide is out.',
    })

    const [, insert] = mockCalls
    const columns = insert.sql.slice(insert.sql.indexOf('(') + 1, insert.sql.indexOf(')'))
    const values = insert.sql.slice(
      insert.sql.indexOf('values (') + 8,
      insert.sql.indexOf(')', insert.sql.indexOf('values (')),
    )
    const at = columns.split(', ').indexOf('"revealed_at"')

    expect(at).toBeGreaterThanOrEqual(0)
    expect(values.split(', ')[at]).toBe('default')
  })

  it('refuses a campaign this DM does not run, without inserting', async () => {
    mockRowsQueue = [[]]

    expect(await createSessionPlan(PLAYER, CAMPAIGN_ID, { title: 'Mine now' })).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed campaign id as a miss', async () => {
    expect(await createSessionPlan(DM, 'nope', { title: 'x' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('updateSessionPlan', () => {
  it('carries the DM, the campaign and the plan in one statement', async () => {
    mockRows = [planRow({ ...PLAN, treasure: null })]

    const plan = await updateSessionPlan(DM, CAMPAIGN_ID, PLAN_ID, { treasure: null })

    const [update] = mockCalls
    expect(update.sql).toContain('update "campaign_session_plans"')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toEqual(expect.arrayContaining([PLAN_ID, CAMPAIGN_ID, DM]))

    expect(plan?.treasure).toBeNull()
  })

  it('is a miss when the statement changed nothing', async () => {
    mockRows = []

    expect(await updateSessionPlan(PLAYER, CAMPAIGN_ID, PLAN_ID, { title: 'Mine' })).toBeNull()
  })

  it('treats a malformed id as a miss', async () => {
    expect(await updateSessionPlan(DM, CAMPAIGN_ID, 'nope', { title: 'x' })).toBeNull()
    expect(await updateSessionPlan(DM, 'nope', PLAN_ID, { title: 'x' })).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteSessionPlan', () => {
  it('deletes only within a campaign this DM runs', async () => {
    mockRows = [[PLAN_ID]]

    expect(await deleteSessionPlan(DM, CAMPAIGN_ID, PLAN_ID)).toBe(true)

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "campaign_session_plans"')
    expect(remove.sql).toContain('"dm_user_id"')
  })

  it('is false when there was nothing this DM could delete', async () => {
    mockRows = []

    expect(await deleteSessionPlan(PLAYER, CAMPAIGN_ID, PLAN_ID)).toBe(false)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await deleteSessionPlan(DM, CAMPAIGN_ID, 'nope')).toBe(false)
    expect(await deleteSessionPlan(DM, 'nope', PLAN_ID)).toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})

describe('addSessionPlanItem', () => {
  it('reads the next slot and the DM’s authority in one statement, then inserts', async () => {
    mockRowsQueue = [[[3]], [itemRow({ ...SCENE, sortOrder: 3 })]]

    const item = await addSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, {
      kind: 'scene',
      body: SCENE.body,
    })

    const [slot, insert] = mockCalls
    expect(slot.sql).toContain('from "campaign_session_plans"')
    expect(slot.sql).toContain('left join "session_plan_items"')
    expect(slot.sql).toContain('group by')
    expect(slot.sql).toContain('"dm_user_id"')

    expect(insert.sql).toContain('insert into "session_plan_items"')
    expect(insert.params).toEqual(expect.arrayContaining([PLAN_ID, 'scene', SCENE.body, 3]))

    expect(item?.sortOrder).toBe(3)
  })

  it('refuses a plan this DM cannot reach, without inserting', async () => {
    mockRowsQueue = [[]]

    expect(
      await addSessionPlanItem(PLAYER, CAMPAIGN_ID, PLAN_ID, { kind: 'secret', body: 'Mine' }),
    ).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss', async () => {
    expect(
      await addSessionPlanItem(DM, CAMPAIGN_ID, 'nope', { kind: 'scene', body: 'x' }),
    ).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('updateSessionPlanItem', () => {
  it('ticks a line off in one statement, scoped through the plan', async () => {
    mockRows = [itemRow({ ...SCENE, checkedAt: new Date('2026-09-17T20:00:00.000Z') })]

    const item = await updateSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, SCENE_ID, { checked: true })

    const [update] = mockCalls
    expect(update.sql).toContain('update "session_plan_items"')
    expect(update.sql).toContain('"checked_at"')
    expect(update.sql).toContain('"dm_user_id"')
    // A tick is bookkeeping, never a reveal.
    expect(update.sql).not.toContain('"revealed_at"')

    expect(item?.checkedAt).toEqual(new Date('2026-09-17T20:00:00.000Z'))
  })

  it('unticks by clearing the stamp rather than setting a second flag', async () => {
    mockRows = [itemRow(SCENE)]

    await updateSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, SCENE_ID, { checked: false })

    expect(mockCalls[0].params).toContain(null)
  })

  it('rewords without touching the tick', async () => {
    mockRows = [itemRow({ ...SCENE, body: 'Reworded' })]

    await updateSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, SCENE_ID, { body: 'Reworded' })

    // The SET clause, not the RETURNING one, which names every column.
    const setClause = mockCalls[0].sql.slice(
      mockCalls[0].sql.indexOf(' set '),
      mockCalls[0].sql.indexOf(' where '),
    )
    expect(setClause).not.toContain('"checked_at"')
    expect(mockCalls[0].params).toContain('Reworded')
  })

  it('is a miss when the statement changed nothing', async () => {
    mockRows = []

    expect(
      await updateSessionPlanItem(PLAYER, CAMPAIGN_ID, PLAN_ID, SCENE_ID, { checked: true }),
    ).toBeNull()
  })

  it('treats a malformed id as a miss', async () => {
    expect(
      await updateSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, 'nope', { checked: true }),
    ).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteSessionPlanItem', () => {
  it('deletes only through a plan this DM runs', async () => {
    mockRows = [[SCENE_ID]]

    expect(await deleteSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, SCENE_ID)).toBe(true)

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "session_plan_items"')
    expect(remove.sql).toContain('"dm_user_id"')
  })

  it('is false when there was nothing this DM could delete', async () => {
    mockRows = []

    expect(await deleteSessionPlanItem(PLAYER, CAMPAIGN_ID, PLAN_ID, SCENE_ID)).toBe(false)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await deleteSessionPlanItem(DM, CAMPAIGN_ID, PLAN_ID, 'nope')).toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})

describe('reorderSessionPlanItems', () => {
  const ORDER = [OTHER_SCENE_ID, SCENE_ID]

  it('renumbers the whole kind in one CASE update after checking the set', async () => {
    mockRowsQueue = [[[OTHER_SCENE_ID], [SCENE_ID]], [itemRow({ ...SCENE, sortOrder: 1 })]]

    const items = await reorderSessionPlanItems(DM, CAMPAIGN_ID, PLAN_ID, 'scene', ORDER)

    const [current, update] = mockCalls
    expect(current.sql).toContain('from "session_plan_items"')
    expect(current.sql).toContain('"dm_user_id"')

    expect(update.sql).toContain('update "session_plan_items"')
    expect(update.sql).toContain('case when')
    expect(update.sql).toContain('"dm_user_id"')
    expect(update.params).toEqual(expect.arrayContaining([OTHER_SCENE_ID, 0, SCENE_ID, 1]))

    expect(items?.[0].sortOrder).toBe(1)
  })

  it('refuses an order that is not exactly the plan’s current set for that kind', async () => {
    // A stale tab, missing a line someone else added: renumbering half a list
    // is worse than refusing, and there is no transaction to undo it with.
    mockRowsQueue = [[[OTHER_SCENE_ID], [SCENE_ID], [PLAN_ID]]]

    expect(await reorderSessionPlanItems(DM, CAMPAIGN_ID, PLAN_ID, 'scene', ORDER)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('refuses an order naming a line from another plan', async () => {
    mockRowsQueue = [[[OTHER_SCENE_ID], [PLAN_ID]]]

    expect(await reorderSessionPlanItems(DM, CAMPAIGN_ID, PLAN_ID, 'scene', ORDER)).toBeNull()
  })

  it('refuses an empty order, a repeated id and a malformed one, without reading', async () => {
    expect(await reorderSessionPlanItems(DM, CAMPAIGN_ID, PLAN_ID, 'scene', [])).toBeNull()
    expect(
      await reorderSessionPlanItems(DM, CAMPAIGN_ID, PLAN_ID, 'scene', [SCENE_ID, SCENE_ID]),
    ).toBeNull()
    expect(await reorderSessionPlanItems(DM, CAMPAIGN_ID, PLAN_ID, 'scene', ['nope'])).toBeNull()
    expect(await reorderSessionPlanItems(DM, 'nope', PLAN_ID, 'scene', ORDER)).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('addSessionPlanLink', () => {
  it('proves the plan and the target are the same campaign’s, then inserts', async () => {
    mockRowsQueue = [
      EXISTS_ROW,
      [[LINK_ID, PLAN_ID, NPC_ID, null, null, '2026-09-03T10:00:00.000Z']],
    ]

    const link = await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'npc', NPC_ID)

    const [allowed, insert] = mockCalls
    expect(allowed.sql).toContain('from "campaign_session_plans"')
    expect(allowed.sql).toContain('"dm_user_id"')
    // The second EXISTS: the NPC has to be in *this* campaign, not merely in
    // one this DM happens to run.
    expect(allowed.sql).toContain('from "campaign_npcs"')
    expect(allowed.params).toEqual(expect.arrayContaining([NPC_ID, CAMPAIGN_ID]))

    expect(insert.sql).toContain('insert into "session_plan_links"')
    expect(insert.sql).toContain('"npc_id"')
    expect(insert.sql).toContain('on conflict do nothing')

    expect(link?.id).toBe(LINK_ID)
  })

  it('writes a place into its own column and a fight into its own', async () => {
    mockRowsQueue = [
      EXISTS_ROW,
      [[LINK_ID, PLAN_ID, null, NPC_ID, null, '2026-09-03T10:00:00.000Z']],
    ]
    await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'location', NPC_ID)
    expect(mockCalls[0].sql).toContain('from "campaign_locations"')
    expect(mockCalls[1].sql).toContain('"location_id"')

    mockCalls.length = 0
    mockRowsQueue = [
      EXISTS_ROW,
      [[LINK_ID, PLAN_ID, null, null, NPC_ID, '2026-09-03T10:00:00.000Z']],
    ]
    await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'encounter', NPC_ID)
    expect(mockCalls[0].sql).toContain('from "encounters"')
    expect(mockCalls[1].sql).toContain('"encounter_id"')
  })

  it('hands back the existing link when the same thing is linked twice', async () => {
    const existing = [LINK_ID, PLAN_ID, NPC_ID, null, null, '2026-09-03T10:00:00.000Z']
    mockRowsQueue = [EXISTS_ROW, [], [existing]]

    const link = await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'npc', NPC_ID)

    expect(mockCalls).toHaveLength(3)
    expect(link?.id).toBe(LINK_ID)
  })

  it('is null when the conflict read finds nothing either', async () => {
    mockRowsQueue = [EXISTS_ROW, [], []]

    expect(await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'npc', NPC_ID)).toBeNull()
  })

  it('refuses a target outside the campaign, without inserting', async () => {
    mockRowsQueue = [[]]

    expect(await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'npc', NPC_ID)).toBeNull()
    expect(mockCalls).toHaveLength(1)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await addSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'npc', 'nope')).toBeNull()
    expect(mockCalls).toHaveLength(0)
  })
})

describe('deleteSessionPlanLink', () => {
  it('unlinks only through a plan this DM runs', async () => {
    mockRows = [[LINK_ID]]

    expect(await deleteSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, LINK_ID)).toBe(true)

    const [remove] = mockCalls
    expect(remove.sql).toContain('delete from "session_plan_links"')
    expect(remove.sql).toContain('"dm_user_id"')
  })

  it('is false when there was nothing this DM could unlink', async () => {
    mockRows = []

    expect(await deleteSessionPlanLink(PLAYER, CAMPAIGN_ID, PLAN_ID, LINK_ID)).toBe(false)
  })

  it('treats a malformed id as a miss', async () => {
    expect(await deleteSessionPlanLink(DM, CAMPAIGN_ID, PLAN_ID, 'nope')).toBe(false)
    expect(mockCalls).toHaveLength(0)
  })
})
