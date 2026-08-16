// The table screen's data feed (D24). **Public on purpose** — no session, no
// cookie: the token in the path is the entire credential, 128 unguessable
// bits the DM handed out, and what it buys is only the sanitized view built
// in `getEncounterByShareToken`. Monster HP and monster identity beyond the
// label never cross this boundary — the sanitizing happens in the data layer,
// so this route cannot leak what it never receives.
//
// `no-store`, because the screen polls this every few seconds for live state
// and a cached round counter is worse than none. A dead token 404s; the page
// turns that into "no longer live" rather than an error.
import { NextResponse } from 'next/server'

import { isDatabaseConfigured } from '@/lib/db/client'
import { getEncounterByShareToken } from '@/lib/db/encounters'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ token: string }> }

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(_request: Request, { params }: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'The database is not connected. If you run this app, see the database runbook in the repo docs.',
      },
      { status: 503, headers: NO_STORE },
    )
  }

  const { token } = await params
  const view = await getEncounterByShareToken(token)

  return view
    ? NextResponse.json(view, { headers: NO_STORE })
    : NextResponse.json(
        { error: 'This table screen is no longer live' },
        { status: 404, headers: NO_STORE },
      )
}
