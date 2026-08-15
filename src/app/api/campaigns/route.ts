// Create a campaign (DND-046). DM-only: the global role (D19) gates campaign
// creation, which is what it exists to gate. 401 without a session, 403 for a
// player — a role is not a secret the way a row is, and "you are not the DM"
// is the honest answer here, unlike the 404s the data routes give.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
import { createCampaign } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'

export const dynamic = 'force-dynamic'

const createCampaignSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the campaign a name')
    .max(120, 'Keep the name under 120 characters'),
})

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
      { status: 503 },
    )
  }

  if (!(await isDm(user.id))) {
    return NextResponse.json({ error: 'Only the DM can create campaigns' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const parsed = createCampaignSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'That campaign is not valid' },
      { status: 400 },
    )
  }

  const campaign = await createCampaign(user.id, parsed.data.name)

  return NextResponse.json({ campaign }, { status: 201 })
}
