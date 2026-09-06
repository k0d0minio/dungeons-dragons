// Typed data access for session plans and their two kinds of child row
// (`dm-prep-suite/session-plans`).
//
// The plan itself is the fourth revealable entity and its five statements are
// `locations.ts`', against a different table. What is new here is that a plan
// **owns rows** — the scenes, the secrets and the links — and those rows have
// no `campaign_id` of their own to fold `campaigns.dm_user_id` into.
//
// `ownedPlan` is the answer, and it is the only genuinely new idea in this
// file: an EXISTS through the plan to the campaign to the DM, written once and
// composed onto every statement that touches a child row. It nests `runByDm`
// rather than restating it, so the authority rule still has exactly one
// definition (`revealable.ts`) and this file adds one hop to it.
//
// The consequence, stated plainly: **there is no statement in this module that
// reads or writes a child row without proving the DM runs the campaign the
// plan belongs to.** A plan id from someone else's table is a miss, and a miss
// is `null` — which the routes turn into 404, never 403, exactly as the rest of
// the suite does.
import { and, asc, desc, eq, exists, inArray, sql, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

import { getDb } from './client'
import { campaignRunBy, isRowId, revealStamp, runByDm } from './revealable'
import {
  campaignLocations,
  campaignNpcs,
  campaignSessionPlans,
  encounters,
  sessionPlanItems,
  sessionPlanLinks,
  type CampaignSessionPlan,
  type SessionPlanItem,
  type SessionPlanItemKind,
  type SessionPlanLink,
  type SessionPlanLinkKind,
} from './schema'

export type {
  CampaignSessionPlan,
  SessionPlanItem,
  SessionPlanItemKind,
  SessionPlanLink,
  SessionPlanLinkKind,
} from './schema'

/**
 * The **only** selection a player-facing read of a session plan may name.
 *
 * Unused when it landed, like `locationPublicColumns` was; `discovered.ts`
 * spends it now (`first-table/announce-the-night`) and names nothing else.
 * The `PublicSessionPlan` this produces has no `strongStart` and no `treasure`
 * on it, so announcing a night can never carry the prep for it — that would be
 * a compile error rather than a review someone has to catch. The scenes and the
 * secrets are not reachable from this selection at all: they are a different
 * table, and no player-facing query in this app selects from it.
 */
export const sessionPlanPublicColumns = {
  id: campaignSessionPlans.id,
  campaignId: campaignSessionPlans.campaignId,
  title: campaignSessionPlans.title,
  sessionDate: campaignSessionPlans.sessionDate,
  revealedAt: campaignSessionPlans.revealedAt,
} as const

/** A plan as a player would read it: the night, announced, and nothing else. */
export type PublicSessionPlan = Pick<
  CampaignSessionPlan,
  'id' | 'campaignId' | 'title' | 'sessionDate' | 'revealedAt'
>

/** The fields a DM may write. `null` clears one; omitted leaves it alone. */
export type SessionPlanPatch = Partial<
  Pick<CampaignSessionPlan, 'title' | 'sessionDate' | 'strongStart' | 'treasure'>
>

/** A new plan: a title, and as much of the rest as exists yet. */
export type NewSessionPlanInput = SessionPlanPatch & { title: string }

/** One link, resolved to the thing it points at, as a plan screen renders it. */
export interface ResolvedSessionPlanLink {
  id: string
  kind: SessionPlanLinkKind
  targetId: string
  /** The linked thing's own name, as the DM typed it. */
  label: string
}

/** A plan and everything hanging off it — one page load, one shape. */
export interface SessionPlanDetail {
  plan: CampaignSessionPlan
  items: SessionPlanItem[]
  links: ResolvedSessionPlanLink[]
}

/** What the pickers offer: the campaign's prep, as id and name only. */
export interface SessionPlanTargets {
  npcs: { id: string; name: string }[]
  locations: { id: string; name: string }[]
  encounters: { id: string; name: string }[]
}

/** The minimum shape of a row a plan owns. */
interface PlanChildTable {
  planId: PgColumn
}

/**
 * "This row hangs off a plan in a campaign `dmUserId` runs", as a WHERE
 * fragment — `runByDm` with one more hop.
 *
 * An EXISTS rather than a join for `runByDm`'s reason: it composes onto SELECT,
 * UPDATE and DELETE unchanged, so every statement in this file that touches a
 * child row carries *identical* authority and the property stays reviewable by
 * reading one function.
 *
 * `campaignId` is in the predicate as well as `planId` even though the plan id
 * alone is unique, because the routes are campaign-scoped: a plan id that
 * belongs to another campaign this same DM runs is still the wrong URL, and
 * answering it would let a stale link edit the wrong table's prep.
 *
 * Local to this module rather than in `revealable.ts`: a session plan is the
 * first prep entity with children, and generalising a shape from one example is
 * guessing. The second one that wants it can move it.
 */
function ownedPlan(table: PlanChildTable, dmUserId: string, campaignId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(campaignSessionPlans)
      .where(
        and(
          eq(campaignSessionPlans.id, table.planId),
          eq(campaignSessionPlans.campaignId, campaignId),
          runByDm(campaignSessionPlans, dmUserId),
        ),
      ),
  )
}

