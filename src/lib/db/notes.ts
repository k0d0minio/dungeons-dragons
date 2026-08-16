// Typed data access for campaign and character notes (DND-058).
//
// Two tables, two different secrets, and this file is the only place either is
// read from — see the section comment in `schema.ts` for why they are tables
// rather than columns. The rule the register states, restated as the property
// every function here holds:
//
// - **A DM's notes are not player-readable unless shared.** Every DM-side
//   statement folds `campaigns.dm_user_id` into its WHERE clause, the same
//   shape `encounters.ts` uses. The one player-side read,
//   `listSharedNotesForCharacter`, carries `shared_with_players = true` as a
//   non-negotiable arm of its WHERE clause and selects through the character's
//   own campaigns, so an unshared note cannot reach a player even by id.
// - **A player's character notes are their own.** The two character-note
//   functions scope on `characters.owner_id`, *not* the DND-027 `viewableBy`
//   predicate that the rest of the character data layer uses. That is the
//   deliberate difference: D13 lets a DM see and edit a party member's sheet,
//   and these notes are the one thing on it that a DM may not read. Using
//   `viewableBy` here would be the bug this file exists to prevent.
//
// A foreign or fictional id is indistinguishable either way — a miss is `null`,
// which the routes turn into 404, never 403.
//
// `neon-http` cannot do transactions, so every write here is a single row. The
// one multi-statement path is the quick capture, and it is ordered to fail
// benignly: authority is settled first, then tonight's note is found, then one
// row is written. A failure part-way costs a retry, never an authority bug.
import { and, desc, eq, exists, sql } from 'drizzle-orm'

import { getDb } from './client'
import {
  campaignNotes,
  campaigns,
  characterCampaigns,
  characterNotes,
  characters,
  type CampaignNote,
  type CharacterNote,
} from './schema'

export type { CampaignNote, CharacterNote } from './schema'

/** A shared note as a player reads it, labelled with the campaign it came from. */
export interface SharedNote {
  id: string
  campaignName: string
  sessionDate: string
  body: string
}

/** The fields a DM may change on a note. Anything omitted is left alone. */
export interface CampaignNotePatch {
  body?: string
  sessionDate?: string
  sharedWithPlayers?: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids arrive off URL segments; a malformed one is a miss, not a Postgres error. */
function isId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/** "The DM runs the campaign this note belongs to", as a WHERE fragment. */
function runBy(dmUserId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignNotes.campaignId), eq(campaigns.dmUserId, dmUserId))),
  )
}

/** True when `dmUserId` runs `campaignId` — the pre-insert authority check. */
async function campaignRunBy(dmUserId: string, campaignId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ one: sql`1` })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .limit(1)

  return row !== undefined
}

/**
 * Every note in a campaign `dmUserId` runs, newest session first. `null` when
 * there is no such campaign for this DM — distinct from a campaign with no
 * notes yet, so the page can 404 rather than render an empty card for someone
 * else's table.
 */
