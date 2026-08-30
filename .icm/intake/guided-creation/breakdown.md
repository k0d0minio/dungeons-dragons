# Epic: guided-creation — brand-new players build real characters

- priority: P1
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md §3+§5

## What was understood

The current creation flow is a one-page form with 14 raw fields — direct ability
score entry, manual max HP/AC/speed, unfiltered pickers. Jamie's friends have
never opened a rulebook. His decision: **guided + escape hatch** — a vibe quiz
recommends a build, a step-by-step wizard pre-fills sensible defaults acceptable
one tap at a time, and an advanced toggle exposes the full SRD lists. A guided
wizard was already "wanted" in the register (old DND-005, deleted in the purge) —
this epic is its return, with research behind it.

Research rails: recommended default pre-selected at every step; mechanics before
flavour (name last); progressive disclosure (no feat-vs-ASI, no upcasting talk at
level 1); steer hesitant players toward low-cognitive-load classes (Champion
Fighter, Thief Rogue); never show ~400 spells unfiltered. SRD 5.2.1's decision
space (12 classes × 1 subclass × 9 species × 4 backgrounds) is exactly the right
size and fully legal to encode.

Cross-epic: **blocks on `srd-2024-migration` stubs 1–3** (data, rules engine,
character model) and reads the `apple-redesign` design system. Inline
"what this means in play" education lives here; the deeper teaching tier is the
`learn-to-play` epic.

## Build order

1. `wizard-frame` — the stepped flow replacing the one-page form.
2. `vibe-quiz` — the recommendation layer that pre-fills the wizard.
3. `inline-consequences` — one-line "in play" notes on every option.
4. `derived-defaults` — HP/AC/speed/gear/spells derived, not typed.
5. `party-balance-hints` — campaign-aware composition nudges (P2).

> Amended 2026-08-30 (`srd-2024-migration` stubs 1–3 shipped): this epic's blocker is
> cleared. The SRD 5.2.1 data, the 2024 rules engine and the character columns are all
> in place — a wizard step writes `background_index`, `background_ability_spread`,
> `background_abilities`, `origin_feat_index`, `subclass_index` and
> `mastered_weapon_indexes` through the same `characterFormSchema` the one-page form
> uses. `abilityScoresWithBackground` is waiting for `wizard-frame` specifically: it is
> the one place a character's scores are entered as a *base* rather than as a finished
> total, so it is the only place a background's +2/+1 can be applied without
> double-counting.
