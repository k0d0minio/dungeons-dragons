# Stub: Character model gains the 2024 fields

- feature-slug: character-model-migration
- sequence: 3 of 4
- depends-on: rules-engine-2024
- priority: P1
- size: M
- sources: .icm/docs/2026-08-29-first-campaign-direction.md

Schema work for 2024 characters: background, origin feat, subclass, weapon-mastery
selections, heroic inspiration. All columns **additive and nullable** (the
production migrate job runs in parallel with the Vercel deploy — a NOT NULL add is
an outage window). Decide and implement the story for existing 2014-era
characters: none belong to the friends yet, so the cheap path is marking them
legacy/read-only rather than converting. The `species_index` column already has
the right name; the UI word becomes "species" (supersedes D18).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/character-model-migration.md` and the epic's
`breakdown.md`. The 2024 rules engine (`rules-engine-2024` stub) is in place. Add
the character columns for background, origin feat, subclass, weapon-mastery
choices, and heroic inspiration via Drizzle migrations in `drizzle/` — additive
and nullable only. Wire them through `src/lib/db/` data access and the character
form/sheet as plain fields (no new UI flows — the wizard is the
`guided-creation` epic). Handle pre-existing characters by marking them legacy
(read-only banner) unless a trivial conversion is possible; state the choice in
the PR. Rename user-facing "race" strings to "species". PR on a `claude/` branch;
CI green only.
