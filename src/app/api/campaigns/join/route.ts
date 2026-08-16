// Join a campaign by its code, attaching your own characters (DND-046).
//
// Any signed-in user with the code may join — that is what the code is for.
// The character list is re-checked against ownership inside
// `joinCampaignByCode`; ids that are not yours are dropped, so this route
// cannot be used to move someone else's character into a campaign.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { joinCampaignByCode } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

const joinSchema = z.object({
  code: z.string().trim().min(1),
  characterIds: z.array(z.uuid()).max(20).default([]),
})

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'The database is not connected. If you run this app, see the database runbook in the repo docs.',
      },
      { status: 503 },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = joinSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'That join request is not valid' }, { status: 400 })
  }

  const campaign = await joinCampaignByCode(user.id, parsed.data.code, parsed.data.characterIds)

  if (!campaign) {
    return NextResponse.json(
      { error: 'That join link is not live. Ask your DM for a fresh one.' },
      { status: 404 },
    )
  }

  return NextResponse.json({ campaign: { id: campaign.id, name: campaign.name } })
}
