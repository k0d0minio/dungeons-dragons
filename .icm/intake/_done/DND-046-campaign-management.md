# DND-046 · Campaign management — create a table, invite the table

| | |
|---|---|
| Status | in-progress |
| Type | feature |
| Priority | P1 |
| Size | M |
| Sources | Jamie's prototype interrogation 2026-08-15 · `src/lib/db/schema.ts` (DND-026) · register D14, D19 |

## Problem

DND-026 built the campaigns substrate deliberately without UI, and no ticket ever covered
the gap that leaves: there is no way to *create* a campaign, and no way for a player's
character to *get into* one. Every DM feature (DND-027's predicate, DND-030's glance,
DND-031's encounters) is unreachable in practice until both exist. The chicken-and-egg is
real: a DM cannot attach players' characters because they cannot see them until the
characters are in a campaign.

## Decision (Jamie, 2026-08-15)

The way in is a **join link**, mirroring the D24 token pattern: each campaign carries an
unguessable, regenerable `join_code`; the DM shares `/campaigns/join/<code>`; a signed-in
player opens it and attaches whichever of their own characters they choose. Knowing the
code grants joining and nothing else. Campaign creation is gated by the global `dm` role
(D19).

## Acceptance

- [ ] A `dm`-role user can create a campaign from `/dm` and see it listed
- [ ] The campaign page shows a join link the DM can copy and regenerate; regeneration kills the old link
- [ ] A signed-in player opening a live join link can join and attach their own characters (only their own — foreign ids are dropped server-side)
- [ ] Joining twice is harmless; joining with no character is allowed
- [ ] A dead or fabricated code 404s indistinguishably
- [ ] A player-role user does not see the DM tools; creation is refused server-side too
- [ ] CI green

Read `.icm/intake/DND-046-campaign-management.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
