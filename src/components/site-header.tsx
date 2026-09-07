import Link from 'next/link'

import { AccountButton } from '@/components/account-button'
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
 *
 * Which branch to draw is the root layout's answer rather than `<SignedIn>`'s
 * (`triage/edit-page-hydration-error`). Those two components read Neon Auth's
 * client-side session store, which is pending during a server render and
 * resolved on the client the moment `/api/auth/get-session` answers — so which
 * branch the first client render chose was a race against that request, and
 * when the request won, React found markup it had not rendered and threw the
 * page's whole tree away (React #418, once per load). The layout already reads
 * the session for the DM tab, so the same answer decides this the same way the
 * bottom bar's shape is decided (D16), and both sides render the same markup
 * by construction.
 */
export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="bg-background flex items-center justify-between gap-2 px-4 py-3">
      <Link href="/" className="text-base font-semibold sm:text-lg">
        {process.env.NEXT_PUBLIC_APP_NAME || 'D&D 5e Companion'}
      </Link>
      <div className="flex items-center gap-2">
        {signedIn ? (
          <AccountButton />
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
