// The DM's view of every account (`user-management/invites-and-roles`).
//
// "Every account" means `neon_auth.user`, not the campaign rosters: a friend
// who signed up and never joined a campaign is exactly the person the DM needs
// to see here. The role comes from `user_roles` by LEFT JOIN, and a missing row
// reads as `player` for the same reason `getUserRole` reads it that way (D19).
//
// This module is what the `/dm/users` page and its API route read and write.
// Nothing here checks *who is asking* — that is the route's job, and it
// answers 403 to anyone who is not the DM before any of this runs.
import { asc, eq, sql } from 'drizzle-orm'

import { getDb } from './client'
import { authUsers } from './neon-auth'
import { campaignMembers, characters, userRoles, USER_ROLES, type UserRole } from './schema'

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
