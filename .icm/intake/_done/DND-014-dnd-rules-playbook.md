# DND-014 · D&D 5e rules playbook (AI-facing knowledge base)

| | |
|---|---|
| Priority | P1 |
| Status | done — shipped on `claude/dnd-rules-playbook-75xyvs` |

## Prompt

Research and commit a running playbook of D&D 5e rules to the repo in markdown, under
`docs/rules/`. It serves the DM during campaign prep and in-session gameplay, helps
players understand the game, and — primarily — is a knowledge base to be read by AI:
Claude sessions implementing helper tools in this codebase (character creation DND-008,
combat sheet DND-009) and the platform's eventual AI wizard. It is not user-facing
product content; nothing in `src/` renders it.

Constraints:

- Baseline **SRD 5.1 (2014 rules)** so the playbook always agrees with the
  dnd5eapi.co data the app proxies at `/api/dnd5e/*`; mark 2024-revision deltas as
  short `**2024 note:**` blockquotes.
- **SRD-safe content only** (CC-BY-4.0, attribution in `docs/rules/README.md`); no
  Product Identity ever enters the repo.
- Rules written as exact, testable statements — formulas and tables are acceptance
  criteria for the tools built on them.
- Cross-reference structured data with inline `API: /api/2014/...` citations rather
  than duplicating entity data (spells/monsters/items) into markdown.

## Outcome

`docs/rules/` — a README (purpose, file map, AI-usage rules, licensing) plus eleven
topical files: core mechanics, abilities & skills, character creation, classes, combat,
spellcasting, conditions, equipment, adventuring, DM guide, and a quick-reference "DM
screen" with the 20 most common rules disputes answered. CLAUDE.md routing table points
`rules knowledge` tasks here.
