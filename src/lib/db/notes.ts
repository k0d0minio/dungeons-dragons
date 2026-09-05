// Typed data access for campaign and character notes (DND-058).
//
// Two tables, two different secrets, and this file is the only place either is
// read from — see the section comment in `schema.ts` for why they are tables
// rather than columns. The rule the register states, restated as the property
// every function here holds:
//
// - **A DM's notes are not player-readable unless shared.** Every DM-side
//   statement folds `campaigns.dm_user_id` into its WHERE clause, the same
//   shape `encounters.ts` uses. The two player-side reads —
//   `listSharedNotesForCharacter`, reached through a character its asker owns,
//   and `listCampaignRecaps`, reached through the campaign roster — both carry
//   `shared_with_players = true` as a non-negotiable arm of their WHERE clause,
//   so an unshared note cannot reach a player even by id. `listCampaignRecaps`
//   carries a third arm on top of it (`session_closed_at is not null`), because
//   the campaign view shows recaps rather than everything shared.
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
import { and, desc, eq, exists, isNotNull, isNull, sql } from 'drizzle-orm'

import { getDb } from './client'
import {
  campaignMembers,
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

/**
 * A published recap as a player reads it on their campaign view — three
 * columns, and the campaign it belongs to is the page they are already on.
 */
export interface CampaignRecap {
  id: string
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
 * Tonight's open note, by id — the row a quick capture appends to and the row
 * the close-session step reads back as the DM's own half of the recap.
 *
 * "Open" is `session_closed_at is null`, and "tonight" is
 * `session_date = current_date`; between them they name exactly one row, the
 * newest first so a DM who wrote two notes for tonight by hand gets the line
 * in one of them rather than in both — which is what a WHERE on `session_date`
 * alone would do, since Postgres UPDATE has no LIMIT.
 *
 * Authority rides in the WHERE clause rather than in a pre-read, so this is
 * one statement a caller can fold into a `Promise.all` beside the session
 * log's other five — and a campaign this DM does not run reads as no note,
 * which is the same answer a campaign with nothing captured gives.
 */
async function openNoteRow(
  dmUserId: string,
  campaignId: string,
): Promise<CampaignNote | undefined> {
  const [note] = await getDb()
    .select()
    .from(campaignNotes)
    .where(
      and(
        eq(campaignNotes.campaignId, campaignId),
        eq(campaignNotes.sessionDate, sql`current_date`),
        isNull(campaignNotes.sessionClosedAt),
        runBy(dmUserId),
      ),
    )
    .orderBy(desc(campaignNotes.createdAt))
    .limit(1)

  return note
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
 *
 * **A closed session's note is never appended to**
 * (`dm-run-suite/session-log-recap`): once the DM has published a recap, that
 * row is what the party is reading, and a line typed after the fact would edit
 * it under them. `session_closed_at is null` is on both statements below, so a
 * capture after a close starts the next session's note instead — which is what
 * it is: the next session's first line.
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
  const tonight = await openNoteRow(dmUserId, campaignId)

  if (tonight) {
    // Concatenated in SQL rather than read-modify-write in JS: two quick
    // captures a second apart from two devices both land, instead of the second
    // overwriting the first with the body it read before the first.
    const [appended] = await getDb()
      .update(campaignNotes)
      .set({ body: sql`${campaignNotes.body} || ${`\n${text}`}`, updatedAt: new Date() })
      .where(
        and(
          eq(campaignNotes.id, tonight.id),
          isNull(campaignNotes.sessionClosedAt),
          runBy(dmUserId),
        ),
      )
      .returning()

    if (appended) return appended
  }

  const [created] = await getDb()
    .insert(campaignNotes)
    .values({ campaignId, body: text })
    .returning()

  return created ?? null
}

/**
 * Tonight's open note for a campaign `dmUserId` runs, or `null`
 * (`dm-run-suite/session-log-recap`).
 *
 * The quick-captured lines are the half of a recap no query can derive — "the
 * goblin chief surrendered" is not a timestamp on anything — so the session
 * log carries this row beside the acts it derived, and the recap draft is the
 * two of them together.
 *
 * One statement, with `runBy` in it rather than a pre-read in front of it, so
 * the log can run this alongside its five derived reads instead of behind a
 * second authority round trip on a page that already settled authority.
 */
export async function getOpenSessionNote(
  dmUserId: string,
  campaignId: string,
): Promise<CampaignNote | null> {
  if (!isId(campaignId)) return null

  return (await openNoteRow(dmUserId, campaignId)) ?? null
}

/**
 * When this campaign last closed a session, or `null` if it never has — the
 * boundary the derived session log measures from.
 *
 * A campaign that has never closed one has a log of everything, which is the
 * right answer for a table that has been playing for weeks and is writing its
 * first recap tonight: the DM trims, and the next log starts from this stamp.
 */
export async function getLastSessionClose(
  dmUserId: string,
  campaignId: string,
): Promise<Date | null> {
  if (!isId(campaignId)) return null

  const [row] = await getDb()
    .select({ closedAt: campaignNotes.sessionClosedAt })
    .from(campaignNotes)
    .where(
      and(
        eq(campaignNotes.campaignId, campaignId),
        isNotNull(campaignNotes.sessionClosedAt),
        runBy(dmUserId),
      ),
    )
    .orderBy(desc(campaignNotes.sessionClosedAt))
    .limit(1)

  return row?.closedAt ?? null
}

/**
 * Close the session: publish what the DM edited as this campaign's recap
 * (`dm-run-suite/session-log-recap`, D41).
 *
 * **One insert, and it is a campaign note.** The recap is not a second entity
 * — it is a row on DND-058's surface that happens to be shared and to carry
 * `session_closed_at`, so the DM's notes list, the player's campaign view and
 * this all read the one table.
 *
 * **It never overwrites the note the DM captured into.** The draft it was
 * edited from already contains those lines, so writing the recap over them
 * would destroy the raw material of the evening to save a row — and a DM who
 * trimmed too hard would have nothing to trim back from. The captures stay
 * where they are, unshared and unclosed; what the party gets is the new row.
 *
 * Both consequences of the stamp land here in one write: the log's window
 * moves to now, so tomorrow's log starts empty, and the published row is one
 * `appendToSessionNote` will never touch again.
 */
export async function publishSessionRecap(
  dmUserId: string,
  campaignId: string,
  body: string,
): Promise<CampaignNote | null> {
  if (!isId(campaignId)) return null

  // Authority before the write, for `createCampaignNote`'s reason: an INSERT
  // cannot carry an EXISTS, and this read is what stands between a stranger
  // and a published recap on someone else's table.
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  // Idempotent by content: the newest recap this campaign already published,
  // when it is these very words, is answered rather than written again. The
  // callers are the two closes, each a second write on a driver with no
  // transactions — a close that failed *after* this insert is pressed again
  // with the same box, and the party must not read "previously on…" twice.
  const [latest] = await getDb()
    .select()
    .from(campaignNotes)
    .where(
      and(
        eq(campaignNotes.campaignId, campaignId),
        eq(campaignNotes.sharedWithPlayers, true),
        isNotNull(campaignNotes.sessionClosedAt),
      ),
    )
    .orderBy(desc(campaignNotes.sessionClosedAt))
    .limit(1)

  if (latest && latest.body === body) return latest

  const [recap] = await getDb()
    .insert(campaignNotes)
    .values({
      campaignId,
      body,
      sharedWithPlayers: true,
      sessionClosedAt: new Date(),
    })
    .returning()

  return recap ?? null
}

/**
 * The recaps a player may read on their campaign view
 * (`dm-run-suite/session-log-recap`) — "previously on…", newest first.
 *
 * The player-side twin of `listSharedNotesForCharacter`, and it is a second
 * function rather than an argument to that one because the two answer through
 * different things: that one reaches a campaign through a character its asker
 * owns, this one through the campaign roster, and a flag between them would be
 * the kind of thing that eventually gets passed the wrong way round.
 *
 * Three arms carry the whole visibility rule, and dropping any one is a leak:
 * `campaign_members` (the asker sits at this table), `shared_with_players`
 * (the DM said so) and `session_closed_at is not null` (**it is a recap, not
 * merely a shared note**). The last is what makes this list what the stub asks
 * for: players see recaps, and a note the DM shared for some other reason is
 * not one. The selection names three columns, so there is no `id` of a
 * campaign or an author on the way back to be rendered by mistake.
 */
export async function listCampaignRecaps(
  userId: string,
  campaignId: string,
): Promise<CampaignRecap[]> {
  if (!isId(campaignId)) return []

  return getDb()
    .select({
      id: campaignNotes.id,
      sessionDate: campaignNotes.sessionDate,
      body: campaignNotes.body,
    })
    .from(campaignNotes)
    .innerJoin(
      campaignMembers,
      and(
        eq(campaignMembers.campaignId, campaignNotes.campaignId),
        eq(campaignMembers.userId, userId),
      ),
    )
    .where(
      and(
        eq(campaignNotes.campaignId, campaignId),
        eq(campaignNotes.sharedWithPlayers, true),
        isNotNull(campaignNotes.sessionClosedAt),
      ),
    )
    .orderBy(desc(campaignNotes.sessionClosedAt))
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
