'use client'

import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui'
import { ThemeProvider } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { authClient } from '@/lib/auth/client'
import { DEFAULT_SIGNED_IN_PATH } from '@/lib/auth/return-to'

/**
 * App-wide client context.
 *
 * `ThemeProvider` is what actually puts `.dark` on `<html>` — without it the
 * `dark:` variants across the app and the `.dark` block in `globals.css` are
 * dead code, and the app renders pure white at a table in dim light (DND-019).
 * `attribute="class"` is required: `globals.css` gates the variant on a class
 * (`@custom-variant dark (&:is(.dark *))`), not on `prefers-color-scheme`.
 *
 * It follows the system and offers no toggle. The phone already has a
 * dark-mode switch that the whole table knows how to find, and a toggle would
 * want header real estate that DND-029 is about to rebuild. `next-themes`
 * still persists a `theme` key, so adding an explicit override later is a
 * change to this file only.
 *
 * Neon Auth UI context sits inside it: everything that renders `<AuthView>`,
 * `<UserButton>`, `<SignedIn>` or `<SignedOut>` has to be under that provider.
 *
 * `Toaster` is mounted here rather than on a page because it is the app's only
 * message channel that does not depend on where the page is scrolled — the
 * character sheet's controls run past a phone screen twice over, and a save
 * that failed on a tap 1000px down has to say so where the thumb is (DND-023).
 * It sits under `ThemeProvider` because `src/components/ui/sonner.tsx` reads
 * `useTheme`, and outside `NeonAuthUIProvider` because nothing it renders needs
 * a session.
 *
 * Email + password only for now — social sign-in needs an OAuth provider
 * configured in the Neon Console first, and a button that always errors is
 * worse than no button.
 */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // The sheet is read mid-combat; a colour crossfade on every element when
      // the phone crosses into night mode is noise, not polish.
      disableTransitionOnChange
    >
      <NeonAuthUIProvider
        authClient={authClient}
        navigate={router.push}
        replace={router.replace}
        onSessionChange={() => router.refresh()}
        // The fallback only. A visitor the wall turned away carries their
        // destination on the sign-in URL, and `src/app/auth/[path]/page.tsx`
        // passes that to `AuthView` as an explicit prop, which wins over this
        // (`triage/sign-in-return-destination`).
        redirectTo={DEFAULT_SIGNED_IN_PATH}
        Link={Link}
      >
        {children}
      </NeonAuthUIProvider>

      {/* Top of the viewport, not the bottom: the sheet's tap targets — pips,
          chips, damage buttons — live in the lower half of the screen, and a
          message that covers the control you just pressed is its own bug. */}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  )
}
