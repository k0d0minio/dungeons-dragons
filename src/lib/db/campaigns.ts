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

import { and, desc, eq, inArray, isNull } from 'drizzle-orm'

import { resolveGates, type CampaignGates, type SheetGates } from '@/lib/campaigns/gates'
import { parseMilestoneLevel, resolveMilestoneLevel } from '@/lib/campaigns/milestone'

import type { ArmorDetails } from '@/lib/characters/attacks'

import { viewableBy } from './characters'
import { getDb } from './client'
import { equippedArmorByCharacter } from './items'
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
  /**
   * Each character's worn armour, by id (`first-table/glance-derived-ac`), so
   * the glance derives the AC the sheet derives. Every character on the
   * roster is a key; `[]` means the stored column stands.
   */
  armor: Record<string, ArmorDetails[]>
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
 *
 * `carryFrom` is the table that carries on (`first-table/one-night-campaign`):
 * the id of a campaign this DM runs — the tutorial that ended tonight — whose
 * seats, characters and gates the new campaign starts with, so nobody is sent
 * a second join link. **A pointer, never a permission**: it is re-read through
 * `getCampaignForDm`, so an id off a request body naming someone else's
 * campaign copies nothing, and the route has already refused it before
 * anything was created.
 *
 * **Ordered to fail benignly, because `neon-http` has no transactions.** The
 * campaign and its DM seat land exactly as they always have; then the members,
 * then the characters, then the gates — each insert `ON CONFLICT DO NOTHING`
 * on its primary key and the gates write an idempotent update — so a failure
 * partway leaves a campaign that exists with fewer people on it, and running
 * the same carry again finishes the job rather than doubling anything.
 * Members before characters because a character on a table its player is not
 * seated at is the gap that shows (their sheet would not link to it); the
 * reverse leaves a seated player whose character is one attach away.
 * `milestone_level` and `session_zero` are not copied: a new campaign has not
 * earned a level, and the one page is written about the campaign it is for.
 */
export async function createCampaign(
  dmUserId: string,
  name: string,
  carryFrom?: string,
): Promise<Campaign> {
  const [campaign] = await getDb()
    .insert(campaigns)
    .values({ dmUserId, name: name.trim(), joinCode: generateJoinCode() })
    .returning()

  await getDb()
    .insert(campaignMembers)
    .values({ campaignId: campaign.id, userId: dmUserId, role: 'dm' })
    .onConflictDoNothing()

  if (carryFrom === undefined) return campaign

  const source = await getCampaignForDm(dmUserId, carryFrom)
  if (source) await carryTableForward(dmUserId, source, campaign.id)

  return campaign
}

/** The three ordered, idempotent passes `createCampaign` makes for `carryFrom`. */
async function carryTableForward(
  dmUserId: string,
  source: Campaign,
  campaignId: string,
): Promise<void> {
  const db = getDb()

  const members = await db
    .select({ userId: campaignMembers.userId, role: campaignMembers.role })
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, source.id))

  if (members.length > 0) {
    await db
      .insert(campaignMembers)
      .values(members.map((member) => ({ campaignId, userId: member.userId, role: member.role })))
      .onConflictDoNothing()
  }

  const links = await db
    .select({ characterId: characterCampaigns.characterId })
    .from(characterCampaigns)
    .where(eq(characterCampaigns.campaignId, source.id))

  if (links.length > 0) {
    await db
      .insert(characterCampaigns)
      .values(links.map((link) => ({ characterId: link.characterId, campaignId })))
      .onConflictDoNothing()
  }

  // A fresh row already reads as every gate off, so `null` needs no write.
  if (source.gates !== null) {
    await db
      .update(campaigns)
      .set({ gates: source.gates, updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
  }
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

/**
 * The campaign behind a join code, or `null`. For the join page only.
 *
 * A closed campaign's code is dead (`first-table/one-night-campaign`): the
 * link sent round for the tutorial must not seat a latecomer at a table that
 * has ended, and "closed" and "never real" are the same 404 on purpose.
 */
export async function getCampaignByJoinCode(code: string): Promise<Campaign | null> {
  if (!isJoinCode(code)) return null

  const [campaign] = await getDb()
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.joinCode, code), isNull(campaigns.closedAt)))
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
 *
 * Closed campaigns are left out (`first-table/one-night-campaign`): a table
 * that has ended is not one a new character is for.
 */
export async function listCampaignsForMember(userId: string): Promise<Campaign[]> {
  const rows = await getDb()
    .select({ campaign: campaigns })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaignMembers.campaignId, campaigns.id))
    .where(and(eq(campaignMembers.userId, userId), isNull(campaigns.closedAt)))
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
 * The campaigns one of `ownerId`'s characters is on — the link from a sheet to
 * the table it is played at (`dm-run-suite/player-campaign-view`).
 *
 * Two arms, and both are in the statement: the character has to be the asker's
 * (`characters.owner_id`), and the asker has to sit at the table
 * (`campaign_members`). The first is what makes this safe to call from the
 * sheet — where a **DM** may legitimately be reading a party member's
 * character (D13) — because a DM asking gets an empty list rather than a link
 * labelled "your campaign" to a table they run rather than play at. The second
 * is what the destination page will check anyway, asked here so the sheet does
 * not offer a link that 404s.
 *
 * Ordered by name; a character on no campaign, or one that is not the asker's,
 * is an empty list, and the sheet renders nothing at all for it.
 *
 * A closed campaign is not listed either (`first-table/one-night-campaign`):
 * closing takes the campaign off the players' sheets, and this is the read
 * that puts it there. The character stays on the roster underneath — nothing
 * is unlinked — and the recap still reaches the sheet through the shared
 * notes, which read the roster and not this.
 */
