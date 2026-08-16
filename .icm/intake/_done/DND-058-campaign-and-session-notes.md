# DND-058 · Campaign and session notes — the register's oldest "wanted"

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `.icm/project.md` (Features table + open questions) · `src/lib/db/schema.ts` |

## Problem

Notes have been `wanted` in the register since the Features table existed, and the
business-logic section already legislates for them — "a DM's own notes are not
player-readable; a player's per-character notes are their own" — yet the only `notes`
column in the entire schema is on `character_items`. Campaign continuity ("what was the
innkeeper's name? who has the map?") currently lives in whatever notebook or chat thread
happens to have caught it.

The ticket has been blocked the whole time on one register open question, which is
really the design decision: **are session notes typed during play or written up
afterwards?** If afterwards, this needs no phone-first surface at all — a plain textarea
on the campaign page, edited from a laptop, is the whole feature. If during play, it
needs a one-thumb quick-capture on the DM's tracker, which is a different and larger
build. Answering the question *is* scoping the ticket.

## Decision — Jamie

Answer the open question, then pick the shape:

- [ ] **Written up afterwards.** Per-session note entries on the campaign page (date +
      free text), DM-only by default with a per-note "visible to players" toggle.
      Desktop-comfortable; no new phone surface. Size M-.
- [ ] **Typed during play.** The above, plus a quick-capture field on the encounter
      tracker / campaign page that appends to the current session's note one-handed.
      Size M+.
- [ ] **Also player notes.** Add the per-character private notes field (the second
      register open question) — a free-text card on the sheet's read half, owner-only.
      Can be ticked alongside either shape above.
- [ ] **Kill.** Notes stay on paper. `> Dropped:` and done — and the register's
      Features table should stop saying `wanted`.

> **Answered (Jamie, 2026-08-16): typed during play, *and* player notes.** Recorded as
> register **D29**. The boxes above are Jamie's to tick and are left alone; this line is
> the record. The Decision section was still blank on `main` when the work started, so
> the question was put back to Jamie rather than assumed — one of the four options was
> Kill, and no assumption survives that.
>
> Built as: dated long-form notes on the campaign page (the "afterwards" half) *plus* a
> one-thumb quick-capture field on the encounter tracker (the "during play" half), both
> writing the same note; per-note "players can read"; and a per-character private notes
> card on the sheet's read half.
>
> **The player read surface, as the prompt asked to have proposed rather than invented:**
> a shared note appears at the foot of the sheet of every character in that campaign.
> No player campaign screen, no new route, no new navigation — the sheet is where a
> player already is at a table, and the note is labelled with its campaign only when the
> character sits at more than one.

## Acceptance

- [ ] Notes belong to a campaign, ordered by session/date, and survive exactly the
      visibility rule the register states: DM notes unreadable by players unless marked
      shared; player character notes owner-only
- [ ] Players have *some* read surface for shared notes (they currently have no campaign
      page — the join page aside; decide the smallest honest surface and say what it is)
- [ ] Writes are plain saves, not the 409-guarded combat path — notes are not contested
      state
- [ ] CI green

## Prompt

Jamie has answered the notes question in the Decision section of
`.icm/intake/DND-058-campaign-and-session-notes.md` — read it, and `.icm/project.md` for
context (the business-logic section already states the visibility rule). If killed,
`git mv` to `_done/` with a `> Dropped:` line and stop.

New table(s) under `src/lib/db/schema.ts` — additive, nullable, and remember `neon-http`
has no transactions, so keep each save single-row. The DM surface hangs off the campaign
page (`src/app/dm/campaigns/[id]/page.tsx`). If shared-with-players notes are in scope,
the player needs a minimal read surface — propose the smallest one in the PR rather than
inventing a full player campaign screen. If player character notes were ticked, they're
a card on the sheet's read half, saved like the build form, not through combat state.
Open a PR on a `claude/` branch; CI is the source of truth.
