// Mint an invite link (`user-management/invites-and-roles`). DM-only by the
// global role (D19): a player gets an honest 403, as on campaign creation —
// the role is not a secret the way a row is.
//
// An invite may carry a campaign (`dm-chronology/one-link-invite`), which is
// what makes it one link rather than two: claiming it seats the new account at
// that table. The campaign is re-read here against `campaigns.dm_user_id`
// rather than trusted from the body — the same rule every other DM write obeys
// — so a DM cannot mint a link onto somebody else's table.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { getCampaignForDm } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { createInvite } from '@/lib/db/invites'
import { isDm } from '@/lib/db/roles'
import { USER_ROLES } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

const createInviteSchema = z.object({
  role: z.enum(USER_ROLES),
  label: z.string().trim().max(80, 'Keep the name under 80 characters').optional(),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((value) => value === '' || z.email().safeParse(value).success, {
      message: 'That does not look like an email address',
    })
    .optional(),
  campaignId: z.uuid().optional(),
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

  if (!(await isDm(user.id))) {
    return NextResponse.json({ error: 'Only the DM can make invites' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = createInviteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That invite is not valid' },
      { status: 400 },
    )
  }

  const { campaignId } = parsed.data

  // A campaign this DM does not run reads as "no such campaign", not as a
  // refusal: a foreign id and a fictional one are indistinguishable from
  // outside, which is the rule the campaign routes already keep.
  if (campaignId && !(await getCampaignForDm(user.id, campaignId))) {
    return NextResponse.json({ error: 'No campaign with that id' }, { status: 404 })
  }

  const invite = await createInvite({
    createdBy: user.id,
    role: parsed.data.role,
    label: parsed.data.label,
    email: parsed.data.email,
    campaignId,
  })

  return NextResponse.json({ invite }, { status: 201 })
}
