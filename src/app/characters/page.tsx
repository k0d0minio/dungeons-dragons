import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Characters',
}

export default async function CharactersPage() {
  const user = await requireSessionUser()

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-bold">Your characters</h2>
        <p className="text-muted-foreground text-sm">
          Signed in as {user.name || user.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nothing here yet</CardTitle>
          <CardDescription>
            Character creation lands in DND-008 and the sheet in DND-009. This page exists now so
            the protected route, and the sign-in redirect that leads to it, are real.
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
