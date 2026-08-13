# DND-009 · Character sheet — combat core (the v1 anchor)

| | |
|---|---|
| Type | feature |
| Priority | P1 |
| Size | L |

## Problem
The 2026-08-13 decisions set the v1 bar at "open on a phone all session": fast lookup
(DND-003) **plus** a playable sheet. This is the sheet. Scope is the **combat core**,
deliberately not the BRD's eight-tab spec (§3.1.2):

- **Tracked in play** — current/max/temp HP with tap-to-damage/heal, spell slots per
  level with tap-to-spend/regain, conditions on/off, death saves. Every tracked change
  persists to Neon immediately (fully online app — no local-first state).
- **Read at a glance** — AC, initiative modifier, speed, ability scores with modifiers,
  saving throws, skills with proficiency, and the character's spells, each tapping
  through to the full spell detail view built in DND-003.

Prep-time content (inventory weight, features text, backstory, session notes) is out of
scope until real sessions demand it. Depends on DND-007/002/008 (data layer, auth,
characters to display) and pairs with DND-003's detail views.

## Acceptance
- [ ] `/characters/[id]` renders the combat-core sheet, owner-only
- [ ] HP (incl. temp), spell slots, conditions, and death saves adjustable in ≤2 taps, persisted via the DND-007 data layer, correct after refresh
- [ ] Derived values (ability modifiers, proficiency bonus by level, save/skill bonuses) computed, not stored
- [ ] Character spells tap through to DND-003 spell detail
- [ ] Usable one-handed on a phone (44px targets); no layout shift while tapping HP in a dim room mid-combat
- [ ] CI green

## Prompt

Build the combat-core character sheet for the D&D 5e Companion at `/characters/[id]`
(owner-only via Neon Auth). Tracked: current/max/temp HP (tap damage/heal), spell slots
per level (tap spend/regain), conditions toggle, death saves — all persisted immediately
through the DND-007 Drizzle data layer with optimistic UI. Displayed: AC, speed,
initiative, ability scores + modifiers, saves, skills (proficiency from class/level,
computed not stored), and the character's spells linking into the DND-003 spell detail
views. Mobile-first, one-handed, shadcn components. Out of scope: inventory, backstory,
notes, dice rolling (killed). Read `.icm/intake/DND-009-character-sheet-combat-core.md`
and `.icm/docs/scope-decisions-2026-08-13.md` for full context. Open a PR on a `claude/`
branch; do not run local checks — CI is the source of truth.
