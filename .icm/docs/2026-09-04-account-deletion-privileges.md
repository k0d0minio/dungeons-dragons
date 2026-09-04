# What the app's role may delete — evidence for account deletion

> Read-only audit run 2026-09-04 against the production Neon project
> `lucky-violet-44451912` (branch `main`, database `neondb`, PostgreSQL 17.11), before
> writing the delete route asked for by
> `.icm/intake/triage/account-deletion-from-users-page.md`. Every statement below is a
> `SELECT`; nothing was deleted in the making of it. No connection string was read or
> written — the queries went through the Neon API.

The stub asked three questions before any code: **may the app delete the `neon_auth`
rows itself**, **does Neon's managed auth expose a delete-user call the app may make
instead**, and **what order fails benignly on `neon-http`**. The answers are yes, no, and
the one in the last section.

## 1. The app connects as `neondb_owner`, and it may delete every `neon_auth` table

```sql
select current_user;                    -- neondb_owner
```

`neondb_owner` is the only non-system login role on the project (`cloud_admin`,
`neon_service` and `neon_auth` are Neon's), so it is the role behind `DATABASE_URL`.

```sql
select c.relname,
       pg_catalog.pg_get_userbyid(c.relowner) as owner,
       has_table_privilege(current_user, c.oid, 'DELETE') as del
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'neon_auth' and c.relkind = 'r';
```

| table | owner | SELECT | INSERT | UPDATE | DELETE | REFERENCES |
| --- | --- | --- | --- | --- | --- | --- |
| `user`, `session`, `account`, `verification`, `jwks`, `organization`, `member`, `invitation`, `project_config` | `neon_auth` | ✅ | ✅ | ✅ | ✅ | ✅ |

**The `DELETE` the stub asked about is there.** So, incidentally, is the `REFERENCES`
that `drizzle/0001_campaigns.sql` failed for want of — but see the caveat below before
reading that as a green light for a foreign key.

### Where the privilege comes from, and why that is a caveat

It is **not a direct grant**. The only grantee on `neon_auth."user"` is the table's owner:

```sql
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'neon_auth' and table_name = 'user';
-- neon_auth: SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
```

`neondb_owner` reaches it by **membership**: it is a member of the `neon_auth` role and
`rolinherit` is true, so the privilege arrives inherited.

```sql
select rolinherit, pg_has_role('neondb_owner','neon_auth','USAGE') from pg_roles
where rolname = 'neondb_owner';           -- t, t
```

That membership is Neon's arrangement, not ours, and Neon could change it in a service
update without touching this repo. **Treat the grant as a runtime fact, not a
guarantee**: the failure mode is a `42501 permission denied for table user` at the last
step of the delete, which is exactly why that step is last (§4). It is also why this
audit is *not* evidence for adding the `ON DELETE CASCADE` foreign key DND-026 reverted
— a constraint outlives the membership that let you create it, and would then fail
closed on every sign-up. The cascade stays reverted; deletion stays the app's own
statements.

## 2. `neon_auth` already cascades within itself

```sql
select conname, pg_get_constraintdef(oid) from pg_constraint
where contype = 'f' and connamespace = 'neon_auth'::regnamespace;
```

`account.userId`, `session.userId`, `member.userId` and `invitation.inviterId` all
reference `neon_auth."user"(id)` `ON DELETE CASCADE`. So the runbook's three-step
"`session`, then `account`, then `user`" is really one step wearing three hats — deleting
the `user` row takes the rest with it. The route still deletes `session` and `account`
explicitly, for the reasons in §4; the cascade is the backstop under them, not the plan.

`neon_auth."user".id` is `uuid`. Every `*_user_id` column in `public` is `text`, which is
why `listUsers` casts, and why the delete validates the id is uuid-shaped before it goes
near a `neon_auth` table — a malformed id would otherwise be a `22P02` error, not a miss.

## 3. Neon's managed auth exposes no delete-user call this app may make

`@neondatabase/auth@0.5.0-beta` has two, and neither fits:

- **`deleteUser` (`POST delete-user`)** is Better Auth's *self-service* delete: it acts
  on the caller's own session. The DM deleting someone else is not what it does, and the
  one row the DM cannot delete here is their own.
- **`admin.removeUser` (`POST admin/remove-user`)** is the admin plugin, and it gates on
  the caller's `neon_auth.user.role`. On production **every account carries
  `role = 'user'`** — Jamie's included; nobody is `admin`:

  ```sql
  select role, count(*) from neon_auth."user" group by role;   -- user | 6
  ```

  This app's roles live in `public.user_roles` (D19) and have nothing to do with that
  column, and `src/lib/db/neon-auth.ts` writes nothing to `neon_auth.user`. So the call
  would answer 403 for every caller this app can produce, and reaching for it would mean
  first writing an `admin` role into a table Neon owns.

**So the app deletes the rows itself**, with the grant from §1.

## 4. What a user owns, and the order that fails benignly

`neon-http` runs one statement per HTTP request and has no transactions
(`src/lib/db/client.ts`), so a delete of N statements has N+1 possible outcomes and the
question is which partial states are survivable. Every column in `public` that holds a
`neon_auth.user.id`:

```sql
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and (column_name like '%user_id%' or column_name in ('owner_id','created_by'));
```

| column | what it is | in the delete? |
| --- | --- | --- |
| `characters.owner_id` | their characters — cascades to `character_items`, `character_notes`, `character_campaigns`, `encounter_combatants` | yes |
| `campaign_members.user_id` | their seat at a table | yes |
| `user_roles.user_id` | their global role | yes |
| `user_invites.created_by` | links they minted | yes |
| `user_invites.claimed_by_user_id` | the link that admitted them | yes |
| `campaigns.dm_user_id` | **a campaign they run** | **no — it refuses** |

`campaigns.dm_user_id` is the only thing that says who runs a campaign, it is `NOT NULL`,
and DND-027's viewer predicate is an equality against it. Deleting its user would leave a
campaign nobody can see and nobody can delete, with the party's notes, handouts, NPCs and
encounters inside it. **So the route refuses (409) to delete an account that runs a
campaign** and says to delete or hand over the campaign first. On production only Jamie
runs one, and his own row never has the button.

### The order

1. `neon_auth.session` — **revoke access first.** Until this runs, the person being
   deleted can still be signed in on a phone and still `POST /api/characters`, which
   would land a new character *after* step 5 and orphan it. With their sessions gone,
   `getSessionUser()` returns null and every write route answers 401.
2. `user_invites` (`created_by` or `claimed_by_user_id`)
3. `user_roles`
4. `campaign_members`
5. `characters` (the cascade above goes with it)
6. `neon_auth.account` — the password row
7. `neon_auth.user` — last

**Why this order is the benign one.** Every prefix of it leaves the account *still
listed on `/dm/users`*, with its counts reduced, and pressing Delete again resumes where
the failure stopped — each statement is idempotent, so a re-run costs nothing. The DM can
always see the unfinished job and always has the control that finishes it.

The reverse order is the one that cannot be recovered from a screen. Delete
`neon_auth.user` first and a failure anywhere after it leaves characters, memberships and
invite rows keyed to a user id that no longer exists: invisible to `/dm/users` (which
reads `neon_auth.user`), unreachable by their owner (who can no longer sign in), and
removable only by hand-written SQL — which is the exact state this ticket exists to
retire. That is the malignant partial state, and putting the auth rows last is what
avoids it.

The cost of the chosen order, stated plainly: a failure between steps 1 and 7 leaves a
signed-out account with nothing in it that can still be signed into (until step 6) or is
dead but present (after it). Both are visible, both are one tap from finished, and
neither loses data that was not already going.

## Appendix — the rows as they stood on 2026-09-04

Six accounts. Aggregated deliberately: the addresses of Jamie's players are not audit
material.

| | accounts |
| --- | --- |
| total | 6 |
| runs a campaign (`campaigns.dm_user_id`) | 1 (Jamie) |
| holds characters | 4 |
| holds a `user_roles` row | 6 |
| holds live `neon_auth.session` rows | 5 |

The DND-016 probe account — `dnd016-signup-probe@example.com`,
`90684dfa-e5a7-487c-9aee-aa3c5532b57d`, named in
[`neon-auth-setup.md`](neon-auth-setup.md) § Cleaning up the probe account — is still
there, with one character, one `user_roles` row, three sessions, one account row, no
memberships and no campaigns. It runs nothing, so the guard in §4 does not catch it: it
is the first thing this control can be pointed at.
