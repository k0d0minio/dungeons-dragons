// Typed data access for campaigns and their membership (DND-026).
//
// Every function takes `dmUserId` first and folds it into the query, the same
// convention `characters.ts` uses for `ownerId` and for the same reason: a
// required leading argument makes an unscoped query awkward to write by
// accident. Here it means one thing only — *the DM of this campaign* — because
// `campaigns.dmUserId` is the single source of truth for who runs a game.
//
// **This file grants nobody anything new.** DND-026 is substrate: it adds tables
// and the code to read and write them, and deliberately leaves `characters.ts`
// and every route exactly as they were. The association functions here stop at
// character *ids* for that reason — turning an id into a character row is
// widening character access, which is DND-027's job and belongs in the same diff
// as its negative tests.
//
// Safe to call from server components, server actions and route handlers.
import { and, asc, eq, sql } from 'drizzle-orm'

import { getDb } from './client'
import {
  campaignCharacters,
  campaignMembers,
  campaigns,
  type Campaign,
  type CampaignCharacter,
  type CampaignMember,
  type CampaignMemberRole,
  type NewCampaign,
} from './schema'

export type {
  Campaign,
  CampaignCharacter,
  CampaignMember,
  CampaignMemberRole,
  NewCampaign,
} from './schema'

/** The columns a caller may set. Identity, the DM and timestamps are ours to manage. */
export type CampaignInput = Omit<NewCampaign, 'id' | 'dmUserId' | 'createdAt' | 'updatedAt'>

/** Update input. Anything omitted is left alone. */
export type CampaignPatch = Partial<CampaignInput>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ids reach these functions straight off a URL segment, and Postgres raises a
 * type error on a malformed uuid — which would surface as a 500 for what is
 * really a "no such campaign". Treat an unparseable id as a miss.
 *
 * Deliberately a second copy of the guard at `characters.ts:35` rather than a
 * shared helper: DND-026 must not touch that file, so that the security-relevant
 * diff in DND-027 is the only thing changing it.
 */
function isUuid(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/** Every campaign run by `dmUserId`, by name — a DM has a handful, not a feed. */
export async function listCampaignsForDm(dmUserId: string): Promise<Campaign[]> {
  return getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.dmUserId, dmUserId))
    .orderBy(asc(campaigns.name))
}

/** One campaign, or `null` if it does not exist or `dmUserId` does not run it. */
export async function getCampaign(dmUserId: string, campaignId: string): Promise<Campaign | null> {
  if (!isUuid(campaignId)) return null

  const [campaign] = await getDb()
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .limit(1)

  return campaign ?? null
}

/** Create a campaign run by `dmUserId` and return the stored row. */
export async function createCampaign(dmUserId: string, input: CampaignInput): Promise<Campaign> {
  const [campaign] = await getDb()
    .insert(campaigns)
    .values({ ...input, dmUserId })
    .returning()

  return campaign
}

/**
 * Apply `patch` to one of `dmUserId`'s campaigns and return the updated row, or
 * `null` if there was nothing of theirs to update.
 */
export async function updateCampaign(
  dmUserId: string,
  campaignId: string,
  patch: CampaignPatch
): Promise<Campaign | null> {
  if (!isUuid(campaignId)) return null

  const [campaign] = await getDb()
    .update(campaigns)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return campaign ?? null
}

/**
 * Delete one of `dmUserId`'s campaigns. `false` when there was nothing to delete.
 *
 * Its membership and character associations go with it, by `ON DELETE CASCADE`
 * in the database rather than by extra statements here — which matters because
 * the `neon-http` driver cannot open a transaction, so anything this file did in
 * three statements could fail after one. The characters themselves are
 * untouched: disbanding a party is not deleting anybody's character.
 */
export async function deleteCampaign(dmUserId: string, campaignId: string): Promise<boolean> {
  if (!isUuid(campaignId)) return false

  const deleted = await getDb()
    .delete(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .returning({ id: campaigns.id })

  return deleted.length > 0
}

/**
 * Everyone at the table of one of `dmUserId`'s campaigns. Empty for a campaign
 * they do not run, which is indistinguishable from one with no members yet —
 * the same "a stranger's id looks like a missing id" property the character
 * routes rely on.
 *
 * Membership queries authorise by reading the campaign first, because the
 * membership tables carry no DM column of their own; that is one extra
 * round trip and, at a table of five people, worth the clarity of having the
 * check be a line you can point at. No transaction wraps the pair (`neon-http`
 * cannot), so a campaign deleted between the two statements means a write that
 * hits the foreign key and throws instead of silently landing.
 */
export async function listCampaignMembers(
  dmUserId: string,
  campaignId: string
): Promise<CampaignMember[]> {
  if (!(await getCampaign(dmUserId, campaignId))) return []

  return getDb()
    .select()
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId))
    .orderBy(asc(campaignMembers.createdAt))
}

