import Link from 'next/link'

import { RulesCrib } from '@/components/dm/rules-crib'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getUserRole } from '@/lib/db/roles'

// Reads the session to check the role, so it can't be prerendered — the crib's
// own content is a constant and costs nothing to render.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'The crib',
}

/**
 * The DM's rules crib (`dm-run-suite/dm-rules-crib`).
 *
 * DM-gated the way `/dm` is (D19): a player who follows a link here is told
 * whose screen it is rather than shown a 404, because the *existence* of the
 * DM's tools is no secret at a table of friends. It holds no data at all — the
 * gate is about whose screen this is, not about what it could leak.
 *
 * Its own page rather than a sheet over the tracker: this is seven stops and
 * several screens of rows, and a bottom sheet that tall is a page with the
 * fight hidden behind it. The tracker links here and the back arrow returns —
 * the encounter's state is the server's, so nothing is lost by leaving it.
 */
export default async function DmCribPage() {
  const user = await requireSessionUser()

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <PageHeader title="The crib" backHref="/dm" backLabel="DM" />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not connected to a database yet</CardTitle>
            <CardDescription>
              The crib is behind the DM role, and the role lookup needs <code>DATABASE_URL</code> to
              be set.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const role = await getUserRole(user.id)

  if (role !== 'dm') {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <PageHeader title="The crib" subtitle="Behind the screen." />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This side of the screen is the DM&apos;s</CardTitle>
            <CardDescription>
              You&apos;re signed in as a player. The same rules, in full and in the SRD&apos;s own
              words, are in the{' '}
              <Link href="/rules" className="underline underline-offset-4">
                rules chapters
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-16">
      <PageHeader title="The crib" backHref="/dm" backLabel="DM" />
      <RulesCrib />
    </main>
  )
}
