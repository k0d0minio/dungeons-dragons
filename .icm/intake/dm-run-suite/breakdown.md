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
