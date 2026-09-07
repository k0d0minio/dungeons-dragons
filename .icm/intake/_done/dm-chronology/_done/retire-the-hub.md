# Stub: The old DM home and the campaign hub go

- feature-slug: retire-the-hub
- sequence: 9 of 9
- depends-on: prep-tab, play-tab, sessions-tab, campaign-settings
- priority: P1
- size: S
- sources: breakdown.md

Once every card on `/dm` and `/dm/campaigns/[id]` has a new home, the two long lists
retire, their URLs keep working, and the register says what shipped.

## Build

- `src/app/dm/page.tsx` becomes the redirect `dm-tab-bar` made it; the campaign list,
  crib card, users card and the "party and the fights" card are deleted, not hidden.
- `src/app/dm/campaigns/[id]/page.tsx` redirects: the active campaign → `/dm/play`; a
  closed one → its Sessions timeline. Every card component it rendered that nothing else
  now renders is deleted with its test (`EncountersCard`, the hub's `CampaignNotesCard`
  usage, the prep-links card).
- Back links on the prep pages, the plan page, the tracker and the log point at the tab
  they belong to, not at the dead hub.
- `.icm/project.md`: refresh the Features table for the DM side, and note under D16/D44
  that D48 amends them. `.icm/intake/dm-chronology/` archives whole under `_done/` in
  this PR.
- Sweep comments that still say "the campaign page" for what is now a tab.

## Done looks like

Tests for both redirects; no dead component or test left behind; CI green.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/retire-the-hub.md` and the epic's `breakdown.md`. Build it on
a `claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the
stub into `.icm/intake/dm-chronology/_done/`, then the whole epic into
`.icm/intake/_done/`, in the same PR.
