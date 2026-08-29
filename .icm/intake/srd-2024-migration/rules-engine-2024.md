# Stub: Rules engine moves to the 2024 mechanics

- feature-slug: rules-engine-2024
- sequence: 2 of 4
- depends-on: srd-data-layer
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-research.md §1

Rework the hardcoded rules tables and derived-stat logic
(`src/lib/characters/rules.ts`, `combat.ts`, `rests.ts`, `level-up.ts`,
`attacks.ts`) from SRD 5.1 to 5.2.1: backgrounds grant ability score increases and
an Origin feat; species grant traits only; **every class takes its subclass at
level 3** (the level planner currently has no subclasses at all); weapon mastery
properties on martial attacks; exhaustion becomes a cumulative −2 to d20 tests
(replacing the 0–6 ladder UI semantics); heroic inspiration; the tidied action
list. Spell slot tables are largely unchanged.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/rules-engine-2024.md`, the epic's `breakdown.md`,
and `.icm/docs/2026-08-29-first-campaign-research.md` §1 for the change list. The
SRD 5.2.1 data layer from the `srd-data-layer` stub is in place — build on it.
Rework `src/lib/characters/rules.ts` and its sibling modules (`combat.ts`,
`rests.ts`, `level-up.ts`, `attacks.ts`) to the 2024 mechanics listed in the stub,
including subclass-at-3 in the level-up planner and weapon mastery surfaced on
attacks. Keep the tables static/local. Update affected sheet cards only as far as
correctness requires — the visual re-segmentation belongs to the `apple-redesign`
epic. Tests updated alongside; PR on a `claude/` branch; CI green is the only
evidence.
