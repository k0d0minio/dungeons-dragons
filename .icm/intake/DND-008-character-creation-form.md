# DND-008 · Simple character creation form

| | |
|---|---|
| Type | feature |
| Priority | P1 |
| Size | M |

## Problem
The v1 bar (2026-08-13 decisions) is a playable character sheet — which needs characters
to exist. The guided 5-step wizard (DND-005) is deferred to post-v1; what v1 needs is a
**single-page creation form** that a player who already knows D&D fills in from a
finished paper build or their head: name, class, species, level, six ability scores
(direct entry — no point-buy machinery), max HP, AC, speed, and their spells (picked
from the reference data so sheet tap-through works). Class and species options come
from the existing `/api/dnd5e/*` reference data, not hand-typed strings.

Depends on DND-007 (schema + data access) and DND-002 (a signed-in owner to attach the
character to).

## Acceptance
- [ ] `/characters` lists the signed-in user's characters; `/characters/new` is the form
- [ ] Class and species selects fed from the existing reference API; spell picker filtered by class using `/api/dnd5e/classes/[index]/spells`
- [ ] `react-hook-form` + `zod` validation (both already installed); a submitted form produces a valid row via the DND-007 data layer
- [ ] Mobile-first, 44px touch targets, one-handed use
- [ ] CI green

## Prompt

Build the simple character creation form for the D&D 5e Companion. Routes:
`/characters` (list, owner-scoped) and `/characters/new` (single-page form: name, class,
species, level, six ability scores entered directly, max HP, AC, speed, spells picked
from `/api/dnd5e/classes/[index]/spells`). Persist through the DND-007 Drizzle data
layer, owner from the DND-002 Neon Auth session. Use the installed `react-hook-form` +
`zod` and existing shadcn components; mobile-first. The guided wizard is explicitly out
of scope (DND-005, post-v1). Read `.icm/intake/DND-008-character-creation-form.md` and
`.icm/docs/scope-decisions-2026-08-13.md` for full context. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
