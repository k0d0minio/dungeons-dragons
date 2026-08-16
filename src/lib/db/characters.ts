// Typed data access for `characters` (DND-007, viewer predicate DND-027,
// concurrency guard DND-028).
//
// Every read/write takes the *viewer* first and folds authority into the WHERE
// clause. That is the whole security model for character data — there is no
// row-level security policy behind this, so an unscoped query written later
// would silently expose other people's characters. Making the viewer a
// required leading argument is the cheapest way to make that mistake hard to
// write.
//
// **Who is a viewer of a character (D13):** its owner, or the DM of a campaign
// the character is in — `campaigns.dm_user_id` and nothing else, exactly as
// the schema's "roster, not a permission grant" warning demands. The predicate
// covers reads *and* edits (a DM edits live combat state per D13). Two calls
// stay owner-only on purpose:
//
// - `listCharacters` backs the "Your characters" page; a DM reads the party
//   through the campaign roster (DND-030), not by having everyone else's
//   characters mixed into their own list.
// - `deleteCharacter` — D13 grants "sees and edits", not "deletes". Removing a
//   player's character is theirs to do.
//
// A non-viewer's id is indistinguishable from one that never existed: 404, not
// 403, and that property is deliberate.
import { and, desc, eq, exists, or, sql } from 'drizzle-orm'

import { getDb } from './client'
import {
  campaigns,
  characterCampaigns,
  characters,
  type Character,
  type NewCharacter,
} from './schema'

export type { Character, NewCharacter, SpellSlotState } from './schema'

/** The columns a caller may set. Identity, versioning and timestamps are ours. */
export type CharacterInput = Omit<
  NewCharacter,
  'id' | 'ownerId' | 'version' | 'createdAt' | 'updatedAt'
>

/** Creation input: a new character starts at full HP unless told otherwise. */
export type CreateCharacterInput = Omit<CharacterInput, 'currentHitPoints'> & {
  currentHitPoints?: number
}

/** Update input. Anything omitted is left alone. */
export type CharacterPatch = Partial<CharacterInput>

/**
 * What an update came to (DND-028). `conflict` carries the row as it is now,
 * so the caller can answer 409 with the state the writer needs to reconcile
 * against without a second query.
 */
export type UpdateCharacterResult =
  | { outcome: 'updated'; character: Character }
  | { outcome: 'conflict'; character: Character }
  | { outcome: 'missing' }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ids reach these functions straight off a URL segment. Postgres raises a type
 * error on a malformed uuid, which would surface as a 500 for what is really a
 * "no such character" — so treat an unparseable id as a miss.
 */
function isCharacterId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/**
 * "`viewerId` may see this character": they own it, or they are the DM of a
 * campaign it is in. The subquery leans on `character_campaigns`' primary key
 * (leads with `character_id`) and `campaigns_dm_user_id_idx`.
 *
 * Exported for `items.ts`, which scopes every inventory query through an
 * EXISTS on `characters` carrying this same predicate — one definition of
 * "may see", not two.
 */
export function viewableBy(viewerId: string) {
  return or(
    eq(characters.ownerId, viewerId),
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(characterCampaigns)
        .innerJoin(campaigns, eq(characterCampaigns.campaignId, campaigns.id))
        .where(
          and(eq(characterCampaigns.characterId, characters.id), eq(campaigns.dmUserId, viewerId)),
        ),
    ),
  )
}

/** Every character belonging to `ownerId`, most recently updated first. */
export async function listCharacters(ownerId: string): Promise<Character[]> {
  return getDb()
    .select()
    .from(characters)
    .where(eq(characters.ownerId, ownerId))
    .orderBy(desc(characters.updatedAt))
}

/** One character `viewerId` may see, or `null` — foreign and fictional ids look alike. */
export async function getCharacter(viewerId: string, id: string): Promise<Character | null> {
  if (!isCharacterId(id)) return null

  const [character] = await getDb()
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), viewableBy(viewerId)))
    .limit(1)

  return character ?? null
}

/** Insert a character owned by `ownerId` and return the stored row. */
export async function createCharacter(
  ownerId: string,
  input: CreateCharacterInput,
): Promise<Character> {
  const { currentHitPoints, ...rest } = input

  const [character] = await getDb()
    .insert(characters)
    .values({
      ...rest,
      ownerId,
      currentHitPoints: currentHitPoints ?? input.maxHitPoints,
    })
    .returning()

  return character
}

/**
 * Apply `patch` to a character `viewerId` may edit (owner or campaign DM —
 * D13) and return the updated row.
 *
 * When `expectedVersion` is given, the write only lands if the row still holds
 * that version (DND-028): the stale writer gets `conflict` with the current
 * row instead of silently overwriting the other device's change. Every
 * successful write bumps `version` by one, whether or not the caller checked.
 */
export async function updateCharacter(
  viewerId: string,
  id: string,
  patch: CharacterPatch,
  expectedVersion?: number,
): Promise<UpdateCharacterResult> {
  if (!isCharacterId(id)) return { outcome: 'missing' }

  const guard = expectedVersion === undefined ? undefined : eq(characters.version, expectedVersion)

  const [character] = await getDb()
    .update(characters)
    .set({ ...patch, version: sql`${characters.version} + 1`, updatedAt: new Date() })
    .where(and(eq(characters.id, id), viewableBy(viewerId), guard))
    .returning()

  if (character) return { outcome: 'updated', character }

  // Nothing written: either the version moved underneath the writer, or there
  // is no such character for this viewer. One more read tells them apart —
  // and it must be viewer-scoped, so a stale *foreign* id still 404s.
  const current = await getCharacter(viewerId, id)
  return current ? { outcome: 'conflict', character: current } : { outcome: 'missing' }
}

/** Delete one of `ownerId`'s characters. `false` when there was nothing to delete. */
export async function deleteCharacter(ownerId: string, id: string): Promise<boolean> {
  if (!isCharacterId(id)) return false

  const deleted = await getDb()
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.ownerId, ownerId)))
    .returning({ id: characters.id })

  return deleted.length > 0
}
