// What a player at the table may read of a campaign
// (`dm-run-suite/player-campaign-view`, D38).
//
// Every other read of a prep entity in this app answers to the DM and selects
// whole rows. **Every read in this file answers to a player, and not one of
// them selects a whole row.** That inversion is the file's whole reason to
// exist, and it is held up by three arms that appear together on every
// statement below:
//
// 1. **`seatedAt`** — the asker is on `campaign_members` for this campaign.
//    Membership, never `campaign_members.role`, which grants nothing.
// 2. **`revealedOnly`** — `revealed_at is not null`. Null is hidden, and a row
//    a player may not see is one the statement never selected. There is no
//    application-side filter anywhere in this file, because a filter applied
//    after the fact is one early `return` away from not being applied.
// 3. **A named public-column selection** — `npcPublicColumns`,
//    `locationPublicColumns`, `handoutPublicColumns`, declared beside their
//    tables and re-exported here. No statement below writes `select()`.
//
// Arms 1 and 2 are in the SQL rather than in TypeScript on purpose: the leak
// this file is defending against is a future edit, and a WHERE clause is
// harder to drop by accident than a `.filter()` a reviewer reads as noise. Arm
// 3 is in the *type system* as well: the rows these functions return have no
// `secrets` field to leak, so writing the leak would not compile.
//
// **Images are the one thing that needs care beyond that.** A handout's
// picture lives in a private blob and the store key must never reach a
// browser, exactly as `handouts.ts` says. So the reads here never select the
// `image` column at all — they select one derived scalar, the upload
// timestamp, which says *that there is a picture* and gives the `<img>` a
// cache key, and the bytes come from the member-scoped route that re-asks all
// three questions above.
//
// The DM is a member of their own table when they sit at it, so these
// functions serve them too — and serve them the player's view, which is right:
// this is the screen the party sees, and a DM opening it is checking what the
// party sees.
import { and, asc, eq, sql } from 'drizzle-orm'

import { imageMeta, type ImageMeta, type StoredImage } from '@/lib/images/schema'

import { getDb } from './client'
import { handoutPublicColumns, type PublicHandout } from './handouts'
import { locationPublicColumns, type PublicLocation } from './locations'
import { npcPublicColumns, type PublicNpc } from './npcs'
import { isRowId, revealedOnly, seatedAt, type RevealableTable } from './revealable'
import {
  campaignHandouts,
  campaignLocations,
  campaignMembers,
  campaignNpcs,
  characterCampaigns,
  characters,
  campaigns,
  type Campaign,
} from './schema'

export type { PublicHandout, PublicLocation, PublicNpc }

/**
 * One character on the party list, as the rest of the party sees them.
 *
 * Deliberately not `Character`. The party screen is the first place in this app
 * where a player reads *someone else's* character, and the honest list of what
 * that is for — "who am I playing with" — is a name, a species and class, a
 * level and a face. Hit points, gold, spell slots and inventory are the owner's
 * business and the DM's, and none of them are selected.
 *
 * `portrait` is {@link ImageMeta}: that there is one and how big, never where
 * it lives. `isYours` lets the list mark the reader's own row without the page
 * having to compare owner ids it would otherwise have no reason to receive.
 */
export interface PartyMember {
  id: string
  name: string
  level: number
  speciesIndex: string
  classIndex: string
  portrait: ImageMeta | null
  isYours: boolean
}

/**
 * A revealed handout as a player reads it: the public layer, plus one bit
 * about the picture.
 *
 * `imageUploadedAt` is the whole of what crosses to the browser about the
 * image — non-null means "there is one", and its value is the `?v=` that stops
 * a replaced picture being served from cache. The store key stays in the
 * database, and the bytes come from `/api/campaigns/[id]/discovered/…/image`.
 */
export interface DiscoveredHandout extends PublicHandout {
  imageUploadedAt: string | null
}

/**
 * The campaign, if `userId` sits at it — the page's own authority check.
 *
 * Membership is folded into the join, so a campaign id off a URL that the
 * asker is not seated at reads as `null`: the same answer a campaign that does
 * not exist gives, which is what keeps the page from confirming other people's
 * tables exist. The page turns `null` into a 404, never a 403.
 */
export async function getCampaignForMember(
  userId: string,
  campaignId: string,
): Promise<Campaign | null> {
  if (!isRowId(campaignId)) return null

  const [row] = await getDb()
    .select({ campaign: campaigns })
    .from(campaigns)
    .innerJoin(
      campaignMembers,
      and(eq(campaignMembers.campaignId, campaigns.id), eq(campaignMembers.userId, userId)),
    )
    .where(eq(campaigns.id, campaignId))
    .limit(1)

  return row?.campaign ?? null
}

/**
 * The party, for a player seated at the table.
 *
 * Membership rides in the join rather than a second statement, `listPartyClassIndexes`'
 * pattern: a campaign the asker is not seated at reads as an empty party, and
 * so does one that does not exist.
 *
 * The selection is the interesting part and it is written out rather than
 * spread from anywhere: `characters` has no public-column constant because
 * every *other* reader of it is the owner or the DM. This list is the
 * exception, so it names its six columns here, next to the comment explaining
 * why it is only six.
 */
