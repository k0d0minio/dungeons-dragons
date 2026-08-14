// drizzle-kit configuration (DND-007).
//
// `DATABASE_URL` comes from the environment and nowhere else — Vercel project
// settings for preview/production, `.env.local` for local dev. No connection
// string is ever committed; `.gitignore` covers `.env*`.
//
// drizzle-kit loads `.env` on its own but not `.env.local`, which is the file
// Next.js (and the Neon Auth runbook) tells you to use, hence the explicit
// loads below. dotenv does not overwrite variables that are already set, so
// real environment variables win over both files.
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

loadEnv({ path: '.env.local', quiet: true })
loadEnv({ path: '.env', quiet: true })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  // Absent until the database is provisioned. `generate` does not need it — only
  // `migrate`/`studio` do, and those fail with drizzle-kit's own error if it is
  // still missing by then.
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
})