/**
 * The `checked_at` value for a tick or an untick, as a patch fragment.
 *
 * `revealStamp`'s shape and deliberately not `revealStamp` itself: ticking a
 * secret off is the DM's own bookkeeping and reveals nothing to anybody, and
 * one function serving both would be one edit away from a tap at the table
 * publishing a clue. Unticking clears the timestamp rather than keeping it
 * beside a false flag.
 */
export function checkStamp(checked: boolean): { checkedAt: Date | null } {
  return { checkedAt: checked ? new Date() : null }
}

/**
 * Every session plan in a campaign `dmUserId` runs, **both layers**.
 *
 * Newest night first, and undated plans above the lot of them: unlike a roster,
 * a plan list is chronological, and the thing a DM opens is the one they are
 * about to run or still writing. `null` when there is no such campaign for this
 * DM — distinct from a campaign with no plans yet, so the page 404s rather than
 * offering to prep someone else's table.
 */
export async function listSessionPlans(
  dmUserId: string,
  campaignId: string,
): Promise<CampaignSessionPlan[] | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  return getDb()
    .select()
    .from(campaignSessionPlans)
    .where(
      and(eq(campaignSessionPlans.campaignId, campaignId), runByDm(campaignSessionPlans, dmUserId)),
    )
    .orderBy(
      sql`${campaignSessionPlans.sessionDate} desc nulls first`,
      desc(campaignSessionPlans.createdAt),
    )
}

/**
 * One plan with its scenes, its secrets and its links, in one call.
 *
 * Three statements rather than one join: a plan has two independent lists and a
 * link set, and a single join would multiply them together and leave the caller
 * un-fanning the product. The first statement is the authority check as well as
 * the read, so a plan this DM cannot see costs one query and returns `null`.
 */
export async function getSessionPlan(
  dmUserId: string,
  campaignId: string,
  planId: string,
): Promise<SessionPlanDetail | null> {
  if (!isRowId(campaignId) || !isRowId(planId)) return null

  const [plan] = await getDb()
    .select()
    .from(campaignSessionPlans)
    .where(
      and(
        eq(campaignSessionPlans.id, planId),
        eq(campaignSessionPlans.campaignId, campaignId),
        runByDm(campaignSessionPlans, dmUserId),
      ),
    )
    .limit(1)

  if (!plan) return null

  const [items, links] = await Promise.all([
    listPlanItems(dmUserId, campaignId, planId),
    listPlanLinks(dmUserId, campaignId, planId),
  ])

  return { plan, items, links }
}

