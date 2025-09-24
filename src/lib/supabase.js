import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

export function createBrowserClient() {
  assertEnv('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl)
  assertEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey)
  return createClient(supabaseUrl, supabaseAnonKey)
}

export function createServerClient() {
  assertEnv('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl)
  const key = supabaseServiceRoleKey || supabaseAnonKey
  assertEnv(
    supabaseServiceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    key
  )
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'X-Client-Info': 'dnd-5e-companion' },
    },
  })
}

// Optional singleton for client-side usage
let browserClientSingleton
export function getSupabaseClient() {
  if (typeof window === 'undefined') return null
  if (!browserClientSingleton) {
    browserClientSingleton = createBrowserClient()
  }
  return browserClientSingleton
}

