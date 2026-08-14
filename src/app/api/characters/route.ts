// Character data is per-user, so this route is session-gated. It answers 401
// rather than redirecting, which is why `/api/characters` is left out of the
// proxy matcher.
//
// Creation lands with the form in DND-008; this is read-only for now.
import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/server'
import { listCharacters } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Say so rather than answering with an empty list — "you have no characters"
  // and "the database isn't wired up yet" are very different answers, and only
  // one of them should be quiet.
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured. See .icm/docs/neon-database-setup.md' },
      { status: 503 }
    )
  }

  return NextResponse.json({ characters: await listCharacters(user.id) })
}