/** A plan's lines, scenes before secrets, each list in its own order. */
async function listPlanItems(
  dmUserId: string,
  campaignId: string,
  planId: string,
): Promise<SessionPlanItem[]> {
  return getDb()
    .select()
    .from(sessionPlanItems)
    .where(
      and(eq(sessionPlanItems.planId, planId), ownedPlan(sessionPlanItems, dmUserId, campaignId)),
    )
    .orderBy(
      asc(sessionPlanItems.kind),
      asc(sessionPlanItems.sortOrder),
      asc(sessionPlanItems.createdAt),
    )
}

/**
 * A plan's links, resolved to the names the DM gave the things they point at.
 *
 * Three left joins and one statement, because a link is exactly one of the
 * three and the other two columns are null on every row — so the joins never
 * multiply. Only the name column of each target is selected: a plan screen
 * needs a tap target that says "Kelp Harbour", not a second copy of the
 * location's secrets riding down inside a page prop.
 */
async function listPlanLinks(
  dmUserId: string,
  campaignId: string,
  planId: string,
): Promise<ResolvedSessionPlanLink[]> {
  const rows = await getDb()
    .select({
      id: sessionPlanLinks.id,
      npcId: sessionPlanLinks.npcId,
      locationId: sessionPlanLinks.locationId,
      encounterId: sessionPlanLinks.encounterId,
      npcName: campaignNpcs.name,
      locationName: campaignLocations.name,
      encounterName: encounters.name,
    })
    .from(sessionPlanLinks)
    .leftJoin(campaignNpcs, eq(sessionPlanLinks.npcId, campaignNpcs.id))
    .leftJoin(campaignLocations, eq(sessionPlanLinks.locationId, campaignLocations.id))
    .leftJoin(encounters, eq(sessionPlanLinks.encounterId, encounters.id))
    .where(
      and(eq(sessionPlanLinks.planId, planId), ownedPlan(sessionPlanLinks, dmUserId, campaignId)),
    )
    .orderBy(asc(sessionPlanLinks.createdAt))

  return rows.flatMap((row): ResolvedSessionPlanLink[] => {
    // The CHECK guarantees exactly one target, so the first hit is the row's
    // kind. `flatMap` over `map` so a row that somehow had none is dropped
    // rather than rendered as an untappable blank.
    if (row.npcId)
      return [{ id: row.id, kind: 'npc', targetId: row.npcId, label: row.npcName ?? 'Unnamed' }]
    if (row.locationId)
      return [
        {
          id: row.id,
          kind: 'location',
          targetId: row.locationId,
          label: row.locationName ?? 'Unnamed',
        },
      ]
    if (row.encounterId)
      return [
        {
          id: row.id,
          kind: 'encounter',
          targetId: row.encounterId,
          label: row.encounterName ?? 'Unnamed',
        },
      ]
    return []
  })
}

/**
 * What the pickers may offer: the campaign's own prep, id and name only.
 *
 * Deliberately not `listCampaignNpcs` and friends. Those return both layers,
 * and a plan screen is a client component — handing it a full NPC row would
 * ship every secret in the campaign to the browser to render a list of names.
 * A DM's own browser is not a leak, but it is not the shape to build a habit
 * on, and the three columns this needs are three columns.
 */
export async function listSessionPlanTargets(
  dmUserId: string,
  campaignId: string,
): Promise<SessionPlanTargets | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const db = getDb()

  const [npcs, locations, fights] = await Promise.all([
    db
      .select({ id: campaignNpcs.id, name: campaignNpcs.name })
      .from(campaignNpcs)
      .where(and(eq(campaignNpcs.campaignId, campaignId), runByDm(campaignNpcs, dmUserId)))
      .orderBy(asc(campaignNpcs.name)),
    db
      .select({ id: campaignLocations.id, name: campaignLocations.name })
      .from(campaignLocations)
      .where(
        and(eq(campaignLocations.campaignId, campaignId), runByDm(campaignLocations, dmUserId)),
      )
      .orderBy(asc(campaignLocations.name)),
    db
      .select({ id: encounters.id, name: encounters.name })
      .from(encounters)
      .where(and(eq(encounters.campaignId, campaignId), runByDm(encounters, dmUserId)))
      .orderBy(asc(encounters.name)),
  ])

  return { npcs, locations, encounters: fights }
}

