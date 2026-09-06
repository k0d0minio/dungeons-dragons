# Stub: The DM lands behind the screen, and never in the wizard

- feature-slug: dm-front-door
- sequence: 3 of 17
- depends-on: none
- priority: P1
- size: S
- sources: `.icm/docs/2026-09-05-first-timer-audit.md` §B; Jamie, 2026-09-05: "the DM
  shouldn't be able to create a character"; Q&A: land on `/dm`, a two-stop bar

Today `/` (`src/app/page.tsx`) sends a signed-in user with no characters to
`/characters/new`. For Jamie — the one `dm`, with no character — that is where the app
opens, and his bar carries a *Character* stop that leads to "Let's make your first
character". `POST /api/characters` accepts any session.

## Build

- `/` sends the `dm` role to `/dm`. The root layout already reads the role for
  `showDm` (`src/app/layout.tsx`, `isDm`); keep it one lookup per request —
  `getSessionUser` is `cache()`d, `isDm` can be.
- The bottom bar for the DM is **Library · DM**: the Character destination is drawn for
  players only (a `playerOnly` beside `dmOnly` in `bottom-nav.tsx`). The bar stays two
  stops for everyone — D16's "never changes shape under a thumb".
- `/characters` and `/characters/new` redirect the DM to `/dm`.
- `POST /api/characters` answers 403 for the `dm` role, with a line that says why.
- A DM opening a party member's sheet is untouched (D13). The sheet header's back link
  reads "Your characters" for the DM today; make it the campaign.

Rail: the role is global (D19). Jamie also sits on the Tutorial roster as
`role: 'dm'` — a roster row grants nothing, and this stub reads none.

## Done looks like

Tests for the redirect per role, the bar's destinations per role, 403 on create for
the DM, and a player's experience unchanged.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/first-table/dm-front-door.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/first-table/_done/` in the same PR.
