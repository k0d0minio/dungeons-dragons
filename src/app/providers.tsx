'use client'

import { NeonAuthUIProvider } from '@neondatabase/auth/react/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { authClient } from '@/lib/auth/client'

/**
 * Neon Auth UI context. Everything that renders `<AuthView>`, `<UserButton>`,
 * `<SignedIn>` or `<SignedOut>` has to sit inside this.
 *
 * Email + password only for now — social sign-in needs an OAuth provider
 * configured in the Neon Console first, and a button that always errors is
 * worse than no button.
 */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()

  return (
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
  )
}
