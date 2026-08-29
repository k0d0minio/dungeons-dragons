# Stub: SRD 5.2.1 data layer replaces the 2014 sources

- feature-slug: srd-data-layer
- sequence: 1 of 4
- depends-on: none
- priority: P1
- size: L
- sources: .icm/docs/2026-08-29-first-campaign-research.md §2

Replace the app's 2014 reference data with SRD 5.2.1 content. Creation-critical
sets ship as **local data** (the register's own doctrine: "a saving throw bonus is
not something to wait on a network round trip for"): 9 species, 4 backgrounds, 12
classes + their one SRD subclass, conditions, weapons with mastery properties, and
a curated beginner spell subset. Long-tail lookup content (full spell list,
monsters, magic items) may stay proxied **only if** a 2024-coverage API proves
adequate — assess `dnd5eapi.co`'s 2024 endpoints first; otherwise import an open
SRD 5.2.1 dataset locally. Update the attribution to the 5.2.1 CC-BY statement.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/srd-2024-migration/srd-data-layer.md`, the epic's `breakdown.md`, and
`.icm/docs/2026-08-29-first-campaign-research.md` (§2 lists exactly what SRD 5.2.1
contains and the required attribution wording). Then: (1) assess whether
dnd5eapi.co exposes adequate 2024/SRD-5.2 endpoints; record the finding in the PR
description. (2) Ship SRD 5.2.1 creation-critical content (species, backgrounds,
classes + one subclass each, conditions, weapons with mastery) as local typed data
under `src/lib/dnd-api/` or a new `src/lib/srd/`, keeping the existing proxy
pattern only for long-tail content with an adequate 2024 source. (3) Replace the
SRD 5.1 attribution with the 5.2.1 statement (verbatim from the research brief) in
the app footer/about surface and README. Never include non-SRD content. Schema
changes, if any, must be additive and nullable. Code goes through a PR on a
`claude/` branch; CI is the only evidence of green.
