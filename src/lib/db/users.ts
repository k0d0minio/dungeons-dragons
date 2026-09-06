// The DM's view of every account (`user-management/invites-and-roles`).
//
// "Every account" means `neon_auth.user`, not the campaign rosters: a friend
// who signed up and never joined a campaign is exactly the person the DM needs
// to see here. The role comes from `user_roles` by LEFT JOIN, and a missing row
// reads as `player` for the same reason `getUserRole` reads it that way (D19).
//
// This module is what the `/dm/users` page and its API routes read and write,
// including `deleteUserAccount` at the bottom — the one thing here that
// reaches into `neon_auth`, and the reason that section carries its own
// ordering argument. Nothing here checks *who is asking* — that is the
// route's job, and it answers 403 to anyone who is not the DM before any of
// this runs.
import { asc, eq, or, sql } from 'drizzle-orm'

import { getDb } from './client'
import { authAccounts, authSessions, authUsers } from './neon-auth'
import {
  campaignMembers,
  campaigns,
  characters,
  userInvites,
  userRoles,
  USER_ROLES,
  type UserRole,
} from './schema'

/** One account as the DM's list renders it. */
export interface ManagedUser {
  id: string
  name: string
  email: string
  createdAt: Date
  role: UserRole
  characterCount: number
  campaignCount: number
}

/** Narrow unknown input to a role the schema's check constraint would accept. */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value)
}

/**
 * The account name behind a character's `owner_id`, for "played by" on the
 * DM's profile page (`first-table/dm-character-profile`) — so the DM does not
 * have to match "Wobbles Wobbleton II" to a friend from memory. `null` for an
 * owner Neon Auth no longer knows.
 *
 * Read one at a time, on the one page that needs it, rather than folded into
 * the roster the glance polls every fifteen seconds. The cast is on the auth
 * side (`uuid::text`), never on ours: an `owner_id` that is not uuid-shaped
 * would make a `::uuid` cast a Postgres error rather than a miss.
 */
export async function getUserName(userId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ name: authUsers.name })
    .from(authUsers)
    .where(eq(sql`${authUsers.id}::text`, userId))
    .limit(1)

  return row?.name ?? null
}

/**
 * Every account, oldest first, with its role and how much of the app it has
 * touched. The counts are correlated subqueries rather than joins so a player
 * with three characters is still one row.
 *
 * `neon_auth.user.id` is a uuid and every `*_user_id` column in this schema is
 * text, so the comparison casts on the auth side — a bare `=` would be a
 * Postgres type error, not a silent miss.
 */
export async function listUsers(): Promise<ManagedUser[]> {
  const userId = sql<string>`${authUsers.id}::text`

  const rows = await getDb()
    .select({
      id: userId,
      name: authUsers.name,
      email: authUsers.email,
      createdAt: authUsers.createdAt,
      role: userRoles.role,
      characterCount: sql<number>`(
        select count(*) from ${characters} where ${characters.ownerId} = ${userId}
      )`.mapWith(Number),
      campaignCount: sql<number>`(
        select count(*) from ${campaignMembers} where ${campaignMembers.userId} = ${userId}
      )`.mapWith(Number),
    })
    .from(authUsers)
    .leftJoin(userRoles, eq(userRoles.userId, userId))
    .orderBy(asc(authUsers.createdAt))

  return rows.map((row) => ({
    ...row,
    role: row.role === 'dm' ? 'dm' : 'player',
  }))
}

/**
 * Give `userId` a role. An upsert, because "no row" is a legitimate state
 * (D19) that this is often the first write over. Whether the caller may do
 * this — and in particular that nobody may do it to themselves — is decided
 * on the route, not here.
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await getDb()
    .insert(userRoles)
    .values({ userId, role })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: { role, updatedAt: new Date() },
    })
}

// ---------------------------------------------------------------------------
// Deleting an account (`triage/account-deletion-from-users-page`)
// ---------------------------------------------------------------------------

/** Ids come off a URL; anything not uuid-shaped is a miss before it reaches the database. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** What a completed deletion took with it, so the DM is told rather than reassured. */
export interface DeletedUserTally {
  characters: number
  campaignMembers: number
  invites: number
  roles: number
  sessions: number
  accounts: number
}

/**
 * The three ways this ends. `runs-campaigns` is a refusal, not a failure — see
 * {@link deleteUserAccount}.
 */
export type DeleteUserResult =
  | { outcome: 'deleted'; tally: DeletedUserTally }
  | { outcome: 'missing' }
  | { outcome: 'runs-campaigns'; campaigns: number }

