// Typed data access for campaigns and their rosters (DND-046).
//
// Authority model, restated from the schema: `campaigns.dm_user_id` is the
// only thing that says who runs a campaign. Every function that manages a
// campaign takes the DM's user id first and folds `dm_user_id = ?` into the
// WHERE clause, the same shape `characters.ts` uses — a campaign someone else
// runs is indistinguishable from one that does not exist.
//
// The way in is a join code (D24's token pattern, applied to rosters): the DM
// shares `/campaigns/join/<code>`, and a signed-in player attaches their own
// characters. Knowing the code grants joining, nothing else.
//
// `neon-http` cannot do transactions, so the multi-row writes here are ordered
// to fail benignly: a campaign without its DM roster row, or a member without
// character links, is a display gap rather than an authority bug.
import { randomBytes } from 'node:crypto'

import { and, desc, eq, inArray } from 'drizzle-orm'

import { getDb } from './client'
import {
  campaignMembers,
  campaigns,
  characterCampaigns,
  characters,
  type Campaign,
  type CampaignMember,
  type Character,
} from './schema'

export type { Campaign, CampaignMember } from './schema'

/** A campaign as the DM's list renders it. */
export interface CampaignWithCounts extends Campaign {
  memberCount: number
  characterCount: number
}

/** A campaign's roster: who sits at the table, and which characters are in. */
export interface CampaignRoster {
  campaign: Campaign
  members: CampaignMember[]
  characters: Character[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isCampaignId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/** 128 random bits, base64url — unguessable, and readable enough to share. */
export function generateJoinCode(): string {
  return randomBytes(16).toString('base64url')
}

/** Join codes come off URLs; anything that is not code-shaped is a miss. */
function isJoinCode(code: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(code)
}

/**
 * Create a campaign run by `dmUserId`, with a live join code and the DM on
 * the roster (Jamie plays at his own table — the roster row is the label the
 * schema's warning says it is, not a grant).
 */
export async function createCampaign(dmUserId: string, name: string): Promise<Campaign> {
  const [campaign] = await getDb()
    .insert(campaigns)
    .values({ dmUserId, name: name.trim(), joinCode: generateJoinCode() })
    .returning()

  await getDb()
    .insert(campaignMembers)
    .values({ campaignId: campaign.id, userId: dmUserId, role: 'dm' })
    .onConflictDoNothing()

  return campaign
}

/** Every campaign `dmUserId` runs, newest first, with roster counts. */
export async function listCampaignsForDm(dmUserId: string): Promise<CampaignWithCounts[]> {
  const rows = await getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.dmUserId, dmUserId))
    .orderBy(desc(campaigns.createdAt))

  if (rows.length === 0) return []

  const ids = rows.map((row) => row.id)

  const [members, links] = await Promise.all([
    getDb()
      .select({ campaignId: campaignMembers.campaignId })
      .from(campaignMembers)
      .where(inArray(campaignMembers.campaignId, ids)),
    getDb()
      .select({ campaignId: characterCampaigns.campaignId })
      .from(characterCampaigns)
      .where(inArray(characterCampaigns.campaignId, ids)),
  ])

  const memberCounts = new Map<string, number>()
  for (const row of members) {
    memberCounts.set(row.campaignId, (memberCounts.get(row.campaignId) ?? 0) + 1)
  }

  const characterCounts = new Map<string, number>()
  for (const row of links) {
    characterCounts.set(row.campaignId, (characterCounts.get(row.campaignId) ?? 0) + 1)
  }

  return rows.map((row) => ({
    ...row,
    memberCount: memberCounts.get(row.id) ?? 0,
    characterCount: characterCounts.get(row.id) ?? 0,
  }))
}

/** One campaign `dmUserId` runs, or `null` — foreign and fictional ids look alike. */
export async function getCampaignForDm(dmUserId: string, id: string): Promise<Campaign | null> {
  if (!isCampaignId(id)) return null

  const [campaign] = await getDb()
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, dmUserId)))
    .limit(1)

  return campaign ?? null
}

/** The campaign behind a join code, or `null`. For the join page only. */
export async function getCampaignByJoinCode(code: string): Promise<Campaign | null> {
  if (!isJoinCode(code)) return null

  const [campaign] = await getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.joinCode, code))
    .limit(1)

  return campaign ?? null
}

/**
 * Put `userId` at the table behind `code`, attaching the given characters.
 *
 * Only characters `userId` owns are attached — anything else in the list is
 * dropped, not an error, because the only way to send a foreign id is to have
 * tampered with the request. Idempotent: joining twice is being at the table
 * once.
 */
