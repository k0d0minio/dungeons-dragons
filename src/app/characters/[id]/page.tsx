import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SharedNotesCard } from '@/components/campaigns/shared-notes-card'
import { CharacterSheet } from '@/components/characters/sheet/character-sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { formatReferenceIndex } from '@/lib/characters/display'
import { getCharacter } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listItems } from '@/lib/db/items'
import { getCharacterNotes, listSharedNotesForCharacter } from '@/lib/db/notes'

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
export default async function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Character sheets need <code>DATABASE_URL</code> to be set. If you run this app, see
              the database runbook in the repo docs.
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

  // The inventory rides down with the first paint (DND-035); mutations go
  // through `/api/characters/[id]/items` client-side from the sheet.
  const items = await listItems(user.id, id)

  // This page is reachable by the DND-027 viewer predicate, which is wider than
  // the owner: a DM may open a party member's sheet (D13). Both note surfaces
  // are owner-only (DND-058), so ownership is asked here explicitly rather than
  // inferred from having got this far. The data layer refuses a non-owner too —
  // this just keeps a DM from being shown an editable card that would 404.
  const isOwner = character.ownerId === user.id

  const [privateNotes, sharedNotes] = isOwner
    ? await Promise.all([getCharacterNotes(user.id, id), listSharedNotesForCharacter(user.id, id)])
    : ['', []]

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
            score is noticed while looking at it, not from the list. Levelling
            up sits beside it as a link rather than a card on the sheet: it is
            a between-sessions job, so it gets its own page (DND-032). */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href={`/characters/${character.id}/edit`}>Edit</Link>
          </Button>
          <Link
            href={`/characters/${character.id}/level`}
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
          >
            Manage level
          </Link>
        </div>
      </div>

      <CharacterSheet
        character={character}
        items={items ?? []}
        notes={isOwner ? privateNotes : null}
      />

      {/* The party's shared notes, at the foot of the sheet — the whole player
          read surface for DND-058, and the reason players need no campaign
          screen of their own. Renders nothing when the DM has shared nothing. */}
      <div className="mt-4">
        <SharedNotesCard notes={sharedNotes} />
      </div>
    </main>
  )
}
