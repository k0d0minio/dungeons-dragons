# Stub: The step-by-step creation wizard

- feature-slug: wizard-frame
- sequence: 1 of 5
- depends-on: none
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-research.md §5

Replace `/characters/new`'s one-page form with a linear wizard, mechanics before
flavour: 1 class (recommendation cards, one per SRD class, plain-language
one-liners) → 2 species → 3 background (grants the ability score increases in
2024) → 4 ability scores (standard array with a recommended assignment;
advanced: manual) → 5 skills → 6 starting equipment → 7 spells (casters only,
curated suggestions) → 8 name & look, last. Every step has a recommended default
pre-selected; "accept all defaults" fast path; an Advanced toggle per step opens
the full SRD list. Draft persists so a step can be abandoned mid-way. The edit
form remains for post-creation tweaks.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/guided-creation/wizard-frame.md` and the epic's `breakdown.md`.
Verify the `srd-2024-migration` epic's first three stubs are in its `_done/` —
this wizard is built on the 2024 data layer, rules engine, and character model;
flag and stop if they aren't. Build the stepped wizard described in the stub at
`/characters/new`, replacing the one-page form there (keep
`src/components/characters/character-form.tsx` for `/characters/[id]/edit`).
Steps are resumable via a persisted draft. Follow the app's design system (the
`apple-redesign` tokens/shell if landed). Respect the existing patterns:
react-hook-form + zod, SWR, no global store. PR on a `claude/` branch; CI green
only.