export async function joinCampaignByCode(
  userId: string,
  code: string,
  characterIds: string[],
): Promise<Campaign | null> {
  const campaign = await getCampaignByJoinCode(code)
  if (!campaign) return null

  const role = campaign.dmUserId === userId ? 'dm' : 'player'

  await getDb()
    .insert(campaignMembers)
    .values({ campaignId: campaign.id, userId, role })
    .onConflictDoNothing()

  const wanted = characterIds.filter((id) => UUID_PATTERN.test(id))

  if (wanted.length > 0) {
    const owned = await getDb()
      .select({ id: characters.id })
      .from(characters)
      .where(and(inArray(characters.id, wanted), eq(characters.ownerId, userId)))

    if (owned.length > 0) {
      await getDb()
        .insert(characterCampaigns)
        .values(owned.map(({ id }) => ({ characterId: id, campaignId: campaign.id })))
        .onConflictDoNothing()
    }
  }

  return campaign
}

/**
 * Every campaign this person sits at, whichever seat they hold — the roster
 * table read from the other end.
 *
 * Not an authority query and not a substitute for one: `campaign_members` says
 * where someone sits, `campaigns.dm_user_id` says what they may do (see this
 * module's header). What this answers is "which table is this character for",
 * which is the guided wizard's question — a player who is at exactly one table
 * is making a character for it (`guided-creation/wizard-frame`).
 */
export async function listCampaignsForMember(userId: string): Promise<Campaign[]> {
  const rows = await getDb()
    .select({ campaign: campaigns })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaignMembers.campaignId, campaigns.id))
    .where(eq(campaignMembers.userId, userId))
    .orderBy(campaigns.name)

  return rows.map((row) => row.campaign)
}

/**
 * Put one character on a campaign's roster, closing the join → create → attach
 * loop (`guided-creation/wizard-frame`).
 *
 * Both halves are checked in the database rather than trusted from the caller:
 * the character has to be `userId`'s, and `userId` has to already be at that
 * table. Joining is what `joinCampaignByCode` is for; this only attaches, so a
 * campaign id off a query string cannot be used to seat yourself somewhere.
 *
 * Idempotent, and `false` for every refusal — a character already on the roster
 * comes back `true`, because it is on the roster, which is what the caller
 * asked for.
 */
export async function attachCharacterToCampaign(
  userId: string,
  characterId: string,
  campaignId: string,
): Promise<boolean> {
  if (!isCampaignId(campaignId) || !UUID_PATTERN.test(characterId)) return false

  const [member] = await getDb()
    .select({ userId: campaignMembers.userId })
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .limit(1)

  if (!member) return false

  const [owned] = await getDb()
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.ownerId, userId)))
    .limit(1)

  if (!owned) return false

  await getDb().insert(characterCampaigns).values({ characterId, campaignId }).onConflictDoNothing()

  return true
}

/**
 * The classes of the characters already on a campaign's roster, for a player
 * who sits at that table (`guided-creation/party-balance-hints`).
 *
 * The one roster read that is not DM-scoped, and the narrowest one in this
 * module: it answers "what are the others playing" and returns nothing else —
 * no names, no hit points, no ids. That is the whole of what a composition hint
 * needs, and a player at the table already sees it on the party screen.
 *
 * Membership is folded into the join rather than checked in a second statement,
 * so a campaign id off a query string that the caller is not seated at reads as
 * an empty party — the same answer as a campaign that does not exist, which is
 * the shape every other function here uses. An empty list is also what a
 * malformed id gets: the caller's next move is to say nothing either way.
 */
export async function listPartyClassIndexes(userId: string, campaignId: string): Promise<string[]> {
  if (!isCampaignId(campaignId)) return []

  const rows = await getDb()
    .select({ classIndex: characters.classIndex })
    .from(characterCampaigns)
    .innerJoin(characters, eq(characterCampaigns.characterId, characters.id))
    .innerJoin(
      campaignMembers,
      and(
        eq(campaignMembers.campaignId, characterCampaigns.campaignId),
        eq(campaignMembers.userId, userId),
      ),
    )
    .where(eq(characterCampaigns.campaignId, campaignId))
    .orderBy(characters.name)

  return rows.map((row) => row.classIndex)
}

/** The full roster of a campaign `dmUserId` runs, or `null`. */
export async function getCampaignRoster(
  dmUserId: string,
  id: string,
): Promise<CampaignRoster | null> {
  const campaign = await getCampaignForDm(dmUserId, id)
  if (!campaign) return null

  const [members, roster] = await Promise.all([
    getDb().select().from(campaignMembers).where(eq(campaignMembers.campaignId, campaign.id)),
    getDb()
      .select({ character: characters })
      .from(characterCampaigns)
      .innerJoin(characters, eq(characterCampaigns.characterId, characters.id))
      .where(eq(characterCampaigns.campaignId, campaign.id))
      .orderBy(characters.name),
  ])

  return { campaign, members, characters: roster.map((row) => row.character) }
}

/** Replace the join code of a campaign `dmUserId` runs. Old links die with it. */
export async function regenerateJoinCode(dmUserId: string, id: string): Promise<Campaign | null> {
  if (!isCampaignId(id)) return null

  const [campaign] = await getDb()
    .update(campaigns)
    .set({ joinCode: generateJoinCode(), updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return campaign ?? null
}
