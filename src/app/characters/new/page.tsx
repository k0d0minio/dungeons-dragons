import Link from 'next/link'

import { CharacterForm } from '@/components/characters/character-form'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'New character',
}

export default async function NewCharacterPage() {
  await requireSessionUser()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="New character"
        subtitle="For a build you have already made. Fill in what your sheet says."
        backHref="/characters"
        backLabel="Your characters"
      />

      {isDatabaseConfigured() ? (
        <CharacterForm />
      ) : (
        // A form that cannot save is worse than no form: it takes ten minutes of
        // typing and then loses it.
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Character creation needs <code>DATABASE_URL</code> to be set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="text-sm underline underline-offset-4">
              Back to the reference browser
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
