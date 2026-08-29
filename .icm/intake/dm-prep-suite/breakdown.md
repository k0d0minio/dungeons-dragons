# Epic: dm-prep-suite — the DM's gated prep tools

- priority: P2
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md §4

## What was understood

Jamie (the only `dm` role) preps a **published starter box** — research recommends
*Heroes of the Borderlands* (2024 rules, levels 1–3) — and the app holds **his own
prep keyed to it**: NPCs, locations, session plans, encounters. Licensing rail:
adventure text is never encoded as app data; everything the DM types is his
private freeform prep referencing a book he owns. SRD content (monsters, rules)
may ship as data.

He chose all four gating kinds. This epic implements two: **DM-only tools**
(everything here sits behind the existing global `dm` role and inside a campaign)
and **secret DM state** (every prep entity has a player-facing layer and a
DM-only layer). The other two — reveal gates in play and per-campaign feature
gates — are `dm-run-suite`'s reveal controls and this epic's final stub
respectively.

Shared pattern to establish in the first stub and reuse: a **revealable entity**
— `campaign_id`, a public layer (name, description, optional image), a DM-only
layer (secrets, notes, stats), and a `revealed_at` timestamp (null = hidden).
Party is 5–6; encounter difficulty must read against who's actually attending.
Cross-epic: the encounter builder needs 2024 monster data
(`srd-2024-migration/srd-data-layer`).

## Build order

1. `npc-roster` — NPCs with a public face and a secret layer; establishes the
   revealable-entity pattern.
2. `locations-handouts` — places and images; decides the image-storage question.
3. `session-plans` — Lazy-DM prep: strong start, scenes, secrets, treasure.
4. `encounter-builder` — monsters + difficulty budget, feeding the tracker.
5. `campaign-feature-gates` — the app grows with the group.
