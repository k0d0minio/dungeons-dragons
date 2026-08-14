// Character data is per-user, so this route is session-gated. It answers 401
// rather than redirecting, which is why `/api/characters` is left out of the
// proxy matcher.
//
// The list is empty until DND-007 (Neon + Drizzle) provides the `characters`
// table and DND-008 provides creation. The session gate is the point.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ characters: [], ownerId: user.id })
}
