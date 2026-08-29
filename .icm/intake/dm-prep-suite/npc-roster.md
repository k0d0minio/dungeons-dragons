# Stub: NPC roster with a secret layer

- feature-slug: npc-roster
- sequence: 1 of 5
- depends-on: none
- priority: P2
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Per-campaign NPCs, DM-gated: a **public layer** (name, one-line description,
longer blurb — what players will eventually see) and a **DM-only layer**
(motivation, secrets, twist, stat reference, freeform notes). Text-first; an
image slot lands with `locations-handouts`' storage decision. Establishes the
revealable-entity pattern (`revealed_at`, null = hidden) that locations,
handouts, and reveal controls reuse — nothing is player-visible in this stub;
the reveal surface is `dm-run-suite/reveal-controls`.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/dm-prep-suite/npc-roster.md` and the epic's `breakdown.md`. Add
campaign-scoped NPCs: Drizzle schema (additive, nullable; public fields, DM-only
fields, `revealed_at` timestamptz null) in `src/lib/db/`, CRUD under the
DM-gated routes (`src/app/dm/campaigns/[id]/`), list + editor UI per the app's
design system, DM-only fields visually marked as secret. No player-facing
surface yet. Design the schema/queries so locations and handouts can share the
revealable pattern. PR on a `claude/` branch; CI green only.
