// End the fight, or put it back on the table
// (`dm-run-suite/session-log-recap`).
//
// **Its own endpoint rather than a field on the encounter's PATCH**, for the
// reason `src/lib/prep/reveal.ts` gives about reveals: that PATCH renames an
// encounter and steps the round counter, which are things the DM does a
// hundred times an evening, and this is the one act that says the fight is
// over and puts a line in tonight's log. Two consequences, two request shapes,
// and no field name in a stepper's body one typo away from ending the fight.
//
// `PUT` with `{ "completed": boolean }` because the body names the state the
// DM wants: two taps that both mean "over" leave one timestamp, and reopening
// is the same request with the other value rather than a repair path.
//
// Authority is in the data layer's WHERE clause, so an encounter in a campaign
// this user does not run answers 404 exactly like one that never existed.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { setEncounterCompleted } from '@/lib/db/encounters'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/** Which way the switch was thrown. Nothing else is accepted. */
const completeSchema = z.object({
  completed: z.boolean({ message: 'Say whether this fight is over' }),
})

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = completeSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That change is not valid')
  }

  const { id } = await params
  const encounter = await setEncounterCompleted(user.id, id, parsed.data.completed)

  return encounter ? NextResponse.json({ encounter }) : notFound('encounter')
}
