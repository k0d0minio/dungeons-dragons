# Stub: One link makes the account and seats the person at the table

- feature-slug: one-link-invite
- sequence: 8 of 9
- depends-on: campaign-settings
- priority: P1
- size: M
- sources: breakdown.md; Jamie 2026-09-07, answer 10: "I just want the invite process to
  be easier, for account creation and for campaign invitation";
  `user-management/invites-and-roles`; D36 (creation from a join attaches the character)

Bringing a friend in is two links today: an account invite from `/dm/users`
(`/invite/<token>`, claimed through the invite cookie) and, once they have an account, the
campaign's join link (`/campaigns/join/<code>`). One person, one link.

## Build

- `user_invites.campaign_id`, nullable, FK → `campaigns.id` `ON DELETE SET NULL`. One
  additive migration. An invite made from the settings page carries the campaign; one
  made from `/dm/users` carries none, exactly as today.
- Claiming an invite that carries a campaign (`src/lib/auth/invite.ts`,
  `src/lib/db/invites.ts`) seats the new account on the campaign's roster
  (`campaign_members`, `role: 'player'`) in the same claim, and sets the join context the
  join flow sets today, so the wizard the new player lands in attaches the finished
  character to that campaign (D36). Read `src/lib/db/campaigns.ts`'s join path and reuse
  it — one definition of "seat this person".
- The invite landing (`src/components/auth/invite-landing.tsx`) names the table: "Jamie
  is inviting you to play in Heroes of the Borderlands", and the two doors stay. An
  existing account taking the link is seated and sent to their character; an account
  that is already on the roster is a no-op, not an error.
- Settings' "Invite someone" opens a sheet: a label ("Sam"), the role fixed to player,
  and the link to copy or share (`navigator.share` when present). Expiry and revocation
  are the invite's existing rules; the `InviteManager` on `/dm/users` lists these too,
  with the campaign named.
- Fail-closed stands (D20): no campaign on the invite is the current behaviour, and a
  claim never grants more than a roster seat.

## Done looks like

Tests for the migration, claim-with-campaign seating exactly one member row and setting
the join context, claim without a campaign unchanged, an already-seated account, a
revoked or expired link, and the landing copy per case.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/one-link-invite.md` and the epic's `breakdown.md`. Build it on
a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the
stub into `.icm/intake/dm-chronology/_done/` in the same PR.
