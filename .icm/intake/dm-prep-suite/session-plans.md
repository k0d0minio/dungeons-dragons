# Stub: Lazy-DM session plans

- feature-slug: session-plans
- sequence: 3 of 5
- depends-on: npc-roster, locations-handouts
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-research.md §4

Per-session prep following the Lazy DM structure the research recommends: a
**strong start** (one paragraph), a checklist of **potential scenes**, a list of
**secrets & clues** (~10 one-liners, checkable off as they're dropped in play),
**treasure** to hand out, and links to the campaign's NPCs, locations, and
encounters relevant that night. Everything is the DM's own words. Checkable
items must be tappable mid-session on a phone without ceremony.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-prep-suite/session-plans.md` and the epic's `breakdown.md`. Add
campaign-scoped session plans (DM-gated): schema and CRUD for the five sections
in the stub, with secrets/clues and scenes as orderable, checkable items
(persisted state, additive nullable migrations), and pickers linking existing
NPCs/locations/encounters. One-thumb usable during play: large targets, check
off a secret in one tap. PR on a `claude/` branch; CI green only.
