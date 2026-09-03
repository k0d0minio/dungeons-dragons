// Mint an invite link (`user-management/invites-and-roles`). DM-only by the
// global role (D19): a player gets an honest 403, as on campaign creation —
// the role is not a secret the way a row is.
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSessionUser } from '@/lib/auth/server'
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

  const invite = await createInvite({
    createdBy: user.id,
    role: parsed.data.role,
    label: parsed.data.label,
    email: parsed.data.email,
  })

  return NextResponse.json({ invite }, { status: 201 })
}
