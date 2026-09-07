// Close the session: publish the DM's edited recap
// (`dm-run-suite/session-log-recap`, D41).
//
// One POST, one act, and the act is both halves at once — the recap goes to
// the party and the log's window moves to now. They are not separable here on
// purpose: a "closed but unpublished" session would be a state with nothing to
// show for it, and a recap published without closing would leave tomorrow's
// log still carrying tonight's fights.
//
// Not a PATCH on `../notes/[noteId]`, even though what it writes is a campaign
// note. That route edits a note the DM already has; this one is the end of an
// evening, and it is the only way a row is ever written with
// `session_closed_at` on it. Naming the act keeps the write in one place, and
// it means "publish a recap" is a thing a reviewer can grep for.
//
// Authority is the data layer's: a campaign this user does not run answers 404,
// like every other campaign-scoped route.
//
// The night's answers ride with it (`first-table/between-sessions-questions`):
// one row per character — favourite moment, what they want next, a highlight
// — landing dated under *Threads* in that character's DM note. **Notes
// first, then the recap**, on a driver with no transactions: a failure
// between the two leaves the answers written and the session still open, and
// pressing the button again finishes the job — the append is idempotent line
// by line, so nothing lands twice, even with one answer edited in between. The reverse order would leave a closed
// session with the answers lost.
// The night's plan rides with it too (`dm-chronology/session-chain`): the
// recap is stamped with the plan the evening ran from, which is the one column
// that makes a plan, a log window and a recap one night rather than three rows
// sharing a date. The DM confirms it in the dialog; the route resolves what
// they sent against this campaign's own plans, so an id from another table is
// a link that never gets written rather than a foreign key that does.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { appendToCharacterDmNote } from '@/lib/db/dm-notes'
import { publishSessionRecap } from '@/lib/db/notes'
import { listSessionPlans } from '@/lib/db/session-plans'
import { sessionAnswersBlock } from '@/lib/notes/dm-note'
import { closeSessionSchema, todaySessionDate } from '@/lib/notes/schema'
import {
  badRequest,
  databaseUnconfigured,
  notFound,
  readJsonBody,
  unauthorized,
} from '@/lib/prep/responses'
import { nextPlannedNight } from '@/lib/session-plans/next-night'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!isDatabaseConfigured()) return databaseUnconfigured()

  const body = await readJsonBody(request)
  if (!body.ok) return body.response

  const parsed = closeSessionSchema.safeParse(body.payload)

  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That recap is not valid')
  }

  const { id } = await params
  const tonight = todaySessionDate()

  // The link is resolved before anything is written, and against this
  // campaign's plans: the DM's pick is honoured when it is one of them, an id
  // from anywhere else is refused rather than quietly dropped, and an omitted
  // field means tonight's plan by the rule the Play tab already runs on.
  // `listSessionPlans` settles authority as it reads, so a campaign this user
  // does not run stops here with the same 404 the recap would have given.
  const plans = await listSessionPlans(user.id, id)
  if (!plans) return notFound('campaign')

  const picked = parsed.data.planId
  const planId =
    picked === undefined ? (nextPlannedNight(plans, tonight)?.id ?? null) : (picked ?? null)

  if (planId !== null && !plans.some((plan) => plan.id === planId)) {
    return badRequest('That plan is not in this campaign')
  }

  for (const answer of parsed.data.answers ?? []) {
    const block = sessionAnswersBlock(tonight, answer)
    if (!block) continue
    // A character not on this DM's table is skipped, not refused: the
    // answers are the DM's own words, and the recap should still publish.
    await appendToCharacterDmNote(user.id, id, answer.characterId, 'Threads', block)
  }

  const recap = await publishSessionRecap(user.id, id, parsed.data.body, planId)

  return recap ? NextResponse.json({ recap }, { status: 201 }) : notFound('campaign')
}