/**
 * Write a new plan into a campaign `dmUserId` runs.
 *
 * `revealed_at` is not settable here and is left to its nullable default: prep
 * starts hidden, and announcing a night is `dm-run-suite/reveal-controls`' act.
 */
export async function createSessionPlan(
  dmUserId: string,
  campaignId: string,
  input: NewSessionPlanInput,
): Promise<CampaignSessionPlan | null> {
  if (!isRowId(campaignId)) return null

  // Authority before the write: the insert cannot carry an EXISTS.
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const [plan] = await getDb()
    .insert(campaignSessionPlans)
    .values({ ...input, campaignId })
    .returning()

  return plan ?? null
}

/** Apply `patch` to one plan in a campaign `dmUserId` runs. `null` on a miss. */
export async function updateSessionPlan(
  dmUserId: string,
  campaignId: string,
  planId: string,
  patch: SessionPlanPatch,
): Promise<CampaignSessionPlan | null> {
  if (!isRowId(campaignId) || !isRowId(planId)) return null

  const [plan] = await getDb()
    .update(campaignSessionPlans)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(campaignSessionPlans.id, planId),
        eq(campaignSessionPlans.campaignId, campaignId),
        runByDm(campaignSessionPlans, dmUserId),
      ),
    )
    .returning()

  return plan ?? null
}

/**
 * Announce a night to the party, or take the announcement back
 * (`first-table/announce-the-night`) — `setLocationRevealed`'s statement,
 * against the fourth revealable table.
 *
 * The act D38 named for a plan and nothing wrote until now: the roster said
 * "Not announced" and meant it. What crosses when this stamps is only what
 * `sessionPlanPublicColumns` names — the title and the date — because the
 * player-facing reads in `discovered.ts` select that list and nothing else;
 * the strong start, the treasure, the scenes and the secrets are not on the
 * type to leak. `updateSessionPlan` stays as it was: an edit is prep the DM
 * alone reads, and this is the write that puts a night on five phones.
 */
export async function setSessionPlanRevealed(
  dmUserId: string,
  campaignId: string,
  planId: string,
  revealed: boolean,
): Promise<CampaignSessionPlan | null> {
  if (!isRowId(campaignId) || !isRowId(planId)) return null

  const [plan] = await getDb()
    .update(campaignSessionPlans)
    .set({ ...revealStamp(revealed), updatedAt: new Date() })
    .where(
      and(
        eq(campaignSessionPlans.id, planId),
        eq(campaignSessionPlans.campaignId, campaignId),
        runByDm(campaignSessionPlans, dmUserId),
      ),
    )
    .returning()

  return plan ?? null
}

/**
 * Delete one plan, and with it every scene, secret and link it owned — the
 * `ON DELETE cascade` on `plan_id` does that half. `false` on a miss.
 */
export async function deleteSessionPlan(
  dmUserId: string,
  campaignId: string,
  planId: string,
): Promise<boolean> {
  if (!isRowId(campaignId) || !isRowId(planId)) return false

  const deleted = await getDb()
    .delete(campaignSessionPlans)
    .where(
      and(
        eq(campaignSessionPlans.id, planId),
        eq(campaignSessionPlans.campaignId, campaignId),
        runByDm(campaignSessionPlans, dmUserId),
      ),
    )
    .returning({ id: campaignSessionPlans.id })

  return deleted.length > 0
}

/**
 * Add a line to the end of its list.
 *
 * The first statement does two jobs — it proves the DM owns the plan and it
 * reads the next `sort_order` for that kind — because an aggregate on its own
 * would return a row whether or not the plan exists, and could not tell the two
 * apart. Grouping by the plan's id makes "no such plan for you" no rows.
 */