export async function listPartyForMember(
  userId: string,
  campaignId: string,
): Promise<PartyMember[]> {
  if (!isRowId(campaignId)) return []

  const rows = await getDb()
    .select({
      id: characters.id,
      name: characters.name,
      level: characters.level,
      speciesIndex: characters.speciesIndex,
      classIndex: characters.classIndex,
      portrait: characters.portrait,
      ownerId: characters.ownerId,
    })
    .from(characterCampaigns)
    .innerJoin(characters, eq(characters.id, characterCampaigns.characterId))
    .innerJoin(
      campaignMembers,
      and(
        eq(campaignMembers.campaignId, characterCampaigns.campaignId),
        eq(campaignMembers.userId, userId),
      ),
    )
    .where(eq(characterCampaigns.campaignId, campaignId))
    .orderBy(asc(characters.name))

  return rows.map(({ ownerId, portrait, ...character }) => ({
    ...character,
    // The redaction, on the one way out of this function.
    portrait: imageMeta(portrait),
    isYours: ownerId === userId,
  }))
}

/** The three arms, as one WHERE clause. Nothing in this file omits any of them. */
function discoverable(table: RevealableTable, userId: string, campaignId: string) {
  return and(eq(table.campaignId, campaignId), seatedAt(table, userId), revealedOnly(table))
}

/**
 * The NPCs the party has met — public layer only, revealed only.
 *
 * Ordered by name like the DM's roster: a player scanning for a name they half
 * remember is doing the same job the DM is.
 */
export async function listDiscoveredNpcs(userId: string, campaignId: string): Promise<PublicNpc[]> {
  if (!isRowId(campaignId)) return []

  return getDb()
    .select(npcPublicColumns)
    .from(campaignNpcs)
    .where(discoverable(campaignNpcs, userId, campaignId))
    .orderBy(asc(campaignNpcs.name), asc(campaignNpcs.createdAt))
}

/** The places the party has found — public layer only, revealed only. */
export async function listDiscoveredLocations(
  userId: string,
  campaignId: string,
): Promise<PublicLocation[]> {
  if (!isRowId(campaignId)) return []

  return getDb()
    .select(locationPublicColumns)
    .from(campaignLocations)
    .where(discoverable(campaignLocations, userId, campaignId))
    .orderBy(asc(campaignLocations.name), asc(campaignLocations.createdAt))
}

/**
 * The handouts the party has been given — public layer only, revealed only.
 *
 * Newest first, unlike the other two lists. A handout is a thing that was just
 * produced at the table, so the one the party is looking at is the one that was
 * revealed last; NPCs and places are a directory, and this is a stack.
 */
export async function listDiscoveredHandouts(
  userId: string,
  campaignId: string,
): Promise<DiscoveredHandout[]> {
  if (!isRowId(campaignId)) return []

  return getDb()
    .select({
      ...handoutPublicColumns,
      // The one fact about the image that crosses to a browser. Extracted in
      // SQL rather than selecting the column and reading a field off it,
      // because a selected `image` is a store key in the RSC payload the
      // moment someone passes the row somewhere new.
      imageUploadedAt: sql<string | null>`${campaignHandouts.image}->>'uploadedAt'`.as(
        'image_uploaded_at',
      ),
    })
    .from(campaignHandouts)
    .where(discoverable(campaignHandouts, userId, campaignId))
    .orderBy(sql`${campaignHandouts.revealedAt} desc`, asc(campaignHandouts.title))
}

/**
 * The store descriptor for a revealed handout's image, for a seated player —
 * the player-side counterpart to `loadHandoutImage`, and the **only**
 * unredacted read in this file.
 *
 * It carries `revealedOnly` like every other read here, which is the point: an
 * unrevealed handout's picture is the secret the private blob exists to keep,
 * and guessing its id gets the same `null` as guessing a fictional one.
 *
 * Outer `null` is "no such handout for this player"; an inner `image: null` is
 * "that handout has no picture". The route sends 404 for both, but they stay
 * distinct here for the same reason they do on the DM side.
 */
export async function loadDiscoveredHandoutImage(
  userId: string,
  campaignId: string,
  handoutId: string,
): Promise<{ image: StoredImage | null } | null> {
  if (!isRowId(campaignId) || !isRowId(handoutId)) return null

  const [row] = await getDb()
    .select({ image: campaignHandouts.image })
    .from(campaignHandouts)
    .where(
      and(eq(campaignHandouts.id, handoutId), discoverable(campaignHandouts, userId, campaignId)),
    )
    .limit(1)

  return row ? { image: row.image ?? null } : null
}

/**
 * The store descriptor for a party member's portrait, for a seated player.
 *
 * No `revealed_at` here — a character is not prep and has no reveal switch.
 * What stands in its place is the roster: the character has to be on
 * `character_campaigns` for a campaign the asker is seated at, so a portrait is
 * readable by the people that character actually plays with and by nobody else.
 * A character id off a URL that is not at this table is `null`.
 */
export async function loadPartyPortrait(
  userId: string,
  campaignId: string,
  characterId: string,
): Promise<{ image: StoredImage | null } | null> {
  if (!isRowId(campaignId) || !isRowId(characterId)) return null

  const [row] = await getDb()
    .select({ portrait: characters.portrait })
    .from(characterCampaigns)
    .innerJoin(characters, eq(characters.id, characterCampaigns.characterId))
    .innerJoin(
      campaignMembers,
      and(
        eq(campaignMembers.campaignId, characterCampaigns.campaignId),
        eq(campaignMembers.userId, userId),
      ),
    )
    .where(
      and(
        eq(characterCampaigns.campaignId, campaignId),
        eq(characterCampaigns.characterId, characterId),
      ),
    )
    .limit(1)

  return row ? { image: row.portrait ?? null } : null
}
