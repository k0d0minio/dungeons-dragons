# Epic: dm-chronology — the DM's side, organised by the chronology of a game

- priority: P1
- sources: .icm/docs/2026-09-07-dm-chronology-research.md; mockup
  <https://claude.ai/code/artifact/3c32ab1b-7e8e-42ca-88cd-c9d8cd92bd7e>; Jamie,
  2026-09-07 (answers recorded in the research doc)

## What was understood

Jamie is DMing his first real table and learning as he goes. The DM side he has is one
long list of cards: `/dm` is a campaign list plus three cards, and the campaign page
stacks thirteen more — party glance, milestone, encounters, session zero, four prep
links, session log, gates, notes, join code, close campaign — in one scroll that has to
serve prep on a Tuesday and a fight on a Thursday. Every deep page's only exit is Back to
that hub. And "session" is three unlinked things: a dated plan, the derived log, and the
note that becomes a recap.

The decision (D48): the DM's side is organised by **when** in the life of a game a thing
is used. The bar for the `dm` role becomes four stops — **Prep · Play · Sessions ·
Library** — amending D16/D44 for the DM only; players keep Character · Library. The
campaign is **scope, not a page**: exactly one is open at a time, it is named in a chip
under every tab's title, and closed campaigns are history under Sessions. A night is a
**chain** — the plan, what happened, the recap — held together by one nullable column
linking a plan to the recap note it produced. The **Lazy DM eight steps** are the prep
rail for every night. Between-session controls (join link, gates, milestone, session
zero, invites, close) leave the play screen for a grouped settings page reached from the
chip. Prep entities, the tracker, the crib and the log keep their routes and their data
layers; this epic re-homes their doors.

Rails the mockup fixes and every stub inherits:

- **Lists, not cards.** Inset grouped lists with disclosure rows and value rows, one
  uppercase section header per group, an "up next" hero row above the lists where there
  is one thing to do next. The card primitive stays for genuinely heterogeneous content.
- **One tap in, never two.** During play the tracker, the crib, the table screen, quick
  note and reveal are each one tap from the Play tab (NN/g's two-level rule).
- **Nothing here changes what a player sees.** The player campaign view, the sheet and
  the table screen are untouched; a DM screen that moves is still behind
  `requireDmUser`, and every query keeps `campaigns.dm_user_id` folded in.
- **Teach in the empty state**, with one call to action, never a tour.
- **Phones only, Apple HIG structure, the existing tokens** (D39). 44 px targets and
  `--bottom-nav-height` clearance stand.
- Nothing ships before tonight (2026-09-07, session 1). The batch lands for session 2 on.

## Build order

1. `dm-tab-bar` — the four-stop bar for the DM, the active campaign, the four routes.
2. `prep-tab` — the Prep tab: up-next plan, the world, the party, session zero.
3. `eight-steps-plan` — one night's prep restructured as the Lazy DM eight steps.
4. `play-tab` — the Play tab: the fight, the party, tonight's plan, reveal, the toolbar.
5. `session-chain` — one column links a plan to its recap; the log reads per night.
6. `sessions-tab` — the timeline of nights, and one played night's page with its notes.
7. `campaign-settings` — the grouped settings page reached from the campaign chip.
8. `one-link-invite` — one link that makes the account and seats the person at the table.
9. `retire-the-hub` — the old `/dm` and campaign hub go; redirects; register refresh.
