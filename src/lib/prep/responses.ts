// The answers every prep route gives that are not the happy path
// (`dm-prep-suite`).
//
// `npc-roster` wrote these four out twice, which was right for one entity.
// `locations-handouts` adds four more route files and two image routes, and
// eight copies of a 503 message is eight chances for one of them to say
// something slightly different about the same broken deploy.
//
// **404, never 403.** Authority lives in the data layer's WHERE clauses, so a
// route never learns whether the row exists for someone else — it gets `null`
// either way, and answers "no such thing". That is not politeness: a 403 on a
// campaign id would confirm the campaign exists, which is a fact about another
// DM's table.
import { NextResponse } from 'next/server'

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** `what` completes "No such …" — "campaign", "NPC", "handout". */
export function notFound(what: string) {
  return NextResponse.json({ error: `No such ${what}` }, { status: 404 })
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export function databaseUnconfigured() {
  return NextResponse.json(
    {
      error:
        'The database is not connected. If you run this app, see the database runbook in the repo docs.',
    },
    { status: 503 },
  )
}

/**
 * Read a JSON body, or say so. Every prep route takes JSON and every one of
 * them has to answer the same way when it does not get any.
 */
export async function readJsonBody(
  request: Request,
): Promise<
  { ok: true; payload: unknown } | { ok: false; response: ReturnType<typeof badRequest> }
> {
  try {
    return { ok: true, payload: await request.json() }
  } catch {
    return { ok: false, response: badRequest('Expected a JSON body') }
  }
}
