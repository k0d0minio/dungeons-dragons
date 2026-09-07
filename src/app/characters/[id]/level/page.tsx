import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LevelUpPlanner } from '@/components/characters/level-up-planner'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { gatesForCharacter } from '@/lib/db/campaigns'
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
 * Viewer-scoped the same way the sheet and the edit form are, and not by a
 * check here: `getCharacter` folds the session user into the WHERE clause — the
 * owner, or the DM of a campaign the character is on (D13) — so anyone else's
 * id renders the same 404 as an id that was never real.
 *
 * The DM arm is intended, not an accident of reusing the predicate: D13 has the
 * DM editing every character at their table, a level is the edit most likely to
 * be made with the DM standing over the phone, and `POST
 * /api/characters/[id]/level` applies it under the same predicate. Nothing on
 * this page is owner-only.
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
            <Link href="/library" className="text-sm underline underline-offset-4">
              Back to the reference browser
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const character = await getCharacter(user.id, id)

  if (!character) notFound()

  // The preparation gate (D40), for the one sentence on this page that would
  // otherwise send a cleric to the sheet to choose spells their table is not
  // choosing yet. Everything else here is the character's own record and is
  // never gated — a level is a level whatever surface the campaign has on.
  const gates = await gatesForCharacter(user.id, id)

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-28">
      <PageHeader
        title={`Manage ${character.name}’s level`}
        subtitle="Hit points, spell slots and the size of the spell list all move with the level. Nothing is written until you apply it."
        backHref={`/characters/${character.id}`}
        backLabel="Back to the sheet"
      />

      <LevelUpPlanner character={character} spellPreparation={gates.spellPreparation} />
    </main>
  )
}
