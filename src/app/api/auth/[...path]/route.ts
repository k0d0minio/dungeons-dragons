// Neon Auth API proxy. Every sign-up / sign-in / sign-out / session call the
// browser makes goes through here, so the Neon Auth base URL and cookie secret
// stay server-side.
import { getAuth } from '@/lib/auth/server'

type Context = { params: Promise<{ path: string[] }> }

let handlers: ReturnType<ReturnType<typeof getAuth>['handler']> | undefined

// Built on first request, not at module load, so a deploy without the Neon Auth
// env vars still builds — see `getAuth`.
function neonAuthHandlers() {
  return (handlers ??= getAuth().handler())
}

export async function GET(request: Request, context: Context) {
  return neonAuthHandlers().GET(request, context)
}

export async function POST(request: Request, context: Context) {
  return neonAuthHandlers().POST(request, context)
}
