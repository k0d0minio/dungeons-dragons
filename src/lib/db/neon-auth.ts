// A read-only view of Neon Auth's own user table
// (`user-management/invites-and-roles`).
//
// `neon_auth.user` is created and owned by Neon's managed auth service, not by
// this schema — which is why it lives in this file and not in `schema.ts`:
// drizzle-kit reads only `schema.ts` (see `drizzle.config.ts`), so a table
// declared here is something the app can *query* and nothing a migration will
// ever try to create, alter or drop. Column names are Better Auth's camelCase
// ones, verified against production on 2026-09-03; the app's role can SELECT
// from it (the DND-047 seed migration relied on the same grant, defensively).
//
// Only the columns the DM's user list needs are declared. Nothing here is
// written to, ever: accounts are Neon's to manage, and the app's own
// per-user state stays on `user_roles` and the tables that reference it.
import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const neonAuth = pgSchema('neon_auth')

export const authUsers = neonAuth.table('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
})
