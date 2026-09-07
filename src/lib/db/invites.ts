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
// An invite may also carry a campaign (`dm-chronology/one-link-invite`).
// Bringing a friend in used to be two links — this one to make the account,
// then the campaign's join code once they had one — and one of the two always
// arrived on the wrong evening. An invite minted from a campaign's settings
// page carries `campaign_id`, and claiming it seats them there in the same
// breath, through `seatOnCampaign` — the same row the join code writes. An
// invite minted from `/dm/users` carries none and behaves exactly as before.
//
// `neon-http` cannot do transactions, so `claimInvite` is ordered to fail
// benignly: the claim is a single conditional UPDATE (so two racing sign-ups on
// one link cannot both win), the role write follows it, and the roster seat
// follows that. A role write that fails leaves a claimed invite and a player —
// visible on `/dm/users`, and one tap to fix there. A seat that fails leaves an
// account that is not yet at the table, which the campaign's join link still
// fixes; the seat is last because it is the only step the DM has another way
// to perform.
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'

import { generateJoinCode, seatOnCampaign } from './campaigns'
import { getDb } from './client'
import { campaigns, userInvites, userRoles, type UserInviteRow, type UserRole } from './schema'

export type { UserInviteRow } from './schema'

/**
 * An invite plus the name of the campaign it seats at, when it carries one.
 *
 * The name is read in the same statement rather than by a second lookup keyed
 * on `campaign_id`, because the only caller that needs it is the public invite
 * landing (`src/app/invite/[token]/page.tsx`): a standalone "campaign name by
 * id" read would be a public door onto the campaigns table, and this join is
 * one that can only be reached by presenting a live token.
 */
export interface InviteWithCampaign extends UserInviteRow {
  campaignName: string | null
}

/** The select list behind `InviteWithCampaign` — the whole row, plus one name. */
function inviteWithCampaignColumns() {
  return { invite: userInvites, campaignName: campaigns.name }
}

/** Flatten what `inviteWithCampaignColumns()` selects into one object. */
function withCampaign(row: { invite: UserInviteRow; campaignName: string | null }) {
  return { ...row.invite, campaignName: row.campaignName }
}

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
  /** The table this link also seats them at. The caller checks it is the DM's. */
  campaignId?: string | null
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
      campaignId: input.campaignId ?? null,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    })
    .returning()

  return invite
}

/** Every invite ever made, newest first — the DM's record, with the table named. */
export async function listInvites(): Promise<InviteWithCampaign[]> {
  const rows = await getDb()
    .select(inviteWithCampaignColumns())
    .from(userInvites)
    .leftJoin(campaigns, eq(campaigns.id, userInvites.campaignId))
    .orderBy(desc(userInvites.createdAt))

  return rows.map(withCampaign)
}

/**
 * The invite `token` names, if it can still be claimed; otherwise `null`. A
 * used, revoked, expired or unknown token all read the same from outside —
 * "this link no longer works" — and that is deliberate.
 */
export async function findClaimableInvite(token: string): Promise<InviteWithCampaign | null> {
  if (!isInviteToken(token)) return null

  const [row] = await getDb()
    .select(inviteWithCampaignColumns())
    .from(userInvites)
    .leftJoin(campaigns, eq(campaigns.id, userInvites.campaignId))
    .where(and(eq(userInvites.token, token), claimable(new Date())))
    .limit(1)

  return row ? withCampaign(row) : null
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
 *
 * Then, if the invite carries a campaign, the roster seat
 * (`dm-chronology/one-link-invite`): one `campaign_members` row, written by
 * `seatOnCampaign` so it is the same row the join code writes, and **always as
 * a player**. The invite's own `role` is the global one and is settled above;
 * a claim never grants more than a seat, whatever the link says (D20). An
 * account already on that roster is a no-op, not an error — the insert is
 * idempotent — so a second person's link forwarded to someone already at the
 * table simply signs them in.
 *
 * That seat is also the join context the join flow sets: a brand-new account
 * lands in the wizard seated at exactly one table, which is what
 * `src/app/characters/new/page.tsx` reads to attach the finished character to
 * it (D36). The invite landing carries the same campaign on the sign-up URL,
 * so the answer does not depend on the person having only one table.
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

  if (invite.campaignId) await seatOnCampaign(invite.campaignId, userId, 'player')

  return invite
}
