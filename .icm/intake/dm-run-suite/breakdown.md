# Epic: dm-run-suite — running the session live

- priority: P1
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md §4

## What was understood

Initiative, per-monster HP, the party glance, and the public table screen
already exist. Jamie chose four in-session additions: **reveal controls**,
**stat blocks in the tracker**, a **DM rules crib**, and a **session log &
recap** — plus the **milestone leveling** decision (resolving the register's
open XP question) which retires the XP-award flow.

Reveals need somewhere player-facing to land: players currently have no campaign
view at all (they join via code and then only see their own sheet). So this epic
opens with a modest player campaign view — party, discovered content, latest
recap — deliberately not a new home screen (Jamie chose character-first as the
front door).

Latency rails: the table screen polls at 5s, player sheets at 15s — reveals ride
the existing polling, no websockets (estate of the app's D2 decision). Table
screen must stay legible with 6 players. Cross-epic: blocks on `dm-prep-suite`
(the entities being revealed) and `srd-2024-migration` (2024 stat blocks, level
data).

## Build order

1. `player-campaign-view` — the player-facing landing for everything revealed.
2. `reveal-controls` — the DM's reveal switch; content appears on phones and
   the table screen.
3. `tracker-stat-blocks` — tap a monster in the tracker, see its stat block.
4. `dm-rules-crib` — the paper DM screen, digitized and DM-gated.
5. `session-log-recap` — what happened becomes "previously on…".
6. `milestone-leveling` — one tap levels the party; XP award UI retires.
7. `table-screen-legibility` — strip the chrome; keep the active turn visible.
8. `tracker-ergonomics` — Next turn under the thumb; no fatal mis-taps.

> Amended 2026-08-29 (`/project` re-run): stubs 1–4, 7, 8 raised to **P1** —
> session 1 needs them; 5 and 6 stay P2 (recaps and leveling arrive with session
> 2). Data-lens rails: the session log is a **derived view** (query over
> `revealed_at`, checkoff timestamps, and a new `encounters.completed_at`) —
> never dual-written on neon-http; the recap publishes as a **shared campaign
> note** (D41 — one player-facing record, reusing DND-058's surface); milestone
> is **one** `campaigns.milestone_level` write with "waiting" derived (D35).

> Amended 2026-09-03 (`milestone-leveling` shipped): the data-lens rail above held
> exactly as written, and the stub's own shape is worth recording for stubs 7 and 8.
>
> **One column, one write, nothing derived stored.** `campaigns.milestone_level` is a
> nullable `integer` with a `1–20` CHECK (`NULL` is "no milestone set", which is not
> level 1); the migration is one `ADD COLUMN` plus that constraint, touching no character
> table. `setCampaignMilestone` writes one row — the tests assert the statement count and
> that no `characters` write is issued, because the failure this feature was designed
> against is a six-character loop half-applying on a driver with no transactions.
> `milestoneForCharacter` reads it back through `viewableBy`, the same D13 predicate the
> sheet is behind, and takes the **higher** of two tables for `resolveGates`' reason.
>
> **"A level is waiting" never became state.** No pending-level column, no flag to clear:
> `LevelUpWaitingBand` is `character.level < milestoneLevel` asked at render time, so it
> appears when the DM taps and disappears when the player finishes the planner. Nothing
> writes `characters.level` but the DND-032 planner, and a character three levels behind
> is offered one step, because that is what the planner takes.
>
> **XP retired through D40 rather than a flag of its own.** The gates set grew a fifth
> switch, `experiencePoints`, off by default — the first gate that also hides a **DM**
> surface (the tracker's award step), because that step writes the players' XP and hiding
> the total while leaving the thing that fills it in would be half a decision. The
> encounter page reads the campaign's own column rather than the union, since a DM screen
> belongs to exactly one table and the roster read already carries the row.
> `experience.ts`, `encounters/experience.ts` and the `characters.experience` column are
> untouched; a table that wants XP back gets it with one switch, totals intact.
>
> Not crossed, and left for whoever wants it: the DM's card names who is still to level
> up but cannot nudge them (no notifications exist, D2/D28), and nothing on the party
> glance marks a row as behind — the milestone card directly under it says it once.
