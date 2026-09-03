# Stub: Tap a thing, learn the roll

- feature-slug: roll-walkthroughs
- sequence: 3 of 3
- depends-on: glossary-popovers
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md §3

The highest-value teaching feature per research: tapping an attack, spell, check,
or save on the sheet opens a walkthrough sheet — which physical die to pick up
("the d20, then your greataxe's d12 if you hit"), what to add and *why* ("+5:
your Strength +3 and your proficiency +2, because you're proficient with this
weapon"), what to compare it against (their AC, the DC), and what happens next
(damage dice, half on save). Spell walkthroughs remind about slot spend and
concentration. **D8 stands: the app never rolls — it teaches the physical
roll.** No turn-aware mode (declined). Depends cross-epic on the 2024 rules
engine; best after `sheet-segments`.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/learn-to-play/roll-walkthroughs.md` and the epic's `breakdown.md`.
Confirm `srd-2024-migration/rules-engine-2024` is done (its epic's `_done/`);
flag and stop if not. Build the walkthrough bottom-sheet for attacks, spells,
checks, and saves on the character sheet, computing each explanation's numbers
from the real rules engine (`src/lib/characters/`) — never a parallel formula.
Include the die-to-pick-up, the modifier breakdown with the why, the target, and
the follow-on (damage / save effect / concentration / slot spend). No rolling,
no randomness anywhere. Unit-test the explanation math against the engine. PR on
a `claude/` branch; CI green only.
