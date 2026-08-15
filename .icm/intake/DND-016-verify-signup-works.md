# DND-016 · Verify sign-up works for someone who is not Jamie

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P0 |
| Size | S |
| Sources | commit `e86d132` "Document the trusted-domains step that gates sign-up" · `.icm/docs/neon-auth-setup.md` (deleted, recoverable at `1b151fa^`) · `src/app/auth/[path]/page.tsx:8-10` |

## Problem

Nobody has ever confirmed that a person who is not Jamie can create an account on the
deployed app. That is the first thing four friends will do at the first session, and if it
fails the session is over before a character exists.

The specific hazard is documented — and then was deleted. Commit `e86d132` added
`.icm/docs/neon-auth-setup.md` recording that **Neon Auth sign-up is gated behind a
trusted-domains step** in the Neon Console. That runbook was deleted the next day by
`1b151fa`, so the fact now exists only in git history and nothing in the repo tells a
future session about it. Jamie's own account predates the gate being relevant, so his
working sign-in proves nothing about a stranger's sign-up.

This is a verification ticket, not a build ticket. It may turn out there is nothing to fix —
that is a good outcome and should be recorded rather than assumed.

## Acceptance

- [ ] A real sign-up is completed end to end on the production deployment using an email
      address that is not Jamie's, from a device that has never been signed in
- [ ] That account can create a character and open its sheet
- [ ] Whatever the trusted-domains configuration turns out to be is written down in
      `.icm/docs/neon-auth-setup.md` — restored from `1b151fa^` and corrected, or rewritten
- [ ] If sign-up is broken, either it is fixed here or a follow-up ticket is cut naming the
      exact failure

## Prompt

Verify that someone other than Jamie can actually sign up for the D&D 5e Companion on its
production deployment, and write down what makes it work.

Background: this app has never been used at a table. Sign-in works for Jamie, but Neon Auth
sign-up is gated behind a "trusted domains" step in the Neon Console — a fact recorded in
`.icm/docs/neon-auth-setup.md` by commit `e86d132` and then lost when `1b151fa` deleted the
whole `.icm/docs/` folder. Recover that file with
`git show 1b151fa^:.icm/docs/neon-auth-setup.md` and read it first; it is the best
description of the setup that exists.

Then establish the truth about the live deployment: is open sign-up currently working, and
what configuration is it depending on? The auth routes are statically generated at
`src/app/auth/[path]/page.tsx` and the server config is at `src/lib/auth/server.ts`. Note
that `isAuthConfigured()` makes auth degrade quietly rather than erroring, so a
misconfiguration looks like "no session" rather than a visible failure — do not read a
silent redirect as proof of anything.

Restore a corrected `.icm/docs/neon-auth-setup.md` documenting what you found. If sign-up
is broken for new users, fix it if the fix is in the repo, or cut a ticket naming the exact
failure if it is Console-side. Read `.icm/intake/DND-016-verify-signup-works.md` and
`.icm/project.md` for context.

Anything requiring a click in the Neon Console is Jamie's to do — write the steps, do not
pretend to have done them. Open a PR on a `claude/` branch; do not run local checks — CI is
the source of truth.