export async function listCampaignsForCharacter(
  ownerId: string,
  characterId: string,
): Promise<Campaign[]> {
  if (!isCampaignId(characterId)) return []

  const rows = await getDb()
    .select({ campaign: campaigns })
    .from(characterCampaigns)
    .innerJoin(characters, eq(characters.id, characterCampaigns.characterId))
    .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
    .innerJoin(
      campaignMembers,
      and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, ownerId)),
    )
    .where(
      and(
        eq(characterCampaigns.characterId, characterId),
        eq(characters.ownerId, ownerId),
        isNull(campaigns.closedAt),
      ),
    )
    .orderBy(campaigns.name)

  return rows.map((row) => row.campaign)
}

/**
 * The campaigns `dmUserId` runs that `characterId` is on — the DM's way back
 * from a party member's sheet (`first-table/dm-front-door`), where "Your
 * characters" used to be.
 *
 * The inverse of `listCampaignsForCharacter`: that one needs the character to
 * be the asker's, this one needs the campaign to be. A character may sit at
 * more than one table (D14), so the caller picks — the one the link came from
 * where it says, the first by name otherwise.
 */
export async function listCampaignsRunByForCharacter(
  dmUserId: string,
  characterId: string,
): Promise<Campaign[]> {
  if (!isCampaignId(characterId)) return []

  const rows = await getDb()
    .select({ campaign: campaigns })
    .from(characterCampaigns)
    .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
    .where(and(eq(characterCampaigns.characterId, characterId), eq(campaigns.dmUserId, dmUserId)))
    .orderBy(campaigns.name)

  return rows.map((row) => row.campaign)
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

  const party = roster.map((row) => row.character)

  // Fourth statement, after the roster has settled who is on it: the worn
  // armour of exactly those characters, so the glance can derive AC the way
  // the sheet does (`first-table/glance-derived-ac`). Skipped for an empty
  // table — nothing to ask about.
  const armor =
    party.length > 0 ? await equippedArmorByCharacter(party.map((character) => character.id)) : {}

  return { campaign, members, characters: party, armor }
}

/**
 * Replace the feature gates of a campaign `dmUserId` runs
 * (`dm-prep-suite/campaign-feature-gates`), and return the stored row.
 *
 * A whole-object write rather than a merge: the settings screen sends the
 * switches as it is showing them, so what lands is what the DM was looking at
 * and a stale tab cannot resurrect a gate by omitting it. {@link parseGates}
 * has already dropped anything that is not a known key with a boolean value,
 * so the column never holds a shape the sheet has to defend against.
 *
 * DM-scoped in the WHERE clause like everything else here — a campaign someone
 * else runs answers `null`, the same as one that never existed.
 */
