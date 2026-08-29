import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LevelUpPlanner } from '@/components/characters/level-up-planner'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { getCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Manage level',
}

/**
 * Level one character up, or back down (DND-032).
 *
 * A page of its own rather than a card on the sheet, deliberately: levelling up
 * happens between sessions with the book open, so it does not have to meet the
 * sheet's one-handed, dim-light bar, and pretending otherwise would cost real
 * work for a screen nobody opens mid-combat.
 *
 * Owner-only the same way the sheet and the edit form are, and not by a check
 * here: `getCharacter` folds the session user into the WHERE clause, so someone
 * else's id renders the same 404 as an id that was never real.
 */
export default async function LevelUpPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Levelling up a character needs <code>DATABASE_URL</code> to be set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="text-sm underline underline-offset-4">
              Back to the reference browser
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const character = await getCharacter(user.id, id)

  if (!character) notFound()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-28">
      <PageHeader
        title={`Manage ${character.name}&rsquo;s level`}
        subtitle="Hit points, spell slots and the size of the spell list all move with the level. Nothing is written until you apply it."
        backHref={`/characters/${character.id}`}
        backLabel="Back to the sheet"
      />

      <LevelUpPlanner character={character} />
    </main>
  )
}