/**
 * Seat `userId` at one of `dmUserId`'s campaigns, or return `null` if the
 * campaign is not theirs. Adding somebody already seated is not an error — it
 * re-affirms their row.
 *
 * `role` is derived from `campaigns.dmUserId` and never taken from the caller:
 * the DM at this table also plays, so they get a member row like everybody else,
 * but no caller gets to mint one that claims to be the DM of a game they do not
 * run. Nothing reads `role` as permission — DND-027's predicate reads
 * `campaigns.dmUserId` — so the worst a wrong value could do is mislabel a
 * screen, and it still should not be possible.
 */
export async function addCampaignMember(
  dmUserId: string,
  campaignId: string,
  userId: string
): Promise<CampaignMember | null> {
  const campaign = await getCampaign(dmUserId, campaignId)
  if (!campaign) return null

  const role: CampaignMemberRole = userId === campaign.dmUserId ? 'dm' : 'player'

  const [member] = await getDb()
    .insert(campaignMembers)
    .values({ campaignId, userId, role })
    // An upsert rather than `onConflictDoNothing` so that re-adding a member
    // still returns their row: "already there" is success, not a silent null
    // the caller would have to tell apart from "not your campaign".
    .onConflictDoUpdate({
      target: [campaignMembers.campaignId, campaignMembers.userId],
      set: { role },
    })
    .returning()

  return member ?? null
}

/**
 * Remove `userId` from one of `dmUserId`'s campaigns. `false` when there was
 * nothing to remove — including when the campaign is not theirs.
 */
export async function removeCampaignMember(
  dmUserId: string,
  campaignId: string,
  userId: string
): Promise<boolean> {
  if (!(await getCampaign(dmUserId, campaignId))) return false

  const deleted = await getDb()
    .delete(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .returning({ userId: campaignMembers.userId })

  return deleted.length > 0
}

/**
 * The ids of the characters played in one of `dmUserId`'s campaigns, oldest
 * association first. Empty for a campaign they do not run.
 *
 * Ids, not rows, on purpose — see this file's header. DND-027 is what turns
 * these into characters a DM may read and edit.
 */
export async function listCampaignCharacterIds(
  dmUserId: string,
  campaignId: string
): Promise<string[]> {
  if (!(await getCampaign(dmUserId, campaignId))) return []

  const rows = await getDb()
    .select({ characterId: campaignCharacters.characterId })
    .from(campaignCharacters)
    .where(eq(campaignCharacters.campaignId, campaignId))
    .orderBy(asc(campaignCharacters.createdAt))

  return rows.map((row) => row.characterId)
}

/**
 * Play `characterId` in one of `dmUserId`'s campaigns, or return `null` if the
 * campaign is not theirs. A character may be in several campaigns at once
 * (register decision D14), and adding one twice is not an error.
 *
 * The character is not read here, so this does not widen who can see character
 * data; a character id that does not exist is rejected by the foreign key.
 */
export async function addCharacterToCampaign(
  dmUserId: string,
  campaignId: string,
  characterId: string
): Promise<CampaignCharacter | null> {
  if (!isUuid(characterId)) return null
  if (!(await getCampaign(dmUserId, campaignId))) return null

  const [association] = await getDb()
    .insert(campaignCharacters)
    .values({ campaignId, characterId })
    // Same "already there is success" reasoning as `addCampaignMember`, but this
    // row has nothing worth updating, so the conflict writes `created_at` back
    // over itself: the association keeps the date it was really made, and the
    // statement still returns the row.
    .onConflictDoUpdate({
      target: [campaignCharacters.campaignId, campaignCharacters.characterId],
      set: { createdAt: sql`${campaignCharacters.createdAt}` },
    })
    .returning()

  return association ?? null
}

/**
 * Take `characterId` out of one of `dmUserId`'s campaigns. `false` when there
 * was nothing to remove — including when the campaign is not theirs. The
 * character itself is untouched.
 */
export async function removeCharacterFromCampaign(
  dmUserId: string,
  campaignId: string,
  characterId: string
): Promise<boolean> {
  if (!isUuid(characterId)) return false
  if (!(await getCampaign(dmUserId, campaignId))) return false

  const deleted = await getDb()
    .delete(campaignCharacters)
    .where(
      and(
        eq(campaignCharacters.campaignId, campaignId),
        eq(campaignCharacters.characterId, characterId)
      )
    )
    .returning({ characterId: campaignCharacters.characterId })

  return deleted.length > 0
}
