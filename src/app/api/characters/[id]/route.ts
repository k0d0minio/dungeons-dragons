// One character: read it, change it, or delete it (DND-009, DND-018).
//
// Session-gated like `/api/characters`, and 401s rather than redirecting for
// the same reason. Ownership is not checked here — it is folded into the query
// by `src/lib/db/characters.ts`, so a character belonging to someone else is
// indistinguishable from one that does not exist, which is what a 404 says.
// That holds for the writes below exactly as it does for the read: nothing on
// this route can tell a foreign id from a fictional one. When DND-027 gives a
// DM the right to edit their players' characters, it replaces the predicate in
// that one data-access module rather than adding a check here.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { combatPatchSchema, normaliseCombatPatch } from '@/lib/characters/combat'
import {
  CHARACTER_FORM_DEFAULTS,
  characterPatchSchema,
  fieldErrorsOf,
  normaliseCharacterPatch,
} from '@/lib/characters/schema'
import { deleteCharacter, getCharacter, updateCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function notFound() {
  return NextResponse.json({ error: 'No such character' }, { status: 404 })
}

function databaseUnconfigured() {
  return NextResponse.json(
    { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
    { status: 503 },
  )
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const character = await getCharacter(user.id, id)

  return character ? NextResponse.json({ character }) : notFound()
}

/**
 * Which of the two patch shapes a body is asking for, decided by its keys.
 *
 * The sheet sends live combat state — the six columns a session changes — from
 * a phone mid-combat, and that shape stays strict: it must not become a way to
 * rename a character or rewrite their ability scores. The DND-018 edit form
 * sends build fields instead. The two sets do not overlap, so the keys are
 * enough to tell them apart.
 *
 * Anything else — a body mixing the two, or naming a field that is in neither —
 * is not something either surface sends, and falls through to the strict combat
 * schema, which refuses it. Own properties only: `"toString"` is not a field.
 */
function isBuildPatch(body: unknown): boolean {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false

  const keys = Object.keys(body)

  return keys.length > 0 && keys.every((key) => Object.hasOwn(CHARACTER_FORM_DEFAULTS, key))
}

/**
 * Apply a combat-state change and answer with the stored row.
 *
 * The response body is the character as the database now holds it, not an echo
 * of the request: the sheet renders optimistically and then reconciles against
 * this, so a value the server clamped (healing past maximum, a slot spent twice
 * from two devices) corrects itself on screen instead of drifting.
 */
async function applyCombatPatch(ownerId: string, id: string, body: unknown) {
  const parsed = combatPatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That change is not valid' },
      { status: 400 },
    )
  }

  // Read before write: clamping current HP needs *this* character's maximum,
  // and it also settles ownership before anything is written.
  const existing = await getCharacter(ownerId, id)
  if (!existing) return notFound()

  const character = await updateCharacter(ownerId, id, normaliseCombatPatch(parsed.data, existing))

  return character ? NextResponse.json({ character }) : notFound()
}

/**
 * Apply an edit to a character's build (DND-018).
 *
 * Validated against the creation schema made partial, so the edit form and this
 * route cannot drift apart any more than the creation form and `POST` can, and
 * a rejection comes back field-keyed in the same shape the creation route uses
 * — the form renders it against the input that caused it either way.
 */
async function applyBuildPatch(ownerId: string, id: string, body: unknown) {
  const parsed = characterPatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'That change is not valid', fieldErrors: fieldErrorsOf(parsed.error) },
      { status: 400 },
    )
  }

  // Read before write for the same two reasons as a combat patch: lowering the
  // maximum needs the character's current hit points, and a miss here is a 404
  // before anything has been written.
  const existing = await getCharacter(ownerId, id)
  if (!existing) return notFound()

  const character = await updateCharacter(
    ownerId,
    id,
    normaliseCharacterPatch(parsed.data, existing),
  )

  return character ? NextResponse.json({ character }) : notFound()
}

/** Change a character: live combat state from the sheet, or the build itself. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  return isBuildPatch(body)
    ? applyBuildPatch(user.id, id, body)
    : applyCombatPatch(user.id, id, body)
}

/**
 * Delete a character (DND-018).
 *
 * Owner-scoped in the query like everything else here, so deleting an id that
 * belongs to someone else answers the same 404 as deleting one that was never
 * real — a foreign id is not confirmed as existing by the attempt to remove it.
 *
 * There is no soft delete and no undo: this is a personal-scale app, the
 * confirmation dialog in the UI is the safeguard, and a tombstoned row that the
 * list has to filter out is a cost paid on every read for a case that has not
 * come up.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const { id } = await params
  const deleted = await deleteCharacter(user.id, id)

  return deleted ? NextResponse.json({ deleted: true }) : notFound()
}