export async function addSessionPlanItem(
  dmUserId: string,
  campaignId: string,
  planId: string,
  input: { kind: SessionPlanItemKind; body: string },
): Promise<SessionPlanItem | null> {
  if (!isRowId(campaignId) || !isRowId(planId)) return null

  const [slot] = await getDb()
    .select({
      // -1 + 1 = 0 for the first line of a kind, so orders stay 0-based.
      next: sql<number>`coalesce(max(${sessionPlanItems.sortOrder}), -1) + 1`.mapWith(Number),
    })
    .from(campaignSessionPlans)
    .leftJoin(
      sessionPlanItems,
      and(
        eq(sessionPlanItems.planId, campaignSessionPlans.id),
        eq(sessionPlanItems.kind, input.kind),
      ),
    )
    .where(
      and(
        eq(campaignSessionPlans.id, planId),
        eq(campaignSessionPlans.campaignId, campaignId),
        runByDm(campaignSessionPlans, dmUserId),
      ),
    )
    .groupBy(campaignSessionPlans.id)

  if (!slot) return null

  const [item] = await getDb()
    .insert(sessionPlanItems)
    .values({ planId, kind: input.kind, body: input.body, sortOrder: slot.next })
    .returning()

  return item ?? null
}

/**
 * Reword a line, tick it, or untick it.
 *
 * Ticking is the one write in this feature that happens *during* play, so it is
 * its own tiny statement and never part of a form save — one tap, one row, no
 * chance of a half-written scene going up with it.
 */
export async function updateSessionPlanItem(
  dmUserId: string,
  campaignId: string,
  planId: string,
  itemId: string,
  patch: { body?: string; checked?: boolean },
): Promise<SessionPlanItem | null> {
  if (!isRowId(campaignId) || !isRowId(planId) || !isRowId(itemId)) return null

  const [item] = await getDb()
    .update(sessionPlanItems)
    .set({
      ...(patch.body === undefined ? {} : { body: patch.body }),
      ...(patch.checked === undefined ? {} : checkStamp(patch.checked)),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sessionPlanItems.id, itemId),
        eq(sessionPlanItems.planId, planId),
        ownedPlan(sessionPlanItems, dmUserId, campaignId),
      ),
    )
    .returning()

  return item ?? null
}

/** Delete one line. `false` when there was nothing this DM could delete. */
export async function deleteSessionPlanItem(
  dmUserId: string,
  campaignId: string,
  planId: string,
  itemId: string,
): Promise<boolean> {
  if (!isRowId(campaignId) || !isRowId(planId) || !isRowId(itemId)) return false

  const deleted = await getDb()
    .delete(sessionPlanItems)
    .where(
      and(
        eq(sessionPlanItems.id, itemId),
        eq(sessionPlanItems.planId, planId),
        ownedPlan(sessionPlanItems, dmUserId, campaignId),
      ),
    )
    .returning({ id: sessionPlanItems.id })

  return deleted.length > 0
}

/**
 * Put one kind's lines in the order `ids` gives, and renumber them densely.
 *
 * The caller sends the **whole** list, and this refuses anything that is not
 * exactly the plan's current set for that kind. That is what makes a reorder
 * safe without a transaction, which `neon-http` does not have: a stale tab
 * missing a line someone else added is rejected outright rather than
 * renumbering half a list, and a replay of the same order is a no-op.
 *
 * One UPDATE with a CASE rather than one statement per line — ten round trips
 * with no transaction around them is exactly the shape that leaves an order
 * half-applied when a phone loses signal mid-tap.
 */