export async function setCampaignGates(
  dmUserId: string,
  id: string,
  gates: CampaignGates,
): Promise<Campaign | null> {
  if (!isCampaignId(id)) return null

  const [campaign] = await getDb()
    .update(campaigns)
    .set({ gates, updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return campaign ?? null
}

/**
 * What one character's sheet may show — the gates of every campaign it is on,
 * resolved (`dm-prep-suite/campaign-feature-gates`).
 *
 * Scoped by {@link viewableBy}, the D13 predicate the sheet itself is behind,
 * so a DM opening a party member's sheet reads the same gates that player does
 * and sees the screen they are describing on the phone. A character nobody may
 * see, an id that is not a uuid, and a character on no campaign all arrive at
 * the same answer: **everything on**. That is deliberate — the failure a gate
 * may have is showing a card too early, never hiding one a table is using.
 *
 * One statement, and it returns one boolean per gate and nothing else.
 *
 * A closed campaign's gates no longer count (`first-table/one-night-campaign`):
 * a finished tutorial must stop steering the sheet, and with no open table
 * left the read falls towards everything on, as it does for a character on no
 * campaign.
 */
export async function gatesForCharacter(
  viewerId: string,
  characterId: string,
): Promise<SheetGates> {
  if (!UUID_PATTERN.test(characterId)) return resolveGates([])

  const rows = await getDb()
    .select({ gates: campaigns.gates })
    .from(characterCampaigns)
    .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
    .innerJoin(characters, eq(characters.id, characterCampaigns.characterId))
    .where(
      and(
        eq(characterCampaigns.characterId, characterId),
        viewableBy(viewerId),
        isNull(campaigns.closedAt),
      ),
    )

  return resolveGates(rows.map((row) => row.gates))
}

/**
 * Set (or clear) the level a campaign's party has reached
 * (D35, `dm-run-suite/milestone-leveling`), and return the stored row.
 *
 * **This is the entire write path of milestone levelling: one row, one
 * column.** No character is touched — not here and nowhere else — because
 * `neon-http` has no transactions and a six-character fan-out can half-apply.
 * What a player sees is derived from this number against their own `level` at
 * render time (see {@link milestoneForCharacter}), so there is no second copy
 * of it to fall out of step.
 *
 * `null` clears the milestone, which is a thing a DM does: a table that decides
 * to go back to XP should not be left with a stale number quietly prompting
 * everybody to level up.
 *
 * DM-scoped in the WHERE clause like everything else here — a campaign someone
 * else runs answers `null`, the same as one that never existed — and the level
 * is re-validated on the way in, because a route is not the last line of
 * defence for a column with a CHECK constraint behind it.
 */
export async function setCampaignMilestone(
  dmUserId: string,
  id: string,
  milestoneLevel: number | null,
): Promise<Campaign | null> {
  if (!isCampaignId(id)) return null

  const level = milestoneLevel === null ? null : parseMilestoneLevel(milestoneLevel)
  if (milestoneLevel !== null && level === null) return null

  const [campaign] = await getDb()
    .update(campaigns)
    .set({ milestoneLevel: level, updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return campaign ?? null
}

/**
 * The level this character's table has called, across every campaign it is on
 * — or `null` when nobody has called one
 * (`dm-run-suite/milestone-leveling`).
 *
 * The read half of the derivation, and the shape of {@link gatesForCharacter}
 * on purpose: scoped by {@link viewableBy} so a DM opening a party member's
 * sheet sees the same prompt that player does, one statement, and one column
 * selected and nothing else. A character on no campaign, an id that is not a
 * uuid and a character nobody may see all answer `null` — no milestone means no
 * prompt, which is the state every character was in before this shipped.
 *
 * Two tables means the higher of the two (see `resolveMilestoneLevel`): one
 * character has one sheet, and a level earned at one table is not withdrawn by
 * the other having said nothing.
 */
export async function milestoneForCharacter(
  viewerId: string,
  characterId: string,
): Promise<number | null> {
  if (!UUID_PATTERN.test(characterId)) return null

  // A closed campaign's milestone is not a prompt any more, for the gates'
  // reason (`first-table/one-night-campaign`).
  const rows = await getDb()
    .select({ milestoneLevel: campaigns.milestoneLevel })
    .from(characterCampaigns)
    .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
    .innerJoin(characters, eq(characters.id, characterCampaigns.characterId))
    .where(
      and(
        eq(characterCampaigns.characterId, characterId),
        viewableBy(viewerId),
        isNull(campaigns.closedAt),
      ),
    )

  return resolveMilestoneLevel(rows.map((row) => row.milestoneLevel))
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

/**
 * End a campaign `dmUserId` runs (`first-table/one-night-campaign`), and
 * return the stored row.
 *
 * One stamp on one row. Nothing is deleted and nobody is unseated: what
 * changes is which reads still answer — the campaign leaves the players'
 * sheets and the join code dies, while the DM's reads and the player campaign
 * page keep it, so the recap has somewhere to be read. The recap itself is
 * `publishSessionRecap`'s write, made by the route *before* this one so a
 * failure between the two leaves a published recap and an open campaign the
 * DM can close again.
 *
 * **Closing twice keeps the first stamp.** The UPDATE carries
 * `closed_at is null`, so a second press changes nothing; the re-read then
 * hands back the row as it stands, and only a campaign this DM does not run
 * — or one that never existed — is `null`. "When did this end" answers once.
 */
export async function closeCampaign(dmUserId: string, id: string): Promise<Campaign | null> {
  if (!isCampaignId(id)) return null

  const [closed] = await getDb()
    .update(campaigns)
    .set({ closedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, dmUserId), isNull(campaigns.closedAt)))
    .returning()

  if (closed) return closed

  const existing = await getCampaignForDm(dmUserId, id)
  return existing?.closedAt ? existing : null
}

/**
 * Write, or clear, the one page the table agreed on
 * (`first-table/session-zero-one-pager`), and return the stored row.
 *
 * Player-facing by design — see the column — so this is the DM's only write
 * to something the players read directly, and it is a plain save: prep is not
 * contested state, and nobody races the DM for a paragraph about the phone
 * rule. An emptied page collapses to `null` rather than `''`, so "never
 * written" and "cleared" read the same and the players' card renders nothing
 * for either. DM-scoped in the WHERE clause like everything else here.
 */
export async function setCampaignSessionZero(
  dmUserId: string,
  id: string,
  body: string | null,
): Promise<Campaign | null> {
  if (!isCampaignId(id)) return null

  const sessionZero = body !== null && body.trim() !== '' ? body : null

  const [campaign] = await getDb()
    .update(campaigns)
    .set({ sessionZero, updatedAt: new Date() })
    .where(and(eq(campaigns.id, id), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return campaign ?? null
}
