import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@neondatabase/auth/react/ui'

import { Button } from '@/components/ui/button'

/**
 * The top bar holds what is not a tab destination: the app's name and the
 * account controls (DND-029). The destinations themselves live in the bottom
 * tab bar, and each page carries its own large title — so this stays
 * deliberately slim, a HIG-style navigation bar rather than a second headline
 * competing with the page. The tab bar is a signed-in surface (D34), but the
 * bar keeps the signed-out sign-in/sign-up entry for the welcome/auth door.
 *
 * It lives here rather than inline in the root layout because `AppShell` is
 * what decides whether the chrome renders at all, and the shared table screen
 * takes it off (`dm-run-suite/table-screen-legibility`). Passing it in as a
 * prop keeps it server-rendered — only the decision is a client concern.
 */
export function SiteHeader() {
  return (
    <header className="bg-background flex items-center justify-between gap-2 px-4 py-3">
      <Link href="/" className="text-base font-semibold sm:text-lg">
        {process.env.NEXT_PUBLIC_APP_NAME || 'D&D 5e Companion'}
      </Link>
      <div className="flex items-center gap-2">
        <SignedOut>
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/sign-up">Sign up</Link>
          </Button>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}
