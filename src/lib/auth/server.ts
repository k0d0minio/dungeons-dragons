import { createNeonAuth, type NeonAuth } from '@neondatabase/auth/next/server'
import { redirect } from 'next/navigation'

/** Where unauthenticated visitors are sent. Must stay a route that exists. */
export const SIGN_IN_PATH = '/auth/sign-in'

/**
 * Neon Auth server instance (Managed Better Auth).
 *
 * Built lazily on first use rather than at module load, because `createNeonAuth`
 * throws when `NEON_AUTH_COOKIE_SECRET` is missing or shorter than 32 characters.
 * A module-level call would fail the production build on any deploy where Neon
 * Auth has not been enabled yet — this way the app builds fine and starts
 * authenticating the moment the env vars land.
 */
let instance: NeonAuth | undefined

/** True when both Neon Auth env vars are present, so auth can actually run. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET)
}

export function getAuth(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL
    const secret = process.env.NEON_AUTH_COOKIE_SECRET

    if (!baseUrl || !secret) {
      throw new Error(
        'Neon Auth is not configured. Enable Neon Auth on the project database and set ' +
          'NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (32+ characters).'
      )
    }

    instance = createNeonAuth({ baseUrl, cookies: { secret } })
  }

  return instance
}

/**
 * The signed-in user, or `null`. Safe to call from server components, server
 * actions and route handlers. Returns `null` rather than throwing when Neon Auth
 * is unconfigured, so public reference pages keep rendering.
 */
export async function getSessionUser() {
  if (!isAuthConfigured()) return null

  const { data: session } = await getAuth().getSession()
  return session?.user ?? null
}

/**
 * The signed-in user, or a redirect to sign-in. For server components behind a
 * protected route; pair it with `export const dynamic = 'force-dynamic'`.
 */
export async function requireSessionUser() {
  const user = await getSessionUser()
  if (!user) redirect(SIGN_IN_PATH)
  return user
}
