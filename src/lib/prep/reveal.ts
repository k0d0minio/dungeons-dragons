// The act of revealing, as one request shape and one handler
// (`dm-run-suite/reveal-controls`).
//
// **Revealing has its own endpoint, and that is the design.** Every prep entity
// already has a PATCH that writes its text, and each of those routes says in
// its header that `revealedAt` is deliberately absent from its zod schema. This
// is why: an edit changes prep the DM alone reads, and a reveal puts content on
// the party's phones and on a screen on the wall within one poll. Two acts with
// different consequences get two endpoints, so no field name in a JSON body is
// ever one typo away from showing the party something.
//
// The body is `{ "revealed": boolean }` rather than a bare POST to `/reveal`
// and a DELETE to un-reveal, because the DM's control is one switch with two
// positions and a request that names the position it wants is idempotent: two
// taps that both mean "revealed" leave one timestamp, and the second is not an
// error to explain at the table.
//
// Un-revealing exists for misclicks and is not a lesser path — same route, same
// shape, same answer.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'

import { badRequest, databaseUnconfigured, notFound, readJsonBody, unauthorized } from './responses'

/** Which way the switch was thrown. Nothing else is accepted. */
export const revealSchema = z.object({
  revealed: z.boolean({ message: 'Say whether this is revealed or hidden' }),
})

/**
 * The whole of a reveal route: session, database, body, write, answer.
 *
 * Authority is not checked here and could not be — it lives in the WHERE clause
 * of the `set…Revealed` statement the caller closes over, so a row in someone
 * else's campaign comes back `null` and leaves as a 404, never a 403, exactly
 * like every other prep route.
 *
 * `what` completes "No such …" and `key` names the entity in the response body,
 * so the three callers stay three lines of their own each while the parts that
 * must not drift — the schema, the status codes, the wording — are here.
 */
export async function handleReveal<Row>(
  request: Request,
  what: string,
  key: string,
  apply: (userId: string, revealed: boolean) => Promise<Row | null>,
): Promise<NextResponse> {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = revealSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That change is not valid')
  }

  const row = await apply(user.id, parsed.data.revealed)

  return row ? NextResponse.json({ [key]: row }) : notFound(what)
}
