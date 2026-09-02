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

> Amended 2026-09-02 (`wizard-frame` shipped): the eight-step wizard is at
> `/characters/new`; `character-form.tsx` is now the edit form only. The rules layer the
> other four stubs build on is `src/lib/characters/wizard.ts` — `CLASS_GUIDES` (one-liner,
> complexity, ability priority, suggested species and background per class),
> `recommendedChoices` as the single entry point that fills every step, the `withClass` /
> `withBackground` re-seating rules, the standard-array assignment, the curated spell
> lists, and a parser that turns the SRD's prose starting-equipment lines into pickable
> options. `vibe-quiz` replaces `recommendedChoices`'s "start from a class" with a quiz
> result and changes nothing else; `inline-consequences` moves `CLASS_GUIDES.summary`
> into the SRD data as an `inPlay` field and renders it through `option-list.tsx`, which
> already has the slot; `derived-defaults` deepens `derivedMaxHitPoints`,
> `derivedArmorClassColumn` and `derivedSpeed`, which the wizard already calls rather
> than asking for.
>
> Three things this stub decided that the rest of the epic inherits. The wizard builds
> **level-1 characters only** — no subclass, no feat-vs-ASI, which is what the research
> asked for and what keeps the flow eight screens rather than fourteen. Cantrips are
> written to `knownSpellIndexes` and starting leveled spells to `preparedSpellIndexes`,
> so the sheet's "N of 4 prepared" count stays honest for the seven class-list casters.
> And the draft is `localStorage`, not a table: it does not follow a player to another
> device, which was judged the right trade for a build finished in one sitting on the
> phone in their hand.

> Amended 2026-09-02 (`vibe-quiz` shipped): the wizard's optional first screen is four
> questions, and `src/lib/characters/vibe-quiz.ts` is the layer the remaining three stubs
> now sit beside rather than behind. It is a second entry point to `wizard.ts`, not a
> replacement for one: `quizRecommendation` picks a class off an ordered mapping table
> and then builds through `recommendedChoices`'s own functions, so `recommendedChoices`
> stays exactly where it was and `withClass` still re-seats a build the same way. The one
> thing the quiz added downstream is `recommendedSkills`'s optional third argument, an
> emphasis that reorders the class's own list without widening it.
>
> Two decisions the rest of the epic inherits. The **table is ordered rules, first match
> wins** — not a score over twelve classes — so every recommendation is a line somebody
> can be shown, and that line is also the "why this fits" copy; `inline-consequences`
> should follow the same shape when it moves `CLASS_GUIDES.summary` into the SRD data.
> And the **quiz decides the class and nothing else about flavour**: species and
> background stay the class guide's, because in the 2024 rules a species grants traits
> and a speed and no scores at all, and the background is where a class's two best
> abilities get their +2/+1 — neither is improved by a quiz answer pulling on it, and
> both are one tap away on their own step.
>
> The draft grew a `quizAnswers` field (optional in the schema, so a draft written before
> the quiz still loads) and `openingDraft` now reports whether it actually resumed —
> which is what stops the quiz being asked of someone coming back to a half-made
> character. `party-balance-hints` will want that same flag if it nudges composition
> before the class step.
