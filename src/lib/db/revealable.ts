// The revealable-entity pattern, as query helpers (D38, `dm-prep-suite`).
//
// The register's rule for everything a DM preps is one sentence: *a public
// layer, a DM-only layer, and a `revealed_at` timestamp; player-facing queries
// select public columns only*. `schema.ts` holds the column half of that
// (`revealableColumns()`); this file holds the query half, and both are shared
// so that `locations-handouts`, `session-plans` and `reveal-controls` inherit
// the rule instead of re-deriving it three times and getting it right twice.
//
// What is actually shared, and why each piece is here rather than copied:
//
// - **`runByDm`** — the EXISTS fragment that folds `campaigns.dm_user_id` into
//   a WHERE clause. Copied per entity, this is the arm someone eventually
//   forgets on the one statement that then reads another DM's table. Generic
//   over any table built with `revealableColumns()`, so a new prep table gets
//   it by construction and gets a compile error if it does not have the shape.
// - **`campaignRunBy`** — the pre-insert authority read. An INSERT cannot carry
//   an EXISTS, so every create in this family needs exactly this statement
//   first, and it is the only thing standing between a stranger and a row in
//   someone else's campaign.
// - **`seatedAt`** — `runByDm`'s player-side twin: the EXISTS fragment that
//   folds `campaign_members` into a WHERE clause. Separate from `runByDm`
//   rather than a role argument to it, because the two answer different
//   questions and a boolean flag between them is exactly the kind of thing that
//   gets passed the wrong way round on the one statement nobody re-reads.
// - **`revealedOnly`** — "the party has been shown this", for the player-facing
//   reads that `dm-run-suite/reveal-controls` adds. It exists *now*, unused by
//   any player surface, because the safety property it carries is easier to
//   state and test once than to remember later: null is hidden, and a player
//   query that forgets this arm leaks the DM's whole prep.
// - **`revealStamp`** — the write side of the same coin, so "revealed" is
//   spelled one way. Also `reveal-controls`' seam.
// - **`isRowId`** — ids arrive off URL segments; a malformed one is a miss, not
//   a Postgres type error.
//
// `notes.ts` and `encounters.ts` keep their own copies of the first two. They
// predate this file and converting them is a refactor of shipped authority
// code, which is not this ticket's risk to take — the next thing to touch
// either of them can adopt these.
import { and, eq, exists, isNotNull, sql } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

import { getDb } from './client'
import { campaignMembers, campaigns } from './schema'

/**
 * The minimum shape the *authority* fragments need: a table whose rows belong
 * to a campaign.
 *
 * Split out from {@link RevealableTable} by `dm-prep-suite/session-plans`,
 * which reads `encounters` alongside the prep tables to fill its pickers.
 * `encounters` is campaign-scoped in exactly the same way and predates
 * `revealableColumns()`, so demanding a `revealed_at` it has no business
 * carrying would have forced a second, hand-written copy of `runByDm` — which
 * is the one thing this module exists to prevent. Each helper below asks for
 * exactly the columns it reads, and nothing more.
 */
export interface CampaignScopedTable {
  campaignId: PgColumn
}

/**
 * The minimum shape of a revealable table, as the reveal helpers need it.
 *
 * Structural rather than a union of the concrete tables: a new prep table
 * satisfies it the moment it spreads `revealableColumns()`, and one that
 * spells its columns differently fails to compile at the call site rather
 * than at the database.
 */
export interface RevealableTable extends CampaignScopedTable {
  revealedAt: PgColumn
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids arrive off URL segments; a malformed one is a miss, not a Postgres error. */
export function isRowId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/**
 * "The DM runs the campaign this row belongs to", as a WHERE fragment.
 *
 * Written as an EXISTS rather than a join so it composes onto UPDATE and
 * DELETE unchanged — the three statements then carry *identical* authority,
 * which is what makes the property reviewable by reading one function.
 */
export function runByDm(table: CampaignScopedTable, dmUserId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(campaigns)
      .where(and(eq(campaigns.id, table.campaignId), eq(campaigns.dmUserId, dmUserId))),
  )
}

/** True when `dmUserId` runs `campaignId` — the pre-insert authority check. */
export async function campaignRunBy(dmUserId: string, campaignId: string): Promise<boolean> {
  if (!isRowId(campaignId)) return false

  const [row] = await getDb()
    .select({ one: sql`1` })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .limit(1)

  return row !== undefined
}

/**
 * "The person asking sits at this row's table", as a WHERE fragment — the
 * player-side counterpart to {@link runByDm}.
 *
 * **Membership, not authority.** `campaign_members` records where someone sits
 * and its `role` column grants nothing (see the warning on the table); what
 * this fragment establishes is only that the asker is at the table at all,
 * which is the right question for a read of content the DM has *already*
 * decided to publish. It is never sufficient on its own: every player-facing
 * read of a prep entity carries this **and** {@link revealedOnly}, and selects
 * a public-column list. Any one of the three alone is a leak.
 *
 * An EXISTS rather than a join for `runByDm`'s reason — it composes onto any
 * statement unchanged — and it also keeps the row count honest: a campaign a
 * player is seated at twice is not a thing, but a join that duplicated rows if
 * it were would be a bug found at the table.
 */
export function seatedAt(table: CampaignScopedTable, userId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(campaignMembers)
      .where(
        and(eq(campaignMembers.campaignId, table.campaignId), eq(campaignMembers.userId, userId)),
      ),
  )
}

/**
 * "The party has been shown this", as a WHERE fragment — the arm every
 * player-facing read of a prep entity must carry.
 *
 * Null is hidden. There is no second flag, no `is_revealed` boolean to fall out
 * of step with the timestamp, and no application-side filter applied after the
 * fact: a row a player may not see is one the statement never selected.
 */
export function revealedOnly(table: RevealableTable) {
  return isNotNull(table.revealedAt)
}

/**
 * The `revealed_at` value for a reveal or an un-reveal, as a patch fragment.
 *
 * Revealing stamps *now*; un-revealing clears the timestamp rather than keeping
 * it beside a false flag, so "when did they learn this" can never answer for a
 * thing they no longer know.
 */
export function revealStamp(revealed: boolean): { revealedAt: Date | null } {
  return { revealedAt: revealed ? new Date() : null }
}
