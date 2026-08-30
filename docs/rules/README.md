# D&D 5e Rules Playbook

> Purpose: this repo's D&D rules playbook, on the **2024 rules**. It has two audiences at once —
> **players and DMs**, who read it in the app, and **Claude sessions** building helper tools in
> this codebase, who implement against it.
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
  creation, the combat sheet, encounter tools, the guided builder) can be implemented
  and validated against it.
- **Is:** a DM companion — prep checklists, encounter math, improvisation heuristics,
  and a quick-reference "screen" for mid-session lookups.
- **Is not:** a replacement for the structured game data. Species, backgrounds, classes,
  subclasses, feats, conditions and weapons live as data in `src/lib/srd/`; the playbook
  covers the *rules* that data plugs into.

## Ruleset baseline

Everything here is baselined on **SRD 5.2.1** — the 2024 revision of D&D 5th edition,
released under CC-BY-4.0. That is the ruleset this table plays, and the one the app's
data layer ships in `src/lib/srd/`.

Where the 2024 rules changed something a player or DM coming from the 2014 rules would
otherwise get wrong, files carry a short `**Changed from 2014:**` blockquote. Those notes
are orientation for people who learned the old rules — the 2024 rule is always the one
stated in the body text and the one this platform implements.

## Reading order / file map

Every file ships as a page; the "In app" column is its route. The chapter list that
drives those routes is `src/lib/rules/chapters.ts`, and the filename union that lets a
page load one is `src/lib/rules/load.ts` — a new chapter needs an entry in both.

| File | Covers | In app |
|---|---|---|
| [01-core-mechanics.md](01-core-mechanics.md) | The D20 Test: checks, saves, attacks, advantage, proficiency, DCs, Heroic Inspiration | `/rules/core-mechanics` |
| [02-abilities-and-skills.md](02-abilities-and-skills.md) | Six abilities, 18 skills, carrying, jumping, passive scores | `/rules/abilities-and-skills` |
| [03-character-creation.md](03-character-creation.md) | The creation pipeline, backgrounds and Origin feats, the nine species, derived stats, levelling, multiclassing | `/rules/character-creation` |
| [04-classes.md](04-classes.md) | All 12 classes: stats, features by level, casting model, the SRD subclass, the shared slot and mastery tables | `/rules/classes` |
| [05-combat.md](05-combat.md) | The combat loop, the twelve actions, Unarmed Strikes, weapon mastery, death saves as a state machine | `/rules/combat` |
| [06-spellcasting.md](06-spellcasting.md) | Slots, preparation, Concentration, one slot per turn, components, areas of effect | `/rules/spellcasting` |
| [07-conditions.md](07-conditions.md) | All 15 conditions and the new Exhaustion, exact effects and interactions | `/rules/conditions` |
| [08-equipment.md](08-equipment.md) | Currency, armor and weapon tables with mastery properties, gear, magic items, attunement | `/rules/equipment` |
| [09-adventuring.md](09-adventuring.md) | Travel, rests, light and vision, hazards, traps, the Influence action, downtime | `/rules/adventuring` |
| [10-dm-guide.md](10-dm-guide.md) | Reading a 2024 stat block, the XP-budget encounter method, treasure, session prep | `/rules/dm-guide` |
| [11-quick-reference.md](11-quick-reference.md) | DM screen in markdown: pure lookup tables + 20 fast dispute answers | `/rules/quick-reference` |

## How AI sessions should use this

1. **Implementing a rules-adjacent feature:** read the chapter covering it before
   writing code. Formulas in these files (AC, save DC, HP per level, point-buy costs,
   death-save transitions…) are the acceptance criteria — implement them exactly.
2. **Joining rules to data:** the SRD 5.2.1 entity data — species, backgrounds, classes,
   subclasses, origin feats, conditions, weapons and their mastery properties — is local
   JSON under `src/lib/srd/data/`, read through the accessors in `src/lib/srd/`. The
   class progression tables the SRD only prints inside each class's Features table live
   in `src/lib/characters/rules.ts`. Prefer reading those over hardcoding a number a
   second time; use the playbook for the rules that consume them.
3. **Answering rules questions:** quote [11-quick-reference.md](11-quick-reference.md)
   for speed; fall back to the topical file for nuance; each topical file ends with a
   "Common table rulings" section for the genuinely contested calls. When rules and a
   DM's ruling conflict, the DM wins — say so.
4. **Editing a chapter:** it is a live page, so write for the player reading it. Keep the
   style contract — SRD-safe content only, exact numbers, tables for numeric data,
   `**Changed from 2014:**` blockquotes for the deltas worth flagging — and keep
   code-shaped notes out. The in-app renderer supports headings to `###`, paragraphs,
   single-paragraph blockquotes, flat lists, pipe tables, fenced code and inline
   emphasis; anything else renders as literal text. New files continue the `NN-slug.md`
   numbering; register them in the table above, in `src/lib/rules/load.ts`, and in
   `src/lib/rules/chapters.ts`, then add the page.

## Licensing & attribution

This playbook restates game rules from the **System Reference Document 5.2.1** by
Wizards of the Coast LLC, available at <https://www.dndbeyond.com/srd> and licensed under
the **Creative Commons Attribution 4.0 International License**
(<https://creativecommons.org/licenses/by/4.0/legalcode>). The exact attribution the
app displays is in `src/lib/srd/attribution.ts`.

It deliberately contains **no Product Identity** — no non-SRD subclasses, species, feats,
monsters, named characters, or settings. The SRD publishes exactly one subclass per class,
nine species and four backgrounds, and that boundary is the boundary of this directory.
Keep it that way: anything outside the SRD stays out of this repo and belongs at the table,
not in git.
