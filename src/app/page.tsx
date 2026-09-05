import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { getSessionUser } from '@/lib/auth/server'
import { listCharacters } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'
import { isDm } from '@/lib/db/roles'

// Reads the session and the player's characters, so it can't be prerendered.
export const dynamic = 'force-dynamic'

/**
 * The front door (D33). Signed-in players land on *their* character — their
 * sheet when one exists, creation when they have none, the list when they have
 * several — and a signed-out visitor gets a welcome screen with invite sign-in.
 *
 * The DM lands behind the screen (`first-table/dm-front-door`): `/dm`, never
 * the wizard. Until this, the one `dm` account was the one the app pushed
 * into character creation, because he has no character and the door was
 * character-first. The role is global (D19), read once per request.
 *
 * This stays at `/` forever (D34): installed PWAs hold `start_url: '/'` and iOS
 * never re-reads the manifest, so the redirect/welcome can never move.
 */
export default async function Home() {
  const user = await getSessionUser()

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="items-center">
            <BookOpen className="text-gold mx-auto h-8 w-8" aria-hidden="true" />
            <h1 className="text-2xl font-serif font-bold">D&amp;D 5e Companion</h1>
            <CardDescription>
              The thing on the table next to the dice — reference lookup and living character sheets
              for one D&amp;D table.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="h-11 w-full">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full">
              <Link href="/auth/sign-up">Request an invite</Link>
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              This is a private app for one table. If you play at it, ask Jamie for an invite.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // Reading the flag before querying keeps an unprovisioned deploy on the
  // characters list, which explains the missing database instead of bouncing
  // the player into a character creator.
  const databaseReady = isDatabaseConfigured()

  // No database means no role to read, and the same "not connected" card the
  // characters list shows is the right answer for everyone.
  if (databaseReady && (await isDm(user.id))) redirect('/dm')

  const characters = databaseReady ? await listCharacters(user.id) : []

  if (characters.length === 1) redirect(`/characters/${characters[0].id}`)
  if (characters.length === 0 && databaseReady) redirect('/characters/new')
  redirect('/characters')
}
