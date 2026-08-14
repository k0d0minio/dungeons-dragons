// The Neon connection, built lazily.
//
// Same shape as `src/lib/auth/server.ts` and for the same reason: `DATABASE_URL`
// is provisioned by a human (Jamie, via the Neon–Vercel integration), and until
// it lands the app still has to build and still has to serve the public
// reference browser. Nothing here touches the network at module load, so
// importing this file is free — the first query is what needs the env var.
import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import * as schema from './schema'

export type Database = NeonHttpDatabase<typeof schema>

let instance: Database | undefined

/** True when `DATABASE_URL` is present, so queries can actually run. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * The Drizzle client. Throws a pointed error rather than a driver-level one when
 * `DATABASE_URL` is missing — callers that can degrade gracefully should check
 * {@link isDatabaseConfigured} first.
 *
 * Uses the HTTP driver: v1 issues one independent statement per request, which
 * is exactly what `neon-http` is for. Move to the WebSocket driver only if a
 * feature needs a multi-statement transaction.
 */
export function getDb(): Database {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Provision the Neon database (Vercel → Neon integration) ' +
          'and set DATABASE_URL in Vercel project settings, or in .env.local for local dev.'
      )
    }

    instance = drizzle(neon(connectionString), { schema })
  }

  return instance
}
