// The session log, derived (`dm-run-suite/session-log-recap`, D41).
//
// **Nothing in this file writes anything, and there is no session_log table.**
// The register's amendment is the whole design: what happened at a table is
// already recorded, five times over, by the acts that happened — a fight ended
// (`encounters.completed_at`), an NPC, a place or a handout was revealed
// (`revealed_at`), a scene or a secret was ticked off
// (`session_plan_items.checked_at`). A log table would be a sixth copy written
// at the same moment as each of those, on a driver with no transactions
// (`neon-http`), which is the shape that eventually disagrees with itself: a
// reveal that landed and a log line that did not, and no way to tell which
// happened. So the log is a query, and the acts stay the only writes.
//
// **What decides the window** is `campaign_notes.session_closed_at`: the log
// covers everything stamped since the DM last closed a session, and everything
// there is when they never have. That rule is a sentence a human can predict —
// close the session, and the next log starts empty — and it needs no
// open/close lifecycle table to hold it, because closing a session already
// writes a row (the recap).
//
// Authority is the campaign's, folded into every statement the same way the
// rest of the DM data layer does it: `campaigns.dm_user_id` and nowhere else.
// The pre-read settles it once so a campaign that is not this DM's reads as
// `null` rather than an empty log — the page 404s, exactly like every other DM
// surface — and each statement carries it again anyway, because five queries
// that each mean "this DM's campaign" should each say so.
import { and, asc, eq, gt, isNotNull } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

import { getDb } from './client'
import { getLastSessionClose, getOpenSessionNote, type CampaignNote } from './notes'
import { campaignRunBy, runByDm, type CampaignScopedTable } from './revealable'
import {
  campaignHandouts,
  campaignLocations,
  campaignNpcs,
  campaignSessionPlans,
  encounters,
  sessionPlanItems,
} from './schema'

/** What kind of act a log line records. `kind` is what the copy hangs off. */
export type SessionLogKind = 'encounter' | 'npc' | 'location' | 'handout' | 'scene' | 'secret'

/**
 * One thing that happened, as the log shows it and the recap draft says it.
 *
 * Three fields, because a log line is one act at one moment with one name on
 * it. Nothing here is a DM-only column: an NPC's secrets, a plan's treasure
 * and a handout's body are not selected by any statement below — the log is
 * read by the DM, but it is also the thing the recap draft is built from, and
 * a draft pre-filled with the twist nobody has found yet is a draft that
 * publishes it by accident.
 */
export interface SessionLogEntry {
  kind: SessionLogKind
  /** The row this came from — a stable React key, not a link. */
  id: string
  /** The name, title, or the line the DM wrote. Public layer only. */
  title: string
  at: Date
}

/** The session so far: what the app recorded, and what the DM typed. */
export interface SessionLog {
  /** The last close, or null when this campaign has never closed a session. */
  since: Date | null
  /** Everything stamped since `since`, oldest first — a log reads forwards. */
  entries: SessionLogEntry[]
  /**
   * Tonight's open note, when there is one: the DM's own quick-captured lines,
   * which are the half of a recap the app cannot derive. Null when nothing has
   * been captured today.
   */
  note: CampaignNote | null
}

/** "Stamped since the last close", as a WHERE fragment. Null means all of it. */
function stampedSince(column: PgColumn, since: Date | null) {
  return since === null ? isNotNull(column) : and(isNotNull(column), gt(column, since))
}

/** "This DM's campaign, and stamped since the last close", for one table. */
function loggable(
  table: CampaignScopedTable,
  column: PgColumn,
  dmUserId: string,
  campaignId: string,
  since: Date | null,
) {
  return and(
    eq(table.campaignId, campaignId),
    runByDm(table, dmUserId),
    stampedSince(column, since),
  )
}

/**
 * The session log for a campaign `dmUserId` runs, or `null` when there is no
 * such campaign for this DM — distinct from a campaign whose log is empty, so
 * the page 404s rather than offering to write up someone else's table.
 *
 * Five statements and two note reads rather than one UNION, run together. A
 * union would save round trips and cost the property that matters here: each
 * of these is a plainly readable "this campaign, this DM, this stamp, public
 * columns", which is what a reviewer has to be able to check line by line on
 * the query that feeds a draft the DM then publishes to the party.
 *
 * Sorted oldest first in TypeScript rather than in SQL, because the sort is
 * across five result sets and no statement can do it for the others. It is the
 * one piece of application-side logic in this file, and it decides *order*
 * only — never which rows come back, which is the thing WHERE clauses are for.
 */
