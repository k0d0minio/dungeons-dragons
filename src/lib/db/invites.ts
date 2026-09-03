// Tokenised invites (`user-management/invites-and-roles`).
//
// One link, one person, one role. The DM mints an invite from `/dm/users`; the
// link `/invite/<token>` is what they send. The token is the credential — the
// auth proxy lets a sign-up through when the cookie it carries names a
// claimable invite, exactly as it lets one through on the shared code (D20) —
// and claiming it is what writes the role, so a friend arrives already a
// player (or, rarely, a DM) with nobody editing a table afterwards.
//
// A claimable invite is one that is unclaimed, unrevoked and not yet expired;
// the three columns are always read together, in `claimable()`, so there is
// one definition of "still good". Rows are never deleted: a revoked or claimed
// invite is the DM's record of who came in on what.
//
// `neon-http` cannot do transactions, so `claimInvite` is ordered to fail
// benignly: the claim is a single conditional UPDATE (so two racing sign-ups on
// one link cannot both win), and the role write follows it. A role write that
// fails leaves a claimed invite and a player — visible on `/dm/users`, and one
// tap to fix there.
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'

import { generateJoinCode } from './campaigns'
import { getDb } from './client'
import { userInvites, userRoles, type UserInviteRow, type UserRole } from './schema'

export type { UserInviteRow } from './schema'

/** How long a fresh link stays good. Two weeks: long enough to sign up at leisure. */
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** A new token: D24's 128 random bits, base64url, shared with join codes. */
export function generateInviteToken(): string {
  return generateJoinCode()
}

/**
 * Tokens come off URLs and cookies; anything not token-shaped is a miss
 * before it reaches the database. The same alphabet and bounds as join
 * codes, and deliberately wide enough that no real token fails it.
 */
export function isInviteToken(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(value)
}

/** What the invite page and the DM's list show — everything but the who-made-it. */
export type InviteStatus = 'open' | 'claimed' | 'revoked' | 'expired'

/** The one reading of an invite's three closing columns. */
export function inviteStatus(invite: UserInviteRow, now: Date = new Date()): InviteStatus {
  if (invite.claimedAt) return 'claimed'
  if (invite.revokedAt) return 'revoked'
  if (invite.expiresAt.getTime() <= now.getTime()) return 'expired'
  return 'open'
}

/** The SQL half of `inviteStatus() === 'open'`, for the WHERE clauses below. */
function claimable(now: Date) {
  return and(
    isNull(userInvites.claimedAt),
    isNull(userInvites.revokedAt),
    gt(userInvites.expiresAt, now),
  )
}

export interface NewInvite {
  createdBy: string
  role: UserRole
  label?: string | null
  email?: string | null
}

/** Mint an invite. The token is generated here; the caller gets the row back. */
export async function createInvite(input: NewInvite): Promise<UserInviteRow> {
  const now = new Date()

  const [invite] = await getDb()
    .insert(userInvites)
    .values({
      token: generateInviteToken(),
      role: input.role,
      label: input.label?.trim() || null,
      email: input.email?.trim() || null,
      createdBy: input.createdBy,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    })
    .returning()

  return invite
}

/** Every invite ever made, newest first — the DM's record. */
export async function listInvites(): Promise<UserInviteRow[]> {
  return getDb().select().from(userInvites).orderBy(desc(userInvites.createdAt))
}

/**
 * The invite `token` names, if it can still be claimed; otherwise `null`. A
 * used, revoked, expired or unknown token all read the same from outside —
 * "this link no longer works" — and that is deliberate.
 */
export async function findClaimableInvite(token: string): Promise<UserInviteRow | null> {
  if (!isInviteToken(token)) return null

  const [invite] = await getDb()
    .select()
    .from(userInvites)
    .where(and(eq(userInvites.token, token), claimable(new Date())))
    .limit(1)

  return invite ?? null
}

/**
 * Close an invite early. Only an open invite is revoked — a claimed one is
 * history, and its user keeps the role they were given (the DM changes that on
 * the user, not the invite). Returns the row, or `null` if there was nothing
 * open to revoke.
 */
export async function revokeInvite(id: string): Promise<UserInviteRow | null> {
  const [invite] = await getDb()
    .update(userInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(userInvites.id, id), claimable(new Date())))
    .returning()

  return invite ?? null
}

/**
 * Claim `token` for `userId` and give them the invite's role.
 *
 * The claim is one conditional UPDATE: if the invite was open a heartbeat ago
 * and someone else got there first, the WHERE clause finds nothing and this
 * returns `null` with nothing written. The role write follows. It is an upsert
 * that **never demotes a DM**: a player-role link opened by the DM's own
 * account — testing it, most likely — must not turn the one `dm` row into a
 * player, because that would lock the DM out of the tools that make invites.
 */
export async function claimInvite(token: string, userId: string): Promise<UserInviteRow | null> {
  if (!isInviteToken(token)) return null

  const now = new Date()

  const [invite] = await getDb()
    .update(userInvites)
    .set({ claimedAt: now, claimedByUserId: userId })
    .where(and(eq(userInvites.token, token), claimable(now)))
    .returning()

  if (!invite) return null

  const role: UserRole = invite.role === 'dm' ? 'dm' : 'player'

  await getDb()
    .insert(userRoles)
    .values({ userId, role })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: {
        role: sql`case when ${userRoles.role} = 'dm' then 'dm' else ${role} end`,
        updatedAt: now,
      },
    })

  return invite
}
