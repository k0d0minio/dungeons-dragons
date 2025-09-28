import { createBrowserClient, createServerClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Create client with Clerk JWT token for server-side operations
export function createClientWithJWT(jwtToken: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: () => '',
        set: () => {},
        remove: () => {},
      },
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`
        }
      }
    }
  )
}
