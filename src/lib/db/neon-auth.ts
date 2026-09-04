// The app's window onto Neon Auth's own tables
// (`user-management/invites-and-roles`; deletion added by
// `triage/account-deletion-from-users-page`).
//
// `neon_auth.user` and its children are created and owned by Neon's managed
// auth service, not by this schema — which is why they live in this file and
// not in `schema.ts`: drizzle-kit reads only `schema.ts` (see
// `drizzle.config.ts`), so a table declared here is something the app can
// *query* and nothing a migration will ever try to create, alter or drop.
// Column names are Better Auth's camelCase ones, verified against production
// on 2026-09-03.
//
// **The app writes here in exactly one place**: the last two statements of
// `deleteUserAccount`, which remove an account the DM has asked to delete. It
// was read-only until then, and the narrowness is the point — accounts are
// Neon's to manage, and the app's own per-user state stays on `user_roles` and
// the tables that reference it. Nothing here is ever inserted or updated.
//
// The `DELETE` that makes that possible is **inherited, not granted**: the
// tables are owned by the `neon_auth` role and `neondb_owner` is a member of
// it. Verified 2026-09-04 —
// `.icm/docs/2026-09-04-account-deletion-privileges.md` § 1, which also has
// why that is a runtime fact rather than a guarantee, and why it is still not
// evidence for the foreign key DND-026 reverted.
//
// Only the columns the app actually reads or filters on are declared.
import { pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const neonAuth = pgSchema('neon_auth')

export const authUsers = neonAuth.table('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
})

/**
 * A live sign-in. Deleting these rows is how the app revokes access, and it is
 * the first statement of a deletion for that reason — see
 * `deleteUserAccount`. `session.userId` references `user.id` `ON DELETE
 * CASCADE`, so this is belt to the last statement's braces, not the only way
 * the rows go.
 */
export const authSessions = neonAuth.table('session', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
})

/** Credentials — one row per provider, holding the password hash for email sign-in. */
export const authAccounts = neonAuth.table('account', {
  id: uuid('id').primaryKey(),
  userId: uuid('userId').notNull(),
})
