import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CharacterForm } from '@/components/characters/character-form'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { gatesForCharacter } from '@/lib/db/campaigns'
import { getCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Edit character',
}

/**
 * Edit one character (DND-018).
 *
 * Viewer-scoped the same way the sheet is, and not by a check on this page:
 * `getCharacter` folds the session user into the WHERE clause — the owner, or
 * the DM of a campaign the character is on (D13) — so anyone else's id
 * renders the same 404 as an id that was never real.
 *
 * The Delete card that used to sit under the form is gone
 * (`first-table/retire-a-character`): only the DM retires a character, from
 * the profile page, and the player's front door is then the wizard again.
 */
export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Editing a character needs <code>DATABASE_URL</code> to be set.
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

  // The gates ride with the form for the one field they reach
  // (`first-table/weapon-mastery-gate`): the Weapon mastery picker is drawn
  // only for a table that has switched mastery on. Viewer-scoped like the
  // sheet's read, so a DM editing a party member's build sees the same form.
  const gates = await gatesForCharacter(user.id, id)

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 pb-28">
      <PageHeader
        title={`Edit ${character.name}`}
        subtitle="Fix a mistyped score, change a class, or set a new level. Hit points, conditions and spell slots are tracked on the sheet itself."
        backHref={`/characters/${character.id}`}
        backLabel="Back to the sheet"
      />

      <CharacterForm character={character} weaponMastery={gates.weaponMastery} />
    </main>
  )
}
