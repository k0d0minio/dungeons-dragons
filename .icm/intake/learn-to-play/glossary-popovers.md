# Stub: Glossary popovers on every rules term

- feature-slug: glossary-popovers
- sequence: 1 of 3
- depends-on: none
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-research.md §3+§5

One glossary data source (~40–60 terms: AC, saving throw, proficiency bonus,
advantage, concentration, spell slot, cantrip, initiative, opportunity attack,
conditions…), each a two-sentence plain-language definition written in the app's
own words on the 2024 baseline. A shared tappable-term component renders any term
as a popover/bottom-sheet — usable in the sheet, the wizard, the rules chapters,
and the DM screens. D&D Beyond's every-term-a-popover pattern is the benchmark.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/learn-to-play/glossary-popovers.md` and the epic's `breakdown.md`.
Create the glossary as typed local data (term, definition, optional "see also")
on the 2024 rules baseline, authored fresh — no copied non-SRD phrasing. Build
one shared component that renders a term as tappable text opening an
Apple-style popover/sheet with the definition, and wire it through the character
sheet's labels and the rules chapters' key terms first (other surfaces adopt it
as they're built). 44px touch targets. PR on a `claude/` branch; CI green only.
