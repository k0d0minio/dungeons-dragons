# Epic: learn-to-play — the teaching layer

- priority: P2
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md §3

## What was understood

Jamie chose all four teaching mechanisms: glossary popovers, a learn-to-play
section, roll walkthroughs, and inline consequences (the last lives in the
`guided-creation` epic). Coaching depth is **walkthroughs only** — he explicitly
declined a turn-aware "you're up" mode. Register decision **D8 stands**: no dice
roller, ever — physical dice are the point of the physical table. The
walkthroughs teach which physical dice to pick up; the app never rolls.

Research says beginners consistently stumble on: the action economy, spell
bookkeeping (known/prepared/slots/concentration), what-to-roll-when with which
modifier, and reading the sheet. That list is this epic's syllabus. The eleven
`/rules/*` chapters remain the reference tier (rewritten to 2024 by
`srd-2024-migration/rules-chapters-2024`); this epic adds the friendly tier above
them.

Cross-epic: glossary and chapters can start once the 2024 baseline is decided;
walkthroughs need the 2024 rules engine and sit best on the re-segmented sheet.

## Build order

1. `glossary-popovers` — one glossary source, tappable everywhere.
2. `learn-chapters` — the short friendly tier, readable at home before session 1.
3. `roll-walkthroughs` — tap a thing on the sheet, learn the roll.
