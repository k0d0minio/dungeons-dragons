// Typed data access for `characters` (DND-007).
//
// Every function takes `ownerId` first and folds it into the WHERE clause. That
// is the whole security model for character data — there is no row-level
// security policy behind this, so an unscoped query written later would silently
// expose other people's characters. Making the owner a required leading argument
// is the cheapest way to make that mistake hard to write.
//
// Safe to call from server components, server actions and route handlers.
import { and, desc, eq } from 'drizzle-orm'

import { getDb } from './client'
import { characters, type Character, type NewCharacter } from './schema'

export type { Character, NewCharacter, SpellSlotState } from './schema'

/** The columns a caller may set. Identity and timestamps are ours to manage. */
export type CharacterInput = Omit<NewCharacter, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>

/** Creation input: a new character starts at full HP unless told otherwise. */
export type CreateCharacterInput = Omit<CharacterInput, 'currentHitPoints'> & {
  currentHitPoints?: number
}

/** Update input. Anything omitted is left alone. */
export type CharacterPatch = Partial<CharacterInput>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ids reach these functions straight off a URL segment. Postgres raises a type
 * error on a malformed uuid, which would surface as a 500 for what is really a
 * "no such character" — so treat an unparseable id as a miss.
 */
function isCharacterId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/** Every character belonging to `ownerId`, most recently updated first. */
export async function listCharacters(ownerId: string): Promise<Character[]> {
  return getDb()
    .select()
    .from(characters)
    .where(eq(characters.ownerId, ownerId))
    .orderBy(desc(characters.updatedAt))
}

/** One character, or `null` if it does not exist or belongs to someone else. */
export async function getCharacter(ownerId: string, id: string): Promise<Character | null> {
  if (!isCharacterId(id)) return null

  const [character] = await getDb()
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.ownerId, ownerId)))
    .limit(1)

  return character ?? null
}

/** Insert a character owned by `ownerId` and return the stored row. */
export async function createCharacter(
  ownerId: string,
  input: CreateCharacterInput
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
 * Apply `patch` to one of `ownerId`'s characters and return the updated row, or
 * `null` if there was nothing of theirs to update.
 */
export async function updateCharacter(
  ownerId: string,
  id: string,
  patch: CharacterPatch
): Promise<Character | null> {
  if (!isCharacterId(id)) return null

  const [character] = await getDb()
    .update(characters)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(characters.id, id), eq(characters.ownerId, ownerId)))
    .returning()

  return character ?? null
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
