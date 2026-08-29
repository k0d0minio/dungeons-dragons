import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CharacterForm } from '@/components/characters/character-form'
import { DeleteCharacterCard } from '@/components/characters/delete-character-card'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { getCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Edit character',
}

/**
 * Edit or delete one character (DND-018).
 *
 * Owner-only the same way the sheet is, and not by a check on this page:
 * `getCharacter` folds the session user into the WHERE clause, so someone
 * else's id renders the same 404 as an id that was never real — this page
 * cannot confirm that another player's character exists, let alone open it.
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
        title={`Edit ${character.name}`}
        subtitle="Fix a mistyped score, change a class, or set a new level. Hit points, conditions and spell slots are tracked on the sheet itself."
        backHref={`/characters/${character.id}`}
        backLabel="Back to the sheet"
      />

      <CharacterForm character={character} />

      {/* Below the form, and below the fixed save bar's worth of padding the
          form already leaves, so deleting is never the thing under your thumb
          when you meant to save. */}
      <DeleteCharacterCard id={character.id} name={character.name} />
    </main>
  )
}
