# DND-005 · Rebuild guided character creation

| | |
|---|---|
| Type | feature |
| Priority | P2 |
| Size | L |

## Problem
"Core character creation flow" is the first MVP feature (`.cursor/project.json`) and the
BRD's flagship user story: "As a new player, I want guided character creation so I can
build a character without reading the entire Player's Handbook"
(business-requirements.mdx §2.3), with a success metric of "70% completion rate for
first character creation flow". A 7-step wizard exists only on the unmerged branch
`origin/cursor/K0D-159-...` (commit `6de4abe`, Sep 2025) — it is `.jsx`, references
`ClassViewer`/`RaceViewer` components and `/api/characters` routes that no longer exist
after the main-branch rewrites. It cannot be merged; salvage means a rebuild using the
old branch as reference only.

The BRD's workflow spec (§3.1.1): experience-level selection → class selection with
preview → origin selection (Background + Species per 2024 PHB) → ability scores (Point
Buy / Standard Array / Rolled) → details & backstory → "Complete, valid D&D 5e character
ready for play".

## Acceptance
- [ ] Guided multi-step creation flow matching BRD §3.1.1's five steps, mobile-first
- [ ] Produces a stored, valid character (storage per the DND-004 decision — local, cloud, or both)
- [ ] Beginner/advanced modes per FR-001 ("beginner and advanced character creation modes")
- [ ] Old `K0D-159` branch deleted after salvage
- [ ] CI green

## Prompt

Rebuild the guided character-creation flow in the D&D 5e Companion PWA. Spec:
`.cursor/requirements/processed/business-requirements.mdx` §3.1.1 and FR-001. A stale
7-step wizard on `origin/cursor/K0D-159-...` (commit `6de4abe`) is reference material
only — it targets components and API routes deleted from main. Check
`.icm/intake/DND-004-offline-profile-decision.md`'s outcome first: character storage
depends on that decision. Read `.icm/intake/DND-005-character-creation-wizard.md` for
full context. Open a PR on a `claude/` branch; do not run local checks — CI is the
source of truth.
