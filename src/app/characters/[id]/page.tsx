import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SharedNotesCard } from '@/components/campaigns/shared-notes-card'
import { YourCampaignCard } from '@/components/campaigns/your-campaign-card'
import { CharacterSheet } from '@/components/characters/sheet/character-sheet'
import { WelcomeBand } from '@/components/characters/sheet/welcome-band'
import { PageHeader } from '@/components/navigation/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { formatReferenceIndex } from '@/lib/characters/display'
import { gatesForCharacter, listCampaignsForCharacter } from '@/lib/db/campaigns'
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

  // The inventory rides down with the first paint (DND-035); mutations go
  // through `/api/characters/[id]/items` client-side from the sheet.
  //
  // The gates ride with it (D40, `dm-prep-suite/campaign-feature-gates`): how
  // much of the sheet this character's table has switched on. Read for every
  // viewer, not only the owner, so a DM opening a party member's sheet sees
  // the screen that player is looking at. A character on no campaign — and any
  // read that comes back with nothing — resolves to everything on.
  const [items, gates] = await Promise.all([listItems(user.id, id), gatesForCharacter(user.id, id)])

  // This page is reachable by the DND-027 viewer predicate, which is wider than
  // the owner: a DM may open a party member's sheet (D13). Both note surfaces
  // are owner-only (DND-058), so ownership is asked here explicitly rather than
  // inferred from having got this far. The data layer refuses a non-owner too —
  // this just keeps a DM from being shown an editable card that would 404.
  const isOwner = character.ownerId === user.id

  // The campaign link rides the same owner-only condition as the notes, and
  // for a related reason: `listCampaignsForCharacter` would return nothing for
  // a DM anyway, and not asking is cheaper than asking and being told so.
  const [privateNotes, sharedNotes, campaigns] = isOwner
    ? await Promise.all([
        getCharacterNotes(user.id, id),
        listSharedNotesForCharacter(user.id, id),
        listCampaignsForCharacter(user.id, id),
      ])
    : ['', [], []]

  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-16">
      <PageHeader
        title={character.name}
        subtitle={`Level ${character.level} ${formatReferenceIndex(character.speciesIndex)} ${formatReferenceIndex(character.classIndex)}`}
        backHref="/characters"
        backLabel="Your characters"
        actions={
          // Editing is reachable from the sheet itself (DND-018) — a mistyped
          // score is noticed while looking at it, not from the list. Levelling
          // up sits beside it as a link rather than a card on the sheet: it is
          // a between-sessions job, so it gets its own page (DND-032).
          <>
            <Button asChild variant="outline" className="h-11">
              <Link href={`/characters/${character.id}/edit`}>Edit</Link>
            </Button>
            <Link
              href={`/characters/${character.id}/level`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Manage level
            </Link>
          </>
        }
      />

      {/* The moment the wizard makes but does not mark
          (`triage/creation-completion-learn-link`): one band, on the first
          opening of a character that was just made, offering `/learn`. Owner
          only, like the notes below — a DM opening a party member's sheet did
          not make them, and the band would be greeting the wrong person. It
          renders nothing whenever it was not handed a note by the wizard,
          which is almost always. */}
      {isOwner ? <WelcomeBand characterId={character.id} name={character.name} /> : null}

      <CharacterSheet
        character={character}
        items={items ?? []}
        notes={isOwner ? privateNotes : null}
        gates={gates}
      />

      {/* Everything campaign-shaped, at the foot of the sheet. The shared notes
          are DND-058's player read surface; the campaign link is
          `dm-run-suite/player-campaign-view`'s only entrance, deliberately here
          rather than in a tab (Jamie chose character-first). Both render
          nothing when there is nothing to show. */}
      <div className="mt-4 space-y-4">
        <YourCampaignCard campaigns={campaigns} />
        <SharedNotesCard notes={sharedNotes} />
      </div>
    </main>
  )
}
