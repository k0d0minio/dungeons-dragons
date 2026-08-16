# DND-061 · Subclasses and ability-score improvements — the model's biggest gap

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P1 |
| Size | L |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `.icm/project.md` (open questions, D15) · `src/components/characters/level-up-planner.tsx:445` · `src/lib/db/schema.ts` |

## Problem

Every 5e character picks a subclass by level 3, and every class hits ability-score
improvements at 4, 8, 12, 16 and 19. The app models neither. The level-up planner says
it out loud — "Subclass features are not tracked yet — check your subclass in the
rulebook" (`level-up-planner.tsx:445`) — and deliberately filters subclass feature rows
*out* of the what-you-gain list. ASI levels pass in silence: nothing prompts a score
raise, and scores are only reachable through the separate build-edit form. The register
already carries this as an open question: *do the characters at the actual table fit SRD
5.1 fields — no subclasses, no feats?*

The moment any character at the table reaches level 3, the answer stops being
theoretical: their sheet is missing real features (a Life cleric's Disciple of Life, a
Champion's Improved Critical), and by level 4 their scores are wrong unless they
remember to visit the edit form unprompted.

Scope honesty: SRD 5.1 ships exactly **one** subclass per class, so the data is small
and dnd5eapi serves it — but subclass-driven *mechanics* (Eldritch Knight's third-caster
slots being the register's own example) do not fit the current derivation model, and
feats barely exist in the SRD (Grappler, alone). This ticket proposes the tractable core
and names what stays out.

## Decision — Jamie

First, the open question: **will the table's characters use subclasses beyond what SRD
5.1 carries?** If they play with full-book subclasses (Gloom Stalker, Hexblade…), the
API has no data for them and this becomes a homebrew-fields problem — a different,
bigger ticket. Then:

- [ ] **SRD subclasses + ASI prompts.** A nullable `subclass_index` column, chosen at
      the level the class grants it (planner prompts); subclass feature rows stop being
      filtered from the what-you-gain list; ASI levels prompt "+2 / +1+1" score raises
      inside the planner. Casting-model changes from subclasses (Eldritch Knight /
      Arcane Trickster slots) stay **out** — the existing manual slot adjustment covers
      them, and the planner says so. Feats stay out entirely.
- [ ] **ASI prompts only.** The scores-go-stale problem is the sharper edge; subclasses
      stay in the rulebook. Size M.
- [ ] **Free-text subclass label only.** A display-only field on the sheet so the sheet
      at least *names* the subclass; no features, no mechanics. Size S.
- [ ] **Kill.** The table's builds live on paper past level 2; the app stays a combat
      state tracker. `> Dropped:` and done.

## Acceptance

- [ ] (Full scope) levelling through a subclass level prompts the choice from the
      class's SRD subclass(es); the sheet shows the subclass and its gained features
- [ ] ASI levels prompt in the planner, apply to scores, and every derived number
      (modifiers, saves, skills, spell DC, prepared limits) follows — no new derivation
      exceptions
- [ ] What's out is written down where users meet it: the planner states that
      subclass casting changes and feats are not modelled
- [ ] Migrations additive and nullable; existing characters unaffected until edited
- [ ] CI green

## Prompt

Jamie has answered the roster question and picked a scope in the Decision section of
`.icm/intake/DND-061-subclasses-and-asi.md` — read it, plus `.icm/project.md` (note D15:
multiclassing stays out regardless). If killed, `git mv` to `_done/` with a
`> Dropped:` line and stop.

The planner is `src/components/characters/level-up-planner.tsx` with logic in
`src/lib/characters/level-up.ts` — it already fetches `/api/dnd5e/classes/[index]/levels`
and filters `row.subclass` rows out; the full scope inverts that filter once a subclass
is chosen. Subclass data comes from dnd5eapi's `subclasses` resource — a new proxy route
following the DND-020 caching pattern. `subclass_index` is additive and nullable next to
`class_index` (`src/lib/db/schema.ts`). ASI application writes scores through the same
path the build form uses, and everything derived must recompute — check the skills,
saves and spell-DC math in `src/lib/characters/`. Open a PR on a `claude/` branch; CI is
the source of truth.
