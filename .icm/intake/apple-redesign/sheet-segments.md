# Stub: The sheet becomes four segments with a beginner mode

- feature-slug: sheet-segments
- sequence: 4 of 4
- depends-on: design-tokens, navigation-shell
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

The 15 stacked cards (several screens long) reorganize into an iOS segmented
sheet: **Play** (HP, attacks, conditions, death saves, concentration, class
resources), **Spells** (slots, prepared, list), **Gear** (inventory, currency,
derived AC), **Me** (abilities, saves, skills, vitals, XP→level, notes) — nothing
more than a swipe away. Beginner-mode progressive disclosure: advanced bits
(typed temp HP detail, exhaustion, hit-dice management) stay collapsed until
relevant; death saves already only appear at 0 HP. This is a reorganization of
existing components, not a rewrite; the 15s polling and 409 optimistic-
concurrency model are untouched. Cross-epic: land after `rules-engine-2024` so
the sheet is reorganized once, on 2024 logic.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/apple-redesign/sheet-segments.md` and the epic's `breakdown.md`.
Confirm the `srd-2024-migration/rules-engine-2024` stub is done (check its epic's
`_done/`) — if not, flag before proceeding. Reorganize
`src/components/characters/sheet/` into a segmented layout (Play / Spells / Gear
/ Me) using an iOS-style segmented control, reusing the existing cards; add
beginner-mode collapse for the advanced bits named in the stub. Preserve
`use-combat-state.ts` polling, the 409 conflict handling, and turn-frequency
ordering within Play. PR on a `claude/` branch; CI green only.
