import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * The app-styled 404 (DND-041). Deliberately load-bearing: an owner-scoped
 * miss — someone else's character id — renders this exact page, so it must
 * stay generic and never hint at whether the id ever existed. What it owes
 * the person reading it is a way back.
 */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>This page is not in the book.</CardTitle>
          <CardDescription>
            Whatever this link pointed at is not here — it may be old, mistyped, or not yours to
            see.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild className="h-11">
            <Link href="/">Reference browser</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/characters">Your characters</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