export async function reorderSessionPlanItems(
  dmUserId: string,
  campaignId: string,
  planId: string,
  kind: SessionPlanItemKind,
  ids: string[],
): Promise<SessionPlanItem[] | null> {
  if (!isRowId(campaignId) || !isRowId(planId)) return null
  if (ids.length === 0 || !ids.every(isRowId)) return null
  if (new Set(ids).size !== ids.length) return null

  const db = getDb()

  const current = await db
    .select({ id: sessionPlanItems.id })
    .from(sessionPlanItems)
    .where(
      and(
        eq(sessionPlanItems.planId, planId),
        eq(sessionPlanItems.kind, kind),
        ownedPlan(sessionPlanItems, dmUserId, campaignId),
      ),
    )

  // Same length and every submitted id present means the two sets are equal —
  // the submitted ids are already known to be distinct.
  const known = new Set(current.map((row) => row.id))
  if (known.size !== ids.length || !ids.every((id) => known.has(id))) return null

  const branches: SQL[] = ids.map(
    (id, index) => sql`when ${sessionPlanItems.id} = ${id} then ${index}`,
  )

  return db
    .update(sessionPlanItems)
    .set({
      sortOrder: sql`case ${sql.join(branches, sql` `)} else ${sessionPlanItems.sortOrder} end`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sessionPlanItems.planId, planId),
        eq(sessionPlanItems.kind, kind),
        inArray(sessionPlanItems.id, ids),
        ownedPlan(sessionPlanItems, dmUserId, campaignId),
      ),
    )
    .returning()
}

/**
 * Which column a link of each kind writes, and which table it points into.
 *
 * One map rather than a switch in three places: adding a fourth kind of link is
 * then a row here plus a column on the table, and the insert, the authority
 * check and the duplicate read all pick it up at once.
 */
const LINK_TARGETS = {
  npc: { key: 'npcId', column: sessionPlanLinks.npcId, table: campaignNpcs },
  location: { key: 'locationId', column: sessionPlanLinks.locationId, table: campaignLocations },
  encounter: { key: 'encounterId', column: sessionPlanLinks.encounterId, table: encounters },
} as const

/**
 * Point a plan at an NPC, a place or an encounter.
 *
 * Two things have to be true and one statement establishes both: the DM owns
 * the plan, **and** the target is in the same campaign. The second is not
 * paranoia — without it a plan could link an NPC out of another table the same
 * DM runs, and the plan screen would then show that campaign's prep on this
 * campaign's night.
 *
 * Idempotent: linking the same thing twice returns the link that already
 * exists rather than failing on the unique index. A double tap on a phone is
 * not an error worth a message.
 */
export async function addSessionPlanLink(
  dmUserId: string,
  campaignId: string,
  planId: string,
  kind: SessionPlanLinkKind,
  targetId: string,
): Promise<SessionPlanLink | null> {
  if (!isRowId(campaignId) || !isRowId(planId) || !isRowId(targetId)) return null

  const target = LINK_TARGETS[kind]
  const db = getDb()

  const [allowed] = await db
    .select({ one: sql`1` })
    .from(campaignSessionPlans)
    .where(
      and(
        eq(campaignSessionPlans.id, planId),
        eq(campaignSessionPlans.campaignId, campaignId),
        runByDm(campaignSessionPlans, dmUserId),
        exists(
          db
            .select({ one: sql`1` })
            .from(target.table)
            .where(and(eq(target.table.id, targetId), eq(target.table.campaignId, campaignId))),
        ),
      ),
    )
    .limit(1)

  if (!allowed) return null

  const [link] = await db
    .insert(sessionPlanLinks)
    .values({ planId, [target.key]: targetId })
    .onConflictDoNothing()
    .returning()

  if (link) return link

  // The unique index turned this into a no-op, which means the link is already
  // there. Hand back the existing row so a double tap reads as a success.
  const [existing] = await db
    .select()
    .from(sessionPlanLinks)
    .where(and(eq(sessionPlanLinks.planId, planId), eq(target.column, targetId)))
    .limit(1)

  return existing ?? null
}

/** Unlink one thing from a plan. `false` when there was nothing to unlink. */
export async function deleteSessionPlanLink(
  dmUserId: string,
  campaignId: string,
  planId: string,
  linkId: string,
): Promise<boolean> {
  if (!isRowId(campaignId) || !isRowId(planId) || !isRowId(linkId)) return false

  const deleted = await getDb()
    .delete(sessionPlanLinks)
    .where(
      and(
        eq(sessionPlanLinks.id, linkId),
        eq(sessionPlanLinks.planId, planId),
        ownedPlan(sessionPlanLinks, dmUserId, campaignId),
      ),
    )
    .returning({ id: sessionPlanLinks.id })

  return deleted.length > 0
}
