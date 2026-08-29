# Stub: Derived numbers replace typed-in numbers

- feature-slug: derived-defaults
- sequence: 4 of 5
- depends-on: wizard-frame
- priority: P1
- size: M
- sources: .icm/docs/2026-08-16-value-audit.md (creation-form value pass), .icm/docs/2026-08-29-first-campaign-direction.md

The old form asks beginners to type max HP, AC, and speed — numbers they cannot
know. The wizard derives them: level-1 HP = class die max + CON modifier; AC from
chosen equipment (the sheet already derives AC — reuse that logic at creation);
speed from species; starting equipment from class + background packs; prepared
spells / cantrips seeded from the recommended lists. Advanced toggle allows
overrides. This closes the value-audit's "creation-form value pass" gap.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/guided-creation/derived-defaults.md` and the epic's `breakdown.md`.
The wizard (`wizard-frame` stub) exists. Make HP, AC, speed, starting equipment,
and starting spells derived outputs of the wizard's choices rather than inputs —
reusing the sheet's derived-AC logic and the 2024 rules engine
(`src/lib/characters/`) rather than duplicating formulas. Manual override lives
behind the Advanced toggle only. Unit-test the derivations per class/species
combination. PR on a `claude/` branch; CI green only.
