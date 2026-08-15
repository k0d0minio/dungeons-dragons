import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DM',
}

/**
 * The DM surface's home (DND-029, register decision D16).
 *
 * Deliberately near-empty. The tab exists now because the bar it sits in is
 * being built once: DND-030 (party glance) and DND-031 (encounters) each need
 * somewhere to mount, and adding a third destination later would move every
 * other one under a thumb that has learned where they are.
 *
 * Signed-in only — `src/proxy.ts` covers `/dm`, and this call is the same
 * belt-and-braces check the character routes make.
 */
export default async function DmHomePage() {
  await requireSessionUser()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">DM</h2>
        <p className="text-muted-foreground text-sm">
          Behind the screen. Nothing lives here yet — this is the home the DM tools are being
          built into.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Party at a glance</CardTitle>
          <CardDescription>
            Every character in a campaign you run on one screen — HP, AC, conditions and passive
            Perception, without opening six sheets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not built yet (DND-030).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encounters and initiative</CardTitle>
          <CardDescription>
            An encounter you can step through by round, with each monster instance holding its own
            hit points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not built yet (DND-031).</p>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Until then, monsters are in the{' '}
        <Link href="/" className="underline underline-offset-4">
          reference browser
        </Link>{' '}
        and the party&apos;s characters are on{' '}
        <Link href="/characters" className="underline underline-offset-4">
          your characters
        </Link>
        .
      </p>
    </main>
  )
}
