# Stub: Delete an account from the users page

- lane: chore
- found-by: user-management/invites-and-roles, 2026-09-03
- priority: P2
- size: M
- sources: `.icm/docs/neon-auth-setup.md` § Cleaning up the probe account;
  `src/lib/db/schema.ts` (the foreign-key policy at the campaigns section)

`/dm/users` lists every account and sets its role, but cannot remove one. The
runbook still describes deletion as SQL by hand — characters first, then the
`neon_auth.session` / `neon_auth.account` / `neon_auth.user` rows — because no
`*_user_id` column has a foreign key into `neon_auth.user` and nothing cascades.
DND-044 called this an Article 17 problem; the users page is now the obvious
place for the button, and the probe account from DND-016 is still the obvious
first thing to delete with it.

Before building: decide the order of deletes on `neon-http` (no transactions —
which partial state is the benign one), and whether Neon's managed auth exposes
a delete-user call the app may make, or whether the app deletes the
`neon_auth` rows itself (check `has_table_privilege(current_user,
'neon_auth."user"', 'DELETE')` first).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/account-deletion-from-users-page.md`. Add a delete control
to the row on `/dm/users` (never on the DM's own row), behind an alert dialog,
that removes the user's characters, memberships, notes, roles and invites, then
the `neon_auth` rows — in an order that fails benignly on `neon-http`. Produce
the evidence on what the app's role may delete before writing the route. PR on
a `claude/` branch; CI green only.
