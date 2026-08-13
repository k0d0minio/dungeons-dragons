'use client'

import { createAuthClient } from '@neondatabase/auth/next'

/**
 * Neon Auth browser client. Talks to the app's own `/api/auth/*` proxy, which
 * forwards to Neon Auth — so no Neon Auth URL or key is ever exposed to the
 * browser. Use `authClient.useSession()` in client components.
 */
export const authClient = createAuthClient()
