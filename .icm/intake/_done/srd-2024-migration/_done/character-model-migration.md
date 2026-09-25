# Stub: Character model gains the 2024 fields

- feature-slug: character-model-migration
- sequence: 3 of 6
- depends-on: rules-engine-2024
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Schema work for 2024 characters: background, origin feat, subclass, weapon-mastery
selections, heroic inspiration. All columns **additive and nullable** (the
production migrate job runs in parallel with the Vercel deploy — a NOT NULL add is
an outage window). The 2014-era prototype characters are **deleted** (Jamie's
decision D42, 2026-08-29) — no legacy mode, no conversion, no backfill story. The
`species_index` column already has the right name; the UI word becomes "species"
(D32).

> Amended 2026-08-30 (`rules-engine-2024` shipped): the rules side of three of these
> columns is already written and tested, waiting only for somewhere to read from —
> `abilityScoresWithBackground(base, backgroundIndex, spread, abilities)` for the
> background's ability score increases, `HEROIC_INSPIRATION` for the flag's shape, and
> `weaponMasteryCount(classIndex, level)` for how many mastery properties a character
> may hold. `featuresUpTo(classIndex, subclassIndex, level)` already takes a subclass
> index; the level planner passes the class's only SRD subclass, and that is the single
> call site to point at the new column.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/character-model-migration.md` and the epic's
`breakdown.md`. The 2024 rules engine (`rules-engine-2024` stub) is in place. Add
the character columns for background, origin feat, subclass, weapon-mastery
choices, and heroic inspiration via Drizzle migrations in `drizzle/` — additive
and nullable only. Wire them through `src/lib/db/` data access and the character
form/sheet as plain fields (no new UI flows — the wizard is the
`guided-creation` epic). Delete the pre-existing 2014 prototype characters per D42
(a one-off script or SQL in the PR description, run by Jamie — confirm the list
with him before deletion; do not delete user accounts). Rename user-facing "race"
strings to "species" — the copy lens mapped every occurrence: `src/app/page.tsx`,
`character-form.tsx`, `characters/page.tsx`, `src/lib/rules/chapters.ts`,
`race-detail.tsx`, `reference-lookup-sheet.tsx`, `README.md`. PR on a `claude/`
branch; CI green only.
