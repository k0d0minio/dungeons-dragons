# Stub: Per-campaign feature gates — the app grows with the group

- feature-slug: campaign-feature-gates
- sequence: 5 of 5
- depends-on: none
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Jamie wants to switch app surface on as the group learns ("build progressively").
A campaign carries DM-editable gates that simplify every member's sheet and
flows while off — first set: **spell preparation UI** (off = prepared lists are
fixed to the recommended set), **conditions & exhaustion UI**, **currency &
encumbrance detail**, **class resources detail**. Defaults: everything off — the
simplest possible session 1. Gates hide UI, never delete state; flipping one on
reveals what was always tracked underneath. The sheet reads the gates of the
campaign the character is attached to (a character in no campaign sees
everything).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-prep-suite/campaign-feature-gates.md` and the epic's
`breakdown.md`. Add a gates column (jsonb, additive nullable, defaults-off) to
campaigns with a DM-gated settings screen listing each gate with a plain
one-line description of what turning it on adds for the players. Wire the four
gates in the stub through the character sheet and related flows: hidden UI
while off, full state preserved underneath, sensible fallbacks (fixed prepared
spells while spell-prep is off). Characters outside any campaign see everything.
Test gate-off rendering per sheet section. PR on a `claude/` branch; CI green
only.
