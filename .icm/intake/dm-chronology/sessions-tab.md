# Stub: The Sessions tab — every night in order, and one night's page

- feature-slug: sessions-tab
- sequence: 6 of 9
- depends-on: dm-tab-bar, session-chain
- priority: P1
- size: L
- sources: breakdown.md; mockup artboards "Sessions tab" and "One played night";
  Jamie 2026-09-07, answer 7 (every note belongs to a night)

The DM wants to see the sessions and the notes in a logical order. The order is time:
a vertical timeline, newest at the top, each night a row that says what state it is in —
planned, tonight and open, played and recapped — and one page per night that reads the
whole chain top to bottom.

## Build

- **The timeline** (`/dm/sessions`), from `listNights`: a rail of dots down the left,
  an uppercase label per night — "Upcoming · Sun 14 Sep", "Tonight · 7 Sep · open",
  "Played · Wed 3 Sep", "Before · <date>" for session zero — and one inset row each:
  the title, a detail line ("1 fight ended · 3 revealed · 2 secrets found · 1 note", or
  "Plan 5 of 8 steps ready", or "Recap shared with players · 2 notes"), and chips for the
  next act: "Prep ›" on an upcoming night, "Close the session → recap" and "Play ›" on
  tonight, "Recap ✓" on a played one. Tonight's row carries the primary-coloured border.
- **Earlier tables**: closed campaigns as one inset group at the bottom, each a row into
  its own timeline (read-only; the chip does not switch to a closed campaign).
- **One night's page** (`/dm/campaigns/[id]/sessions/[nightId]`, where a night is keyed
  by its recap note, or by its plan while it has none): Recap (the shared note, with
  "players read this" in the header, and an Edit row), What happened (the window's log
  entries as time · kind · title rows), Your notes (every `campaign_notes` row of that
  night's `session_date` that is not the recap, each with its Private/Shared state as a
  value and the existing switch in a sheet), and The plan that night (one row into the
  plan, "4 of 5 scenes ran · 3 of 8 secrets found").
- **Notes move here.** `CampaignNotesCard` leaves the hub (in `retire-the-hub`); the
  write-a-note form lives on the night's page and defaults `session_date` to that night.
  Quick capture from Play keeps landing in tonight's open note. A note with a date that
  matches no night shows under a "Notes without a night" group at the bottom of the
  timeline rather than disappearing.
- The session log page (`/dm/campaigns/[id]/session-log`) becomes tonight's night page:
  same content, plus the close step, reached from the timeline's tonight row.

## Done looks like

Tests for the timeline's labels and chips per night state, the night page's four
sections, notes grouped by night and the orphan group, and closed campaigns read-only.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-chronology/sessions-tab.md` and the epic's `breakdown.md`. Build it on a
`claude/` branch and open a PR; CI is the only evidence. When it ships, `git mv` the stub
into `.icm/intake/dm-chronology/_done/` in the same PR.
