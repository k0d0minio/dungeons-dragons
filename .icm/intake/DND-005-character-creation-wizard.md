# DND-005 · Guided character creation wizard (post-v1)

| | |
|---|---|
| Type | feature |
| Priority | P3 |
| Size | L |

## Problem
**Deferred post-v1 by the 2026-08-13 scope decisions** — v1 creates characters with the
simple form (DND-008); this guided wizard is for when a genuinely new player joins the
table and needs the hand-holding the BRD's flagship story describes: "As a new player,
I want guided character creation so I can build a character without reading the entire
Player's Handbook" (business-requirements.mdx §2.3). The beginner/advanced modes of
FR-001 live here too — they were cut from the v1 form.

The BRD's workflow spec (§3.1.1): experience-level selection → class selection with
preview → origin selection (Background + Species per 2024 PHB) → ability scores (Point
Buy / Standard Array / Rolled) → details & backstory → complete character.

A 7-step wizard exists only on the unmerged branch `origin/cursor/K0D-159-...` (commit
`6de4abe`, Sep 2025) — it is `.jsx`, references `ClassViewer`/`RaceViewer` components
and `/api/characters` routes that no longer exist. It cannot be merged; salvage means a
rebuild using the old branch as reference only. Storage is settled now: the wizard's
output is a row through the DND-007 data layer, same as the form.

## Acceptance
- [ ] Guided multi-step creation flow matching BRD §3.1.1's five steps, mobile-first
- [ ] Produces the same valid character row as DND-008's form (DND-007 data layer, Neon Auth owner)
- [ ] Beginner/advanced modes per FR-001
- [ ] Old `K0D-159` branch deleted after salvage
- [ ] CI green

## Prompt

Build the guided character-creation wizard for the D&D 5e Companion — post-v1 work; do
not start while any P1 in the v1 chain (DND-002/003/006/007/008/009) is open. Spec:
`.cursor/requirements/processed/business-requirements.mdx` §3.1.1 and FR-001. The stale
7-step wizard on `origin/cursor/K0D-159-...` (commit `6de4abe`) is reference material
only. Output feeds the same DND-007 `characters` row as the DND-008 form. Delete the
`K0D-159` branch after salvage. Read
`.icm/intake/DND-005-character-creation-wizard.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for full context. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
