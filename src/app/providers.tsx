'use client'

import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui'
import { ThemeProvider } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { authClient } from '@/lib/auth/client'

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
        redirectTo="/characters"
        Link={Link}
      >
        {children}
      </NeonAuthUIProvider>
    </ThemeProvider>
  )
}
