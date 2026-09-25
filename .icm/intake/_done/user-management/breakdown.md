# Epic: user-management — the DM's people page

- priority: P1
- sources: Jamie, 2026-09-03 (session `claude/dm-user-management-access`); D19, D20

## What was understood

Jamie asked for three things at once, on 2026-09-03, with the friends' accounts
starting to arrive: a place to see **every** account (not only the ones on a
campaign roster — a friend who signed up and joined nothing is exactly who he
needs to find), a way to **invite** someone with a link that does the sign-up
gate's job for one person and lands them with the right role, and the rule that
**a player never sees a DM screen**.

The shared invite code (D20) stays, because it still works and still
fail-closes; the tokenised invite sits beside it as a second key to the same
door. Roles stay the one global `dm`/`player` row (D19); the page is where that
row is set from now on, instead of SQL. The "DM tab visible to everyone" posture
from DND-029 is reversed: the tab is drawn for the DM only, and `/dm/*` redirects
a player to their characters.

Accounts themselves are Neon's (`neon_auth.user`): the page reads that table and
writes nothing to it. Deleting an account is still the SQL-only path the auth
runbook describes — parked in `triage/account-deletion-from-users-page`.

## Build order

1. `invites-and-roles` — the users page, tokenised invites, the role switch, and
   the player-never-sees-DM wall. Shipped in one PR.
