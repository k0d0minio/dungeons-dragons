# D&D 5e Rules Playbook

> Purpose: this repo's D&D 5th Edition rules playbook. It has two audiences at once —
> **players and DMs**, who read it in the app, and **Claude sessions** building helper
> tools in this codebase, who implement against it.
>
> **It is user-facing product content.** DND-053 shipped every chapter below as a page
> under `/rules` (indexed at `/rules`, rendered by `src/components/rules/rules-chapter.tsx`
> from the markdown in this directory, verbatim). Edit these files as though a player is
> reading them on a phone at the table, because one is: keep the prose about the *game*,
> and keep implementation detail — schema sketches, ticket numbers, "the sheet must…" —
> out of it. Notes for future Claude sessions belong in the ticket or the code, not here.

## What this is (and is not)

- **Is:** a precise, self-contained restatement of the 5e rules engine — mechanics
  written as testable statements with exact numbers, so helper features (character
  creation form DND-008, combat character sheet DND-009, encounter tools, the AI
  wizard) can be implemented and validated against it.
- **Is:** a DM companion — prep checklists, encounter math, improvisation heuristics,
  and a quick-reference "screen" for mid-session lookups.
- **Is not:** a replacement for the structured reference data. Entity data (every
  spell, monster, item…) lives in the public API this app already proxies; the playbook
  covers the *rules* that data plugs into.

## Ruleset baseline

Everything here is baselined on **SRD 5.1 (the 2014 5e rules)** — deliberately, because
that is exactly what [dnd5eapi.co](https://www.dnd5eapi.co) serves and what this app's
`/api/dnd5e/*` proxy exposes (see `src/app/api/dnd5e/`). Rules text and API data
therefore never disagree about which edition they describe.

Where the **2024 revision** (5.5e / SRD 5.2) changes a rule in a way a DM would notice,
files carry a short `**2024 note:**` blockquote — informational only; the 2014 rule is
the one this platform implements.

## Reading order / file map

Every file ships as a page; the "In app" column is its route. The chapter list that
drives those routes is `src/lib/rules/chapters.ts`, and the filename union that lets a
page load one is `src/lib/rules/load.ts` — a new chapter needs an entry in both.

| File | Covers | In app |
|---|---|---|
| [01-core-mechanics.md](01-core-mechanics.md) | The d20 engine: checks, saves, attacks, advantage, proficiency, DCs | `/rules/core-mechanics` |
| [02-abilities-and-skills.md](02-abilities-and-skills.md) | Six abilities, 18 skills, carrying, jumping, passive scores | `/rules/abilities-and-skills` |
| [03-character-creation.md](03-character-creation.md) | Creation pipeline, point buy, races, derived-stat formulas, leveling, multiclassing | `/rules/character-creation` |
| [04-classes.md](04-classes.md) | All 12 classes: stats, features by level, casting type, SRD subclass | `/rules/classes` |
| [05-combat.md](05-combat.md) | Full combat loop, actions, damage, death saves as a state machine | `/rules/combat` |
| [06-spellcasting.md](06-spellcasting.md) | Slots, prepared vs known, concentration, components, AoE, targeting | `/rules/spellcasting` |
| [07-conditions.md](07-conditions.md) | All 15 conditions + exhaustion, exact effects and interactions | `/rules/conditions` |
| [08-equipment.md](08-equipment.md) | Currency, armor/weapon tables, properties, magic items, attunement | `/rules/equipment` |
| [09-adventuring.md](09-adventuring.md) | Travel, rests, light/vision, hazards, social pillar, downtime | `/rules/adventuring` |
| [10-dm-guide.md](10-dm-guide.md) | Stat block anatomy, CR/XP, encounter building, treasure, session prep | `/rules/dm-guide` |
| [11-quick-reference.md](11-quick-reference.md) | DM screen in markdown: pure lookup tables + 20 fast dispute answers | `/rules/quick-reference` |

## How AI sessions should use this

1. **Implementing a rules-adjacent feature:** read the chapter covering it before
   writing code. Formulas in these files (AC, save DC, HP per level, point-buy costs,
   death-save transitions…) are the acceptance criteria — implement them exactly.
2. **Joining rules to data:** wherever a rule has a structured-data counterpart, files
   cite the API resource inline, e.g. (`API: /api/2014/spells`). Those paths are
   dnd5eapi.co resources, reachable through this app's proxy at
   `/api/dnd5e/api/2014/...`. Prefer fetching entity data over hardcoding it; use the
   playbook for the rules that consume it.
3. **Answering rules questions:** quote [11-quick-reference.md](11-quick-reference.md)
   for speed; fall back to the topical file for nuance; each topical file ends with a
   "Common table rulings" section for the genuinely contested calls. When rules and a
   DM's ruling conflict, the DM wins — say so.
4. **Editing a chapter:** it is a live page, so write for the player reading it. Keep the
   style contract — SRD-safe content only, exact numbers, tables for numeric data,
   `**2024 note:**` blockquotes for revision deltas — and keep code-shaped notes out.
   New files continue the `NN-slug.md` numbering; register them in the table above,
   in `src/lib/rules/load.ts`, and in `src/lib/rules/chapters.ts`, then add the page.

## Licensing & attribution

This playbook restates game rules from the **System Reference Document 5.1** by Wizards
of the Coast LLC, available at <https://dnd.wizards.com/resources/systems-reference-document>
and licensed under the **Creative Commons Attribution 4.0 International License**
(<https://creativecommons.org/licenses/by/4.0/legalcode>).

It deliberately contains **no Product Identity** — no non-SRD subclasses, feats,
monsters, named characters, or settings. Keep it that way: anything outside the SRD
stays out of this repo and belongs at the table, not in git.