/**
 * Remove an account and everything it owns
 * (`triage/account-deletion-from-users-page`). The Article 17 path DND-044
 * flagged and the runbook used to describe as hand-written SQL.
 *
 * **Refuses an account that runs a campaign.** `campaigns.dm_user_id` is the
 * only thing that says who runs one, it is `NOT NULL`, and DND-027's viewer
 * predicate is an equality against it — so deleting its user would leave a
 * campaign nobody can see and nobody can delete, with the party's notes,
 * handouts, NPCs and encounters sealed inside. The caller gets
 * `runs-campaigns` and the DM is told to delete or hand over the campaign
 * first. Nothing has been deleted when that comes back.
 *
 * **The order is the design.** `neon-http` has no transactions, so this is
 * eight independent statements and every prefix of it is a state the app can
 * be left in. The order makes each of those states the benign kind: the
 * account stays *listed on `/dm/users`* until the very last statement, with
 * its counts falling as the earlier ones land, and pressing Delete again
 * resumes from wherever it stopped — every statement here is idempotent, so a
 * re-run costs nothing. The reverse order is the one with no way back: remove
 * the `neon_auth.user` row first and a failure after it strands characters and
 * memberships under an id that no longer exists — invisible to this page,
 * unreachable by their owner, and removable only by the hand-written SQL this
 * exists to retire.
 *
 * Sessions go **first**, before any data: until they do, the person being
 * deleted may still be signed in on a phone, and a character created after
 * step 5 would be orphaned by step 8. With their sessions gone every write
 * route answers 401. The `neon_auth` rows go **last**, because that grant is
 * inherited from the `neon_auth` role rather than granted to ours — if Neon
 * ever withdraws it, the statement that fails is the last one, over an account
 * already emptied and still on the page.
 *
 * The `neon_auth` deletes need a uuid: `neon_auth.user.id` is a `uuid` column
 * while every `*_user_id` here is `text`, so an id that is not uuid-shaped is
 * `missing` rather than a `22P02` from the driver.
 *
 * See `.icm/docs/2026-09-04-account-deletion-privileges.md` for the privilege
 * and cascade evidence this is built on.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteUserResult> {
  if (!UUID_PATTERN.test(userId)) return { outcome: 'missing' }

  const db = getDb()

  const [account] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)

  if (!account) return { outcome: 'missing' }

  const runs = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.dmUserId, userId))

  if (runs.length > 0) return { outcome: 'runs-campaigns', campaigns: runs.length }

  // 1 — access first, so nothing new can be written under this id while the rest runs.
  const sessions = await db
    .delete(authSessions)
    .where(eq(authSessions.userId, userId))
    .returning({ id: authSessions.id })

  // 2 — the links they minted, and the one that admitted them. `user_invites`
  // is otherwise append-only (the DM's record of who came in on what); erasure
  // is the one thing that outranks the record, and both columns carry the id.
  const invites = await db
    .delete(userInvites)
    .where(or(eq(userInvites.createdBy, userId), eq(userInvites.claimedByUserId, userId)))
    .returning({ id: userInvites.id })

  // 3 — their global role.
  const roles = await db
    .delete(userRoles)
    .where(eq(userRoles.userId, userId))
    .returning({ userId: userRoles.userId })

  // 4 — their seats at other people's tables.
  const memberships = await db
    .delete(campaignMembers)
    .where(eq(campaignMembers.userId, userId))
    .returning({ campaignId: campaignMembers.campaignId })

  // 5 — their characters, and with them (by cascade) items, private notes,
  // roster links and any combatant rows standing on a tracker.
  const owned = await db
    .delete(characters)
    .where(eq(characters.ownerId, userId))
    .returning({ id: characters.id })

  // 6 — the password row. `account.userId` cascades from the user, so this is
  // explicit for order's sake: after it the account cannot be signed into even
  // if step 7 never runs.
  const credentials = await db
    .delete(authAccounts)
    .where(eq(authAccounts.userId, userId))
    .returning({ id: authAccounts.id })

  // 7 — the account itself. Last, and it takes anything left in `neon_auth`
  // with it: `session`, `account`, `member` and `invitation` all reference
  // `user.id` ON DELETE CASCADE.
  await db.delete(authUsers).where(eq(authUsers.id, userId))

  return {
    outcome: 'deleted',
    tally: {
      characters: owned.length,
      campaignMembers: memberships.length,
      invites: invites.length,
      roles: roles.length,
      sessions: sessions.length,
      accounts: credentials.length,
    },
  }
}
