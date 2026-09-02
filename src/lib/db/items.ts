// Typed data access for `character_items` (DND-035).
//
// Same security model as `characters.ts`, and the same shape: every function
// takes the *viewer* first, and authority is folded into the query — each
// statement that touches `character_items` carries an EXISTS on `characters`
// with the shared `viewableBy` predicate, so an item behind a character the
// viewer may not see is indistinguishable from one that never existed (404,
// not 403). A DM edits the party's inventory the same way they edit its hit
// points (D13).
//
// The attunement cap lives HERE, as app logic, not as a database CHECK
// (DND-035's explicit call): 5e says three attuned items, homebrew says
// otherwise, so the database must be able to hold what the app refuses to
// produce. The check-then-write below is not transactional (`neon-http`
// cannot do transactions), which at one table's scale is an accepted race —
// the fourth attunement needs two writes in the same instant.
import { and, asc, count, eq, exists, ne, sql } from 'drizzle-orm'

import { ATTUNEMENT_LIMIT } from '@/lib/characters/items'

import { viewableBy } from './characters'
import { getDb } from './client'
import { characterItems, characters, type CharacterItem, type NewCharacterItem } from './schema'

export type { CharacterItem, NewCharacterItem } from './schema'

/** The columns a caller may set. Identity, ownership and timestamps are ours. */
export type CharacterItemInput = Omit<
  NewCharacterItem,
  'id' | 'characterId' | 'createdAt' | 'updatedAt'
>

/** Update input. Anything omitted is left alone. What an item *is* is not editable. */
export type CharacterItemPatch = Partial<
  Pick<CharacterItemInput, 'customName' | 'quantity' | 'equipped' | 'attuned' | 'notes'>
>

/**
 * What an item write came to. `attunement-limit` is the app-logic refusal:
 * the character already has {@link ATTUNEMENT_LIMIT} items attuned.
 */
export type ItemWriteResult =
  | { outcome: 'written'; item: CharacterItem }
  | { outcome: 'missing' }
  | { outcome: 'attunement-limit' }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Malformed ids off a URL segment are a miss, not a Postgres type error. */
function isId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

/** The EXISTS arm every inventory statement carries: the character is viewable. */
function itemCharacterViewableBy(viewerId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(characters)
      .where(and(eq(characters.id, characterItems.characterId), viewableBy(viewerId))),
  )
}

/** True when `viewerId` may see `characterId` — the pre-write authority check. */
async function characterVisible(viewerId: string, characterId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ one: sql`1` })
    .from(characters)
    .where(and(eq(characters.id, characterId), viewableBy(viewerId)))
    .limit(1)

  return row !== undefined
}

/** How many of the character's items are attuned, excluding `excludeItemId`. */
async function attunedCount(characterId: string, excludeItemId?: string): Promise<number> {
  const exclusion = excludeItemId === undefined ? undefined : ne(characterItems.id, excludeItemId)

  const [row] = await getDb()
    .select({ value: count() })
    .from(characterItems)
    .where(
      and(eq(characterItems.characterId, characterId), eq(characterItems.attuned, true), exclusion),
    )

  return row?.value ?? 0
}

/**
 * Every item of a character `viewerId` may see, oldest first (the order they
 * were acquired). `null` when there is no such character for this viewer —
 * distinct from an empty inventory, so the route can 404 rather than shrug.
 */
export async function listItems(
  viewerId: string,
  characterId: string,
): Promise<CharacterItem[] | null> {
  if (!isId(characterId)) return null

  const items = await getDb()
    .select()
    .from(characterItems)
    .where(and(eq(characterItems.characterId, characterId), itemCharacterViewableBy(viewerId)))
    .orderBy(asc(characterItems.createdAt), asc(characterItems.id))

  if (items.length > 0) return items

  // Nothing came back: an empty inventory and an invisible character look the
  // same from here. One more viewer-scoped read tells them apart.
  return (await characterVisible(viewerId, characterId)) ? [] : null
}

/**
 * Add an item to a character `viewerId` may edit. Refuses (`attunement-limit`)
 * an item arriving already attuned when {@link ATTUNEMENT_LIMIT} items are.
 */
export async function addItem(
  viewerId: string,
  characterId: string,
  input: CharacterItemInput,
): Promise<ItemWriteResult> {
  if (!isId(characterId)) return { outcome: 'missing' }

  // Authority before anything else: a non-viewer learns nothing but "404",
  // not even that the attunement count exists to be checked.
  if (!(await characterVisible(viewerId, characterId))) return { outcome: 'missing' }

  if (input.attuned === true && (await attunedCount(characterId)) >= ATTUNEMENT_LIMIT) {
    return { outcome: 'attunement-limit' }
  }

  const [item] = await getDb()
    .insert(characterItems)
    .values({ ...input, characterId })
    .returning()

  return { outcome: 'written', item }
}

/**
 * Insert a character's starting equipment, straight in
 * (`guided-creation/wizard-frame`).
 *
 * The only function in this module without a viewer argument, and the comment
 * is the justification: it runs inside `POST /api/characters`, on a row that
 * request has just created for the session's own user, from a list the server
 * derived from SRD data rather than took off the wire. There is no viewer to
 * check that the insert above it did not already check.
 *
 * Nothing is attuned at creation, so the attunement cap has nothing to say and
 * is not consulted. An empty list writes nothing rather than issuing an INSERT
 * with no rows, which Postgres rejects.
 */
export async function addStartingItems(
  characterId: string,
  inputs: readonly CharacterItemInput[],
): Promise<CharacterItem[]> {
  if (!isId(characterId) || inputs.length === 0) return []

  return getDb()
    .insert(characterItems)
    .values(inputs.map((input) => ({ ...input, characterId })))
    .returning()
}

/**
 * Apply `patch` to one item of a character `viewerId` may edit. Turning
 * `attuned` on counts the *other* attuned items first, so re-saving an
 * already-attuned item is never refused.
 */
export async function updateItem(
  viewerId: string,
  characterId: string,
  itemId: string,
  patch: CharacterItemPatch,
): Promise<ItemWriteResult> {
  if (!isId(characterId) || !isId(itemId)) return { outcome: 'missing' }

  if (patch.attuned === true) {
    if (!(await characterVisible(viewerId, characterId))) return { outcome: 'missing' }

    if ((await attunedCount(characterId, itemId)) >= ATTUNEMENT_LIMIT) {
      return { outcome: 'attunement-limit' }
    }
  }

  const [item] = await getDb()
    .update(characterItems)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(characterItems.id, itemId),
        eq(characterItems.characterId, characterId),
        itemCharacterViewableBy(viewerId),
      ),
    )
    .returning()

  return item ? { outcome: 'written', item } : { outcome: 'missing' }
}

/** Delete one item. `false` when there was nothing this viewer could delete. */
export async function deleteItem(
  viewerId: string,
  characterId: string,
  itemId: string,
): Promise<boolean> {
  if (!isId(characterId) || !isId(itemId)) return false

  const deleted = await getDb()
    .delete(characterItems)
    .where(
      and(
        eq(characterItems.id, itemId),
        eq(characterItems.characterId, characterId),
        itemCharacterViewableBy(viewerId),
      ),
    )
    .returning({ id: characterItems.id })

  return deleted.length > 0
}
