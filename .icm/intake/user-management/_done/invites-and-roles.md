# Stub: Users page, tokenised invites, and the DM-only wall

- feature-slug: invites-and-roles
- sequence: 1 of 1
- depends-on: none
- priority: P1
- size: L
- sources: Jamie, 2026-09-03; `.icm/docs/neon-auth-setup.md` (the `neon_auth.user`
  columns, verified against production the same day)

Jamie, 2026-09-03: "as the DM original user [I need] an area where I can manage
all users, not just ones attached to a campaign. I want to be able to invite
users and/or provide them with a tokenised signup/first sign in page. If they
are marked as a player they should never see the DM screens."

What shipped:

- `/dm/users` — every account from `neon_auth.user` with its role, join date and
  how many characters and campaigns it has; a Make DM / Make player switch on
  every row but your own (the route refuses a self-change: one mis-tap must not
  leave the table without a DM).
- Invites — `user_invites` (migration `0016`, additive). One link per person,
  `/invite/<token>`, 128 random bits, two weeks, works once; label and optional
  email, "Copy link" and a `mailto:` "Send by email". Opening the link trades
  the token for the same httpOnly cookie the shared code sets; the auth proxy
  admits the sign-up on it and, on the way back, **claims** it for the new
  user and writes their role. A sign-in claims too, so an existing account can
  be handed a role by link. The claim never demotes a DM. Revoke closes a
  link early; nothing is ever deleted.
- The wall — `src/app/dm/layout.tsx` sends a player to `/characters`; the
  bottom bar draws the DM stop only for the DM (decided in the root layout,
  server-side, so it is right on first paint). The root layout now reads the
  session, which makes every route dynamic; `getSessionUser` is `cache()`d so
  a page pays for one lookup, not two.

Not done, by choice: sending the email from the app (no mail provider is
configured; the `mailto:` is the cheap version), and deleting an account.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/user-management/_done/invites-and-roles.md` and the epic's
`breakdown.md`. This stub is done; it is here as the record of what shipped and
why. If you are picking up a follow-up, start from `.icm/intake/triage/`.