export async function listCampaignNotes(
  dmUserId: string,
  campaignId: string,
): Promise<CampaignNote[] | null> {
  if (!isId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  return getDb()
    .select()
    .from(campaignNotes)
    .where(and(eq(campaignNotes.campaignId, campaignId), runBy(dmUserId)))
    .orderBy(desc(campaignNotes.sessionDate), desc(campaignNotes.createdAt))
}

/**
 * Write a new note into a campaign `dmUserId` runs. `sessionDate` defaults to
 * the database's `current_date`, which is also what the quick capture matches
 * against — one clock decides which night it is, not two.
 */
export async function createCampaignNote(
  dmUserId: string,
  campaignId: string,
  input: { body: string; sessionDate?: string; sharedWithPlayers?: boolean },
): Promise<CampaignNote | null> {
  if (!isId(campaignId)) return null

  // Authority before the write: the insert itself cannot carry an EXISTS, so
  // this scoped read is what stands between a stranger and a row in someone
  // else's campaign.
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const [note] = await getDb()
    .insert(campaignNotes)
    .values({
      campaignId,
      body: input.body,
      sharedWithPlayers: input.sharedWithPlayers ?? false,
      ...(input.sessionDate === undefined ? {} : { sessionDate: input.sessionDate }),
    })
    .returning()

  return note ?? null
}

/**
 * Quick capture (DND-058's "typed during play"): add one line to tonight's
 * note, from the campaign page or the encounter tracker, one-handed.
 *
 * **Which note is "tonight's" is decided by `session_date = current_date`, and
 * nothing else.** The alternative considered was "the note you last touched,
 * if that was recently" — rejected because it silently appends to last week's
 * session if the DM happened to edit it an hour before this one started, which
 * is exactly the failure a DM would not notice. A date is a rule a human can
 * predict, and the card names the note it is about to write into, so the answer
 * is on screen before the tap.
 *
 * A session that runs past midnight therefore starts a second note. That is a
 * visible, editable outcome rather than a wrong one, and it is the honest cost
 * of not inventing an open/closed session lifecycle for a feature this size.
 *
 * No transaction, and none needed: find tonight's note, append to it by id, or
 * insert one if there is none. A failure between the statements costs a retry,
 * never a lost authority check — that was settled before the first of them.
 */
export async function appendToSessionNote(
  dmUserId: string,
  campaignId: string,
  text: string,
): Promise<CampaignNote | null> {
  if (!isId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  // Newest first, and by id: a DM who wrote two notes for tonight by hand gets
  // the line in one of them, not appended to both — which is what a WHERE on
  // `session_date` alone would do, since Postgres UPDATE has no LIMIT.
  const [tonight] = await getDb()
    .select({ id: campaignNotes.id })
    .from(campaignNotes)
    .where(
      and(
        eq(campaignNotes.campaignId, campaignId),
        eq(campaignNotes.sessionDate, sql`current_date`),
      ),
    )
    .orderBy(desc(campaignNotes.createdAt))
    .limit(1)

  if (tonight) {
    // Concatenated in SQL rather than read-modify-write in JS: two quick
    // captures a second apart from two devices both land, instead of the second
    // overwriting the first with the body it read before the first.
    const [appended] = await getDb()
      .update(campaignNotes)
      .set({ body: sql`${campaignNotes.body} || ${`\n${text}`}`, updatedAt: new Date() })
      .where(and(eq(campaignNotes.id, tonight.id), runBy(dmUserId)))
      .returning()

    if (appended) return appended
  }

  const [created] = await getDb()
    .insert(campaignNotes)
    .values({ campaignId, body: text })
    .returning()

  return created ?? null
}

/** Apply `patch` to one note in a campaign `dmUserId` runs. `null` on a miss. */
export async function updateCampaignNote(
  dmUserId: string,
  campaignId: string,
  noteId: string,
  patch: CampaignNotePatch,
): Promise<CampaignNote | null> {
  if (!isId(campaignId) || !isId(noteId)) return null

  const [note] = await getDb()
    .update(campaignNotes)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(eq(campaignNotes.id, noteId), eq(campaignNotes.campaignId, campaignId), runBy(dmUserId)),
    )
    .returning()

  return note ?? null
}

/** Delete one note. `false` when there was nothing this DM could delete. */
export async function deleteCampaignNote(
  dmUserId: string,
  campaignId: string,
  noteId: string,
): Promise<boolean> {
  if (!isId(campaignId) || !isId(noteId)) return false

  const deleted = await getDb()
    .delete(campaignNotes)
    .where(
      and(eq(campaignNotes.id, noteId), eq(campaignNotes.campaignId, campaignId), runBy(dmUserId)),
    )
    .returning({ id: campaignNotes.id })

  return deleted.length > 0
}

/**
 * The shared notes a player may read, reached through a character they own —
 * the minimal player surface DND-058 asks for, and the reason it needs no
 * campaign screen of its own.
 *
 * Three arms of the WHERE clause carry the whole visibility rule:
 * `characters.owner_id = ownerId` (it is their character),
 * `character_campaigns` (the note's campaign is one that character plays in),
 * and `shared_with_players = true` (the DM said so). Drop any one of them and
 * this becomes a leak, which is why they are written as one statement rather
 * than a filter applied after the fact.
 */
export async function listSharedNotesForCharacter(
  ownerId: string,
  characterId: string,
): Promise<SharedNote[]> {
  if (!isId(characterId)) return []

  const rows = await getDb()
    .select({
      id: campaignNotes.id,
      campaignName: campaigns.name,
      sessionDate: campaignNotes.sessionDate,
      body: campaignNotes.body,
    })
    .from(campaignNotes)
    .innerJoin(campaigns, eq(campaigns.id, campaignNotes.campaignId))
    .innerJoin(characterCampaigns, eq(characterCampaigns.campaignId, campaigns.id))
    .innerJoin(characters, eq(characters.id, characterCampaigns.characterId))
    .where(
      and(
        eq(characters.id, characterId),
        eq(characters.ownerId, ownerId),
        eq(campaignNotes.sharedWithPlayers, true),
      ),
    )
    .orderBy(desc(campaignNotes.sessionDate), desc(campaignNotes.createdAt))

  return rows
}

/**
 * A character's private notes, for its **owner only**.
 *
 * Deliberately not `viewableBy` (DND-027): a DM may read and edit every other
 * thing on a party member's sheet, and may not read this. Returns `''` for a
 * character with no notes row yet, and also for one this user does not own —
 * the two are indistinguishable from outside, which is the point.
 */
export async function getCharacterNotes(ownerId: string, characterId: string): Promise<string> {
  if (!isId(characterId)) return ''

  const [row] = await getDb()
    .select({ body: characterNotes.body })
    .from(characterNotes)
    .innerJoin(characters, eq(characters.id, characterNotes.characterId))
    .where(and(eq(characters.id, characterId), eq(characters.ownerId, ownerId)))
    .limit(1)

  return row?.body ?? ''
}

/**
 * Save a character's private notes, for its owner only. One upsert on the
 * primary key — a single row, so `neon-http`'s missing transactions never come
 * up. `null` when this user does not own the character.
 *
 * A plain save, not the DND-028 concurrency path: there is no version to guard,
 * because a player's own notebook is not something two devices contend over.
 */
export async function saveCharacterNotes(
  ownerId: string,
  characterId: string,
  body: string,
): Promise<CharacterNote | null> {
  if (!isId(characterId)) return null

  // Authority is on `characters`, and an upsert cannot join, so the ownership
  // read comes first and a stranger never reaches the write.
  const [owned] = await getDb()
    .select({ one: sql`1` })
    .from(characters)
    .where(and(eq(characters.id, characterId), eq(characters.ownerId, ownerId)))
    .limit(1)

  if (!owned) return null

  const [saved] = await getDb()
    .insert(characterNotes)
    .values({ characterId, body })
    .onConflictDoUpdate({
      target: characterNotes.characterId,
      set: { body, updatedAt: new Date() },
    })
    .returning()

  return saved ?? null
}
