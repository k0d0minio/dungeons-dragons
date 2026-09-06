// Typed data access for `character_dm_notes` (`first-table/dm-character-notes`).
//
// The DM-only pair of `notes.ts`'s character notes, and the only file that
// touches the table. Every statement carries the same predicate: the asker
// runs the campaign named in the URL (`campaigns.dm_user_id`, D19) **and** the
// character is on that campaign's roster (`character_campaigns`) — the two
// arms the profile page is scoped by, so a stale link cannot read a note from
// a table the same DM runs elsewhere. Never `campaign_members.role`, which
// grants nothing (schema.ts). The owner has no arm here at all: a player asking
// about their own character gets `''`, the same answer as a stranger, and no
// player-facing read ever selects this table (D38).
import { and, eq, sql } from 'drizzle-orm'

import { DM_NOTE_TEMPLATE, appendUnderHeading, type DmNoteHeading } from '@/lib/notes/dm-note'

import { getDb } from './client'
import { campaigns, characterCampaigns, characterDmNotes, type CharacterDmNote } from './schema'

export type { CharacterDmNote } from './schema'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/**
 * The authority read: one row when `dmUserId` runs `campaignId` and
 * `characterId` is on its roster. Asked before every write (an upsert cannot
 * join) and folded into the read.
 */
async function characterRunBy(
  dmUserId: string,
  campaignId: string,
  characterId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ one: sql`1` })
    .from(characterCampaigns)
    .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
    .where(
      and(
        eq(characterCampaigns.characterId, characterId),
        eq(characterCampaigns.campaignId, campaignId),
        eq(campaigns.dmUserId, dmUserId),
      ),
    )
    .limit(1)

  return row !== undefined
}

/**
 * The DM's note on a character, or `''` — for a character with no note yet,
 * and equally for one this asker may not read. The template is not applied
 * here: a stored `''` and "no row" both read as empty, and the card decides
 * what an empty note opens as.
 */
export async function getCharacterDmNote(
  dmUserId: string,
  campaignId: string,
  characterId: string,
): Promise<string> {
  if (!isId(campaignId) || !isId(characterId)) return ''

  const [row] = await getDb()
    .select({ body: characterDmNotes.body })
    .from(characterDmNotes)
    .innerJoin(characterCampaigns, eq(characterCampaigns.characterId, characterDmNotes.characterId))
    .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
    .where(
      and(
        eq(characterDmNotes.characterId, characterId),
        eq(characterCampaigns.campaignId, campaignId),
        eq(campaigns.dmUserId, dmUserId),
      ),
    )
    .limit(1)

  return row?.body ?? ''
}

/**
 * Save the DM's note. One upsert on the primary key after the authority read,
 * so `neon-http`'s missing transactions never come up. `null` when the asker
 * does not run this character's table.
 */
export async function saveCharacterDmNote(
  dmUserId: string,
  campaignId: string,
  characterId: string,
  body: string,
): Promise<CharacterDmNote | null> {
  if (!isId(campaignId) || !isId(characterId)) return null
  if (!(await characterRunBy(dmUserId, campaignId, characterId))) return null

  const [saved] = await getDb()
    .insert(characterDmNotes)
    .values({ characterId, body })
    .onConflictDoUpdate({
      target: characterDmNotes.characterId,
      set: { body, updatedAt: new Date() },
    })
    .returning()

  return saved ?? null
}

/**
 * Add a block under one of the note's headings
 * (`first-table/between-sessions-questions`): the night's answers land under
 * *Threads*, dated. A note that does not exist yet is seeded from the template
 * first, so the answers land on the page the DM will later open. Idempotent by
 * content — `appendUnderHeading` refuses a block the note already carries —
 * which is what makes a re-pressed close-session step harmless. `false` when
 * the asker does not run this character's table.
 */
export async function appendToCharacterDmNote(
  dmUserId: string,
  campaignId: string,
  characterId: string,
  heading: DmNoteHeading,
  block: string,
): Promise<boolean> {
  if (!isId(campaignId) || !isId(characterId)) return false
  if (!block.trim()) return true
  if (!(await characterRunBy(dmUserId, campaignId, characterId))) return false

  const [existing] = await getDb()
    .select({ body: characterDmNotes.body })
    .from(characterDmNotes)
    .where(eq(characterDmNotes.characterId, characterId))
    .limit(1)

  const current = existing?.body ?? DM_NOTE_TEMPLATE
  const next = appendUnderHeading(current, heading, block)
  if (next === existing?.body) return true

  await getDb()
    .insert(characterDmNotes)
    .values({ characterId, body: next })
    .onConflictDoUpdate({
      target: characterDmNotes.characterId,
      set: { body: next, updatedAt: new Date() },
    })

  return true
}
