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
// **One night, read backwards** (`dm-chronology/session-chain`): that rule
// generalises without changing. A close is a boundary, so two consecutive
// closes are a night's window, and `campaign_notes.plan_id` says which plan
// the night between them ran from. `getSessionLog` is still the open window —
// what the recap is written from — and beside it `getSessionLogWindow` reads
// one closed night, and `listNights` reads the whole timeline. All three are
// the same five queries; only the bounds differ.
//
// Authority is the campaign's, folded into every statement the same way the
// rest of the DM data layer does it: `campaigns.dm_user_id` and nowhere else.
// The pre-read settles it once so a campaign that is not this DM's reads as
// `null` rather than an empty log — the page 404s, exactly like every other DM
// surface — and each statement carries it again anyway, because five queries
// that each mean "this DM's campaign" should each say so.
import { and, asc, desc, eq, gt, isNotNull, lte, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

import { todaySessionDate } from '@/lib/notes/schema'

import { getDb } from './client'
import { getLastSessionClose, getOpenSessionNote, type CampaignNote } from './notes'
import { campaignRunBy, runByDm, type CampaignScopedTable } from './revealable'
import { sessionPlanPublicColumns, type PublicSessionPlan } from './session-plans'
import {
  campaignHandouts,
  campaignLocations,
  campaignNotes,
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

/**
 * "Stamped inside this night's window", as a WHERE fragment.
 *
 * The window is **`(since, until]`** — open at the start, closed at the end —
 * and that is not an arbitrary choice of brackets: `since` and `until` are
 * both close stamps, and a close stamp belongs to the night it ended. Half-open
 * the other way would put every recap's own closing act at the top of the next
 * night; closed at both ends would count a close twice, once per side. So an
 * act at exactly `until` is this night's last act, and the next night starts
 * after it.
 *
 * Null means unbounded on that side: `since = null` is a campaign that has
 * never closed a session, `until = null` is the window still open tonight.
 */
function stampedIn(column: PgColumn, since: Date | null, until: Date | null) {
  return and(
    isNotNull(column),
    since === null ? undefined : gt(column, since),
    until === null ? undefined : lte(column, until),
  )
}

/** "This DM's campaign, and stamped inside this night's window", for one table. */
function loggable(
  table: CampaignScopedTable,
  column: PgColumn,
  dmUserId: string,
  campaignId: string,
  since: Date | null,
  until: Date | null,
) {
  return and(
    eq(table.campaignId, campaignId),
    runByDm(table, dmUserId),
    stampedIn(column, since, until),
  )
}

/**
 * The same window arithmetic {@link stampedIn} writes in SQL, in TypeScript —
 * `(since, until]` over entries already read.
 *
 * It exists because {@link listNights} reads a campaign's acts **once** and
 * cuts them into nights, rather than running the five statements again per
 * night: a season of play is one page, and twenty nights would be a hundred
 * round trips to say what one pass already knows. The two spellings are the
 * one rule, and they are tested against the same boundary fixtures so they
 * cannot drift into disagreeing about which night a close stamp belongs to.
 */
export function entriesInWindow(
  entries: readonly SessionLogEntry[],
  since: Date | null,
  until: Date | null,
): SessionLogEntry[] {
  return entries.filter(
    (entry) =>
      (since === null || entry.at.getTime() > since.getTime()) &&
      (until === null || entry.at.getTime() <= until.getTime()),
  )
}

/**
 * Every act stamped inside one window, oldest first — the five reads the log
 * is made of, with the window they run against as an argument.
 *
 * Five statements rather than one UNION. A union would save round trips and
 * cost the property that matters here: each of these is a plainly readable
 * "this campaign, this DM, this stamp, public columns", which is what a
 * reviewer has to be able to check line by line on the query that feeds a
 * draft the DM then publishes to the party.
 *
 * Sorted oldest first in TypeScript rather than in SQL, because the sort is
 * across five result sets and no statement can do it for the others. It is the
 * one piece of application-side logic here, and it decides *order* only —
 * never which rows come back, which is the thing WHERE clauses are for.
 *
 * **No authority check of its own**, deliberately: every one of the five
 * statements folds `campaigns.dm_user_id` in through `runByDm`, so a campaign
 * this DM does not run reads as no rows rather than as someone else's night.
 * The two exported callers do the pre-read as well, so a miss is `null` (a
 * 404) rather than an empty log for a table that is not theirs.
 */
async function readEntries(
  dmUserId: string,
  campaignId: string,
  since: Date | null,
  until: Date | null,
): Promise<SessionLogEntry[]> {
  const [fights, npcs, locations, handouts, checked] = await Promise.all([
    getDb()
      .select({ id: encounters.id, title: encounters.name, at: encounters.completedAt })
      .from(encounters)
      .where(loggable(encounters, encounters.completedAt, dmUserId, campaignId, since, until))
      .orderBy(asc(encounters.completedAt)),

    getDb()
      .select({ id: campaignNpcs.id, title: campaignNpcs.name, at: campaignNpcs.revealedAt })
      .from(campaignNpcs)
      .where(loggable(campaignNpcs, campaignNpcs.revealedAt, dmUserId, campaignId, since, until))
      .orderBy(asc(campaignNpcs.revealedAt)),

    getDb()
      .select({
        id: campaignLocations.id,
        title: campaignLocations.name,
        at: campaignLocations.revealedAt,
      })
      .from(campaignLocations)
      .where(
        loggable(
          campaignLocations,
          campaignLocations.revealedAt,
          dmUserId,
          campaignId,
          since,
          until,
        ),
      )
      .orderBy(asc(campaignLocations.revealedAt)),

    getDb()
      .select({
        id: campaignHandouts.id,
        title: campaignHandouts.title,
        at: campaignHandouts.revealedAt,
      })
      .from(campaignHandouts)
      .where(
        loggable(campaignHandouts, campaignHandouts.revealedAt, dmUserId, campaignId, since, until),
      )
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
          stampedIn(sessionPlanItems.checkedAt, since, until),
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

  return entries
}

/**
 * The session log for a campaign `dmUserId` runs, or `null` when there is no
 * such campaign for this DM — distinct from a campaign whose log is empty, so
 * the page 404s rather than offering to write up someone else's table.
 *
 * **The open window, and it keeps that meaning** (`dm-chronology/session-chain`):
 * everything stamped since the last close, which is what the close-session
 * step writes its recap from. The per-night reads below are the *other*
 * question — what happened on a night that is already closed — and they are
 * separate functions rather than an argument to this one, because the screen
 * that asks each is a different screen.
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
  const [note, entries] = await Promise.all([
    getOpenSessionNote(dmUserId, campaignId),
    readEntries(dmUserId, campaignId, since, null),
  ])

  return { since, entries, note }
}

/**
 * The acts of one night: everything stamped in `(since, until]`, oldest first,
 * or `null` when there is no such campaign for this DM.
 *
 * The night page's read (`dm-chronology/sessions-tab`) — a closed night is a
 * window with both ends known, and this is the same five statements the open
 * log runs, given both of them. Nothing here writes, and nothing here is a
 * second definition of what a night contains: {@link getSessionLog} is this
 * function with `until` left open.
 */
export async function getSessionLogWindow(
  dmUserId: string,
  campaignId: string,
  since: Date | null,
  until: Date | null,
): Promise<SessionLogEntry[] | null> {
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  return readEntries(dmUserId, campaignId, since, until)
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

/**
 * What a night in the timeline is, when it is read.
 *
 * `played` — a session the DM closed: it has a recap, and its acts are the
 * ones stamped in its window. `tonight` — the window still open, when
 * anything has happened in it or a plan is dated today. `upcoming` — a plan
 * with no recap on it yet, which is a night nobody has run.
 */
export type SessionNightKind = 'played' | 'tonight' | 'upcoming'

/** A night's plan, the public columns only, plus when it was written. */
export type NightPlan = PublicSessionPlan & { createdAt: Date }

/**
 * One night of a campaign, as the Sessions timeline reads it
 * (`dm-chronology/session-chain`) — the plan, what happened, the recap, in one
 * shape, because that is what a night *is*.
 */
export interface SessionNight {
  kind: SessionNightKind
  /** A stable React key: the recap's id, the plan's id, or `'tonight'`. */
  id: string
  /** The night, `YYYY-MM-DD`, or null for a plan with no date on it yet. */
  date: string | null
  /** The window this night's acts fall in — `(since, until]`. */
  since: Date | null
  until: Date | null
  /** The published recap, on a night that was closed. */
  recap: CampaignNote | null
  /** The plan the night ran from, by `campaign_notes.plan_id`. */
  plan: NightPlan | null
  /** What the app recorded, oldest first. Empty on a night not yet run. */
  entries: SessionLogEntry[]
  /** The DM's own notes for that night — never a recap, which is `recap`. */
  notes: CampaignNote[]
}

/** Newest first, and a night nobody has dated is the one being written now. */
const NIGHT_RANK: Record<SessionNightKind, number> = { upcoming: 0, tonight: 1, played: 2 }

/**
 * The campaign's nights, newest first, for a DM who runs it — or `null` when
 * there is no such campaign for this DM, so the page 404s.
 *
 * **The chain, read backwards.** A recap is a night that was played: the
 * column `dm-chronology/session-chain` added says which plan it ran from, and
 * the window between the close before it and its own close says what happened
 * while it ran. A plan with no recap pointing at it has not been played yet.
 * The window still open is tonight, when there is anything in it to show.
 *
 * **Nothing here writes**, and no statement selects a DM-only column: the
 * plans come back as {@link sessionPlanPublicColumns}, so a night's strong
 * start and its treasure are not reachable from a timeline at all. That is not
 * about who reads this screen — it is the DM's — but about what the screen can
 * hand onwards to a recap draft the DM then publishes to the party.
 *
 * **Three statements and one pass of the five log reads**, not five per night:
 * the acts of a whole campaign are read once and cut into windows by
 * {@link entriesInWindow}, because a season of play is one page and a hundred
 * round trips to draw it is a page that never loads at a table.
 *
 * The notes hanging off a night are the ones **dated** that night — the same
 * rule that decides which note a quick capture lands in (`appendToSessionNote`)
 * — minus anything typed after the close, which is the next night's first line
 * and belongs to tonight. A note dated a night that was never closed waits for
 * one: it is in tonight's open window until a recap claims it.
 */
export async function listNights(
  dmUserId: string,
  campaignId: string,
): Promise<SessionNight[] | null> {
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  // The five derived reads lead, for the reason `getSessionLog` lists its note
  // read first: `readEntries` is a plain async call and issues its statements
  // the moment this array is built, while Drizzle's builders are lazy and go
  // out after it. The list is written in the order the statements actually
  // run in, because one that is not is a list that lies to the next reader.
  const [entries, notes, plans] = await Promise.all([
    readEntries(dmUserId, campaignId, null, null),

    getDb()
      .select()
      .from(campaignNotes)
      .where(and(eq(campaignNotes.campaignId, campaignId), runByDm(campaignNotes, dmUserId)))
      .orderBy(asc(campaignNotes.createdAt)),

    getDb()
      .select({ ...sessionPlanPublicColumns, createdAt: campaignSessionPlans.createdAt })
      .from(campaignSessionPlans)
      .where(
        and(
          eq(campaignSessionPlans.campaignId, campaignId),
          runByDm(campaignSessionPlans, dmUserId),
        ),
      )
      .orderBy(
        sql`${campaignSessionPlans.sessionDate} desc nulls first`,
        desc(campaignSessionPlans.createdAt),
      ),
  ])

  const planById = new Map(plans.map((plan) => [plan.id, plan]))
  const openNotes = notes.filter((note) => note.sessionClosedAt === null)

  // Oldest close first: each night's window starts where the one before it
  // ended, and the first night of a campaign reaches back to its beginning.
  const recaps = notes
    .filter(
      (note): note is CampaignNote & { sessionClosedAt: Date } => note.sessionClosedAt !== null,
    )
    .sort((a, b) => a.sessionClosedAt.getTime() - b.sessionClosedAt.getTime())

  // Each night's window ends at its own close and starts at the one before
  // it; the first reaches back to `null`, which is the beginning of the
  // campaign — the same answer `getLastSessionClose` gives a table that has
  // never closed a session.
  const closes = recaps.map((recap) => recap.sessionClosedAt)

  const played = recaps.map((recap, index): SessionNight => {
    const since = index === 0 ? null : closes[index - 1]
    const until = closes[index]

    return {
      kind: 'played',
      id: recap.id,
      date: recap.sessionDate,
      since,
      until,
      recap,
      plan: recap.planId === null ? null : (planById.get(recap.planId) ?? null),
      entries: entriesInWindow(entries, since, until),
      notes: openNotes.filter(
        (note) =>
          note.sessionDate === recap.sessionDate && note.createdAt.getTime() <= until.getTime(),
      ),
    }
  })

  // The boundary `getSessionLog` measures the open window from, arrived at by
  // walking the same rows.
  const lastClose = closes.at(-1) ?? null
  const today = todaySessionDate()
  const linked = new Set(recaps.map((recap) => recap.planId))

  const openEntries = entriesInWindow(entries, lastClose, null)
  const openTonight = openNotes.filter(
    (note) =>
      note.sessionDate === today &&
      (lastClose === null || note.createdAt.getTime() > lastClose.getTime()),
  )
  const tonightsPlan = plans.find((plan) => plan.sessionDate === today && !linked.has(plan.id))

  const tonight: SessionNight[] =
    openEntries.length > 0 || openTonight.length > 0 || tonightsPlan
      ? [
          {
            kind: 'tonight',
            id: 'tonight',
            date: today,
            since: lastClose,
            until: null,
            recap: null,
            plan: tonightsPlan ?? null,
            entries: openEntries,
            notes: openTonight,
          },
        ]
      : []

  const upcoming = plans
    .filter((plan) => !linked.has(plan.id) && plan.id !== tonightsPlan?.id)
    .map((plan): SessionNight => ({
      kind: 'upcoming',
      id: plan.id,
      date: plan.sessionDate,
      since: null,
      until: null,
      recap: null,
      plan,
      entries: [],
      notes: [],
    }))

  // Newest first, and a plan with no date on it is the night being written
  // now, so it leads. Ties are broken by kind — a plan for a date sits above
  // the recap of it — and then by the order each list arrived in, which is
  // already newest first.
  return [...upcoming, ...tonight, ...played.reverse()].sort((a, b) => {
    if (a.date !== b.date) {
      if (a.date === null) return -1
      if (b.date === null) return 1
      return b.date.localeCompare(a.date)
    }

    return NIGHT_RANK[a.kind] - NIGHT_RANK[b.kind]
  })
}
