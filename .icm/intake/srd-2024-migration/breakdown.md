# Epic: srd-2024-migration — the 2024 rules foundation

- priority: P1
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md

## What was understood

Jamie decided (2026-08-29) the group learns the **2024 rules**. Today the app is
built on SRD 5.1 / 2014: reference data proxied from `dnd5eapi.co` (characters
store its index strings), hardcoded class/condition tables in
`src/lib/characters/rules.ts` (~741 LOC), and 11 markdown rules chapters in
`docs/rules/` that double as the AI's implementation reference and the user-facing
`/rules/*` pages (D29). This epic replaces that baseline with **SRD 5.2.1**
(CC-BY-4.0), superseding register decisions D11 (5.1 wins) and D18 (say "race").

Licensing rails (see the research brief): only SRD 5.2.1 content may ship as app
data — 12 classes with exactly one subclass each, 9 species, 4 backgrounds, 16
feats, ~400 spells, the 2025 Monster Manual SRD monsters. The attribution
statement must be updated to the 5.2.1 wording. Non-SRD content (other subclasses,
adventure text) never enters the data layer.

Rules mechanics that change: backgrounds grant ability scores + an Origin feat;
species grant traits only; every class gets its subclass at level 3; weapon
mastery for martials; exhaustion is a cumulative −2 to d20 tests; heroic
inspiration; one spell-slot-expending spell per turn.

Constraint: production migrations run in parallel with the Vercel deploy — every
schema change must be **additive and nullable**.

## Build order

1. `srd-data-layer` — SRD 5.2.1 content as data; attribution updated.
2. `rules-engine-2024` — the hardcoded tables and derived-stat logic move to 2024.
3. `character-model-migration` — schema for backgrounds, subclasses, mastery,
   inspiration; a story for existing 2014 characters.
4. `rules-chapters-2024` — the 11 chapters rewritten to the 2024 baseline.

Downstream epics (`guided-creation`, `dm-prep-suite`) block on 1–3. Run this epic
first in the program.