export async function getSessionLog(
  dmUserId: string,
  campaignId: string,
): Promise<SessionLog | null> {
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const since = await getLastSessionClose(dmUserId, campaignId)

  // The note read leads: it is a plain async call rather than one of Drizzle's
  // lazy builders, so it starts the moment this array is built no matter where
  // it sits in it — and a list whose order does not match the order the
  // statements actually run in is a list that lies to the next reader.
  const [note, fights, npcs, locations, handouts, checked] = await Promise.all([
    getOpenSessionNote(dmUserId, campaignId),

    getDb()
      .select({ id: encounters.id, title: encounters.name, at: encounters.completedAt })
      .from(encounters)
      .where(loggable(encounters, encounters.completedAt, dmUserId, campaignId, since))
      .orderBy(asc(encounters.completedAt)),

    getDb()
      .select({ id: campaignNpcs.id, title: campaignNpcs.name, at: campaignNpcs.revealedAt })
      .from(campaignNpcs)
      .where(loggable(campaignNpcs, campaignNpcs.revealedAt, dmUserId, campaignId, since))
      .orderBy(asc(campaignNpcs.revealedAt)),

    getDb()
      .select({
        id: campaignLocations.id,
        title: campaignLocations.name,
        at: campaignLocations.revealedAt,
      })
      .from(campaignLocations)
      .where(loggable(campaignLocations, campaignLocations.revealedAt, dmUserId, campaignId, since))
      .orderBy(asc(campaignLocations.revealedAt)),

    getDb()
      .select({
        id: campaignHandouts.id,
        title: campaignHandouts.title,
        at: campaignHandouts.revealedAt,
      })
      .from(campaignHandouts)
      .where(loggable(campaignHandouts, campaignHandouts.revealedAt, dmUserId, campaignId, since))
      .orderBy(asc(campaignHandouts.revealedAt)),

    // The one join: a ticked line belongs to a plan, and the plan is what
    // belongs to the campaign. `kind` comes back as a column because a scene
    // and a secret are the same row and read as different lines in a recap.
    getDb()
      .select({
        id: sessionPlanItems.id,
        title: sessionPlanItems.body,
        at: sessionPlanItems.checkedAt,
        kind: sessionPlanItems.kind,
      })
      .from(sessionPlanItems)
      .innerJoin(campaignSessionPlans, eq(campaignSessionPlans.id, sessionPlanItems.planId))
      .where(
        and(
          eq(campaignSessionPlans.campaignId, campaignId),
          runByDm(campaignSessionPlans, dmUserId),
          stampedSince(sessionPlanItems.checkedAt, since),
        ),
      )
      .orderBy(asc(sessionPlanItems.checkedAt)),
  ])

  const entries: SessionLogEntry[] = [
    ...fights.map((row) => stamped('encounter', row)),
    ...npcs.map((row) => stamped('npc', row)),
    ...locations.map((row) => stamped('location', row)),
    ...handouts.map((row) => stamped('handout', row)),
    // `kind` is checked rather than cast: the column has a CHECK behind it, and
    // a row of some third kind would otherwise arrive typed as one it is not.
    ...checked.map((row) => stamped(row.kind === 'secret' ? 'secret' : 'scene', row)),
  ]

  entries.sort((a, b) => a.at.getTime() - b.at.getTime())

  return { since, entries, note }
}

/**
 * One selected row as a log entry.
 *
 * The `at` columns are all nullable in the schema and none of them can be null
 * here — every statement above carries `is not null` — so this coerces rather
 * than defends, and does it in the one place instead of five.
 */
function stamped(
  kind: SessionLogKind,
  row: { id: string; title: string; at: Date | null },
): SessionLogEntry {
  return { kind, id: row.id, title: row.title, at: row.at ?? new Date(0) }
}
