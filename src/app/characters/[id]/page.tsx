import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CharacterSheet } from '@/components/characters/sheet/character-sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { formatReferenceIndex } from '@/lib/characters/display'
import { getCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Character sheet',
}

/**
 * The combat-core sheet for one character (DND-009).
 *
 * Owner-only, and not by a check on this page: `getCharacter` folds the session
 * user into the WHERE clause, so someone else's id is a miss and renders the
 * same 404 as an id that was never real. Nothing about the character leaks,
 * including whether it exists.
 */
export default async function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Character sheets need <code>DATABASE_URL</code>. The runbook is{' '}
              <code>.icm/docs/neon-database-setup.md</code>.
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
    <main className="mx-auto w-full max-w-2xl p-4 pb-16">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/characters"
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
          >
            ← Your characters
          </Link>
          <h2 className="text-2xl font-bold">{character.name}</h2>
          <p className="text-muted-foreground text-sm">
            Level {character.level} {formatReferenceIndex(character.speciesIndex)}{' '}
            {formatReferenceIndex(character.classIndex)}
          </p>
        </div>

        {/* Editing is reachable from the sheet itself (DND-018) — a mistyped
            score is noticed while looking at it, not from the list. */}
        <Button asChild variant="outline" className="h-11 shrink-0">
          <Link href={`/characters/${character.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <CharacterSheet character={character} />
    </main>
  )
}
