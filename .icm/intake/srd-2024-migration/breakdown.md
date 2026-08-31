# Epic: srd-2024-migration — the 2024 rules foundation

- priority: P1
- sources: .icm/docs/2026-08-29-first-campaign-direction.md, .icm/docs/2026-08-29-first-campaign-research.md

## What was understood

Jamie decided (2026-08-29) the group learns the **2024 rules**. Today the app is
built on SRD 5.1 / 2014: reference data proxied from `dnd5eapi.co` (characters
store its index strings), hardcoded class/condition tables in
`src/lib/characters/rules.ts` (~741 LOC), and 11 markdown rules chapters in
`docs/rules/` that double as the AI's implementation reference and the user-facing
`/rules/*` pages (D29). This epic replaces that baseline with **SRD 5.2.1**
(CC-BY-4.0), superseding register decisions D11 (5.1 wins) and D18 (say "race").

Licensing rails (see the research brief): only SRD 5.2.1 content may ship as app
data — 12 classes with exactly one subclass each, 9 species, 4 backgrounds, 16
feats, ~400 spells, the 2025 Monster Manual SRD monsters. The attribution
statement must be updated to the 5.2.1 wording. Non-SRD content (other subclasses,
adventure text) never enters the data layer.

Rules mechanics that change: backgrounds grant ability scores + an Origin feat;
species grant traits only; every class gets its subclass at level 3; weapon
mastery for martials; exhaustion is a cumulative −2 to d20 tests; heroic
inspiration; one spell-slot-expending spell per turn.

Constraint: production migrations run in parallel with the Vercel deploy — every
schema change must be **additive and nullable**.

## Build order

1. `srd-data-layer` — SRD 5.2.1 content as data; attribution updated.
2. `rules-engine-2024` — the hardcoded tables and derived-stat logic move to 2024.
3. `character-model-migration` — schema for backgrounds, subclasses, mastery,
   inspiration; the 2014 prototype characters are deleted (D42).
4. `rules-chapters-2024` — the 11 chapters rewritten to the 2024 baseline.
5. `asi-and-feats` — ASI/feat grants at levels 4/8/12/16/19 in the level planner.
6. `long-tail-reference-data` — the reference browser's spells, monsters and magic
   items leave SRD 5.1, and the 2014 proxy is retired whole.

Downstream epics (`guided-creation`, `dm-prep-suite`) block on 1–3. Run this epic
first in the program.

> Amended 2026-08-30 (`srd-data-layer` shipped): `dnd5eapi.co`'s `/api/2024` namespace
> covers the creation sets but has **no spells endpoint** and 3 of 300+ monsters
> ([coverage assessment](../../docs/2026-08-30-dnd5eapi-2024-coverage.md)), so the long
> tail could not move with the data layer. It became stub 6, `long-tail-reference-data`,
> and the SRD 5.1 attribution stays in the footer alongside the 5.2.1 one until that stub
> and `rules-chapters-2024` have both landed.

> Amended 2026-08-29 (`/project` re-run, tech/data lenses): SRD content ships as
> **local JSON data modules** — no DB seed mechanism exists, and TS modules would
> distort the jest coverage ratchet (exclude data dirs from `collectCoverageFrom`).
> The 2014 `/api/dnd5e` namespace is **retired, never repointed** — its responses sit
> behind an 8-day CDN/Data-Cache layer, so changing an endpoint's meaning in place
> can mix rulesets mid-session (D31). Reference data endpoints stay public and
> CDN-cached under D34; pages are what the sign-in wall protects.

> Amended 2026-08-30 (`rules-engine-2024` shipped): the class **progression tables** the
> SRD prints only inside each class's Features table — spell slots, prepared spells,
> cantrips, weapon mastery counts — are transcribed into `src/lib/characters/rules.ts`,
> because `/api/2024/classes/{index}/levels` is a 404 upstream and there is nothing to
> proxy. Everything the SRD data layer already holds (hit dice, saves, skill lists,
> subclasses, conditions, masteries) is read from `src/lib/srd/` rather than restated.
> The engine now carries three pieces with **no column behind them yet** —
> `abilityScoresWithBackground`, `HEROIC_INSPIRATION`, `weaponMasteryCount` — which is
> what stub 3 (`character-model-migration`) wires up; `featuresUpTo` already takes a
> subclass index and the level planner passes the class's only SRD subclass until that
> column exists. The dead `/api/dnd5e/classes/[index]/levels` proxy route and its
> `useClassLevels` hook went with the planner that used them, ahead of stub 6.

> Amended 2026-08-30 (`character-model-migration` shipped): the `characters` table now
> carries the 2024 build — `background_index`, `background_ability_spread`,
> `background_abilities`, `origin_feat_index`, `subclass_index`,
> `mastered_weapon_indexes` and `heroic_inspiration` — all nullable with no default, per
> the parallel-deploy constraint, in `drizzle/0008_2024-character-fields.sql`. Two of the
> three engine pieces left dangling by stub 2 are wired: `weaponMasteryCount` bounds the
> mastery picker and the server-side trim, and `HEROIC_INSPIRATION` backs the sheet's
> flag. The third, `abilityScoresWithBackground`, deliberately still has no call site:
> the six score columns hold the character's *final* scores as typed (DND-008 takes
> direct entry), so applying a background's increases on top of them would inflate every
> derived number on the sheet. The columns record the choice; the flow that starts from
> base scores and applies it is `guided-creation/wizard-frame`. `featureGains` now reads
> `subclass_index`, falling back to the class's only SRD subclass.
>
> D42's deletion of the 2014 prototype characters is **not** in the migration — it is
> one-off SQL in the PR description for Jamie to run, because a `DELETE` inside a
> migration would fire again on every fresh environment.

> Amended 2026-08-30 (`rules-chapters-2024` shipped): all eleven chapters in `docs/rules/`
> are rewritten to SRD 5.2.1, and the `**2024 note:**` blockquotes are inverted into
> `**Changed from 2014:**` ones — the 2024 rule is now the body text and the note is
> orientation for someone who learned the old rules. Slugs are unchanged, so the sheet's
> ConditionsCard deep links and the `/rules/*` routes still resolve. Numbers the chapters
> print are taken from `src/lib/srd/data/` and `src/lib/characters/rules.ts` wherever the
> repo already holds them — the weapon tables in chapter 08 are generated from
> `weapons.json`, and the slot, prepared-spell, cantrip and weapon-mastery tables in
> chapter 04 are the engine's. The `src/`-side 2014 copy went with them: the chapter
> blurbs in `src/lib/rules/chapters.ts`, the intro on `src/app/rules/page.tsx`, and the
> `docs/rules/README.md` baseline and licence sections. The `API: /api/2014/...` pointers
> are gone from the chapters entirely — they were code-shaped notes on a player-facing
> page, pointing at a namespace stub 6 retires; the README now routes an AI session to
> `src/lib/srd/` instead.
>
> Two things deliberately left alone. The **SRD 5.1 attribution stays in the footer and
> the repo README**, because the reference browser still proxies 5.1 spells, monsters and
> magic items — it comes out with stub 6, not this one; the README's 5.1 clause now names
> only the proxy, not `docs/rules/`. And the **weapon-proficiency enumerations in
> `src/lib/srd/data/classes.json`** look like upstream 2014 leftovers — the rogue's lists
> Longswords, which has neither Finesse nor Light, and the monk's enumerates Scimitars,
> Shortswords and Hand Crossbows rather than the Light-property rule. The chapters state
> the 2024 rule; correcting the generator's mapping belongs with whoever next touches
> `scripts/srd/build-srd-data.mjs`.

> Amended 2026-08-30 (`long-tail-reference-data` shipped): stub 6 is done; `asi-and-feats`
> is the epic's last open stub. Upstream
> was **re-probed before choosing a route** and had not moved — `/api/2024/spells` is
> still a 404 and still absent from the `/api/2024/` index, and `/api/2024/monsters`
> still holds 3 — so the stub's second route was taken: the long tail is **imported
> locally**, not proxied from a new namespace. Spells (339) and monsters (331) come from
> **Open5e's `srd-2024` document** ("System Reference Document 5.2" by Wizards of the
> Coast, CC-BY-4.0), which dnd5eapi has no equivalent of; magic items (262) and the
> equipment table (182) come from dnd5eapi's `/api/2024`, which does carry them. The
> generator now reads two upstreams and asserts the document on every Open5e row, so a
> Kobold Press creature cannot arrive by accident.
>
> `/api/dnd5e/*` and `src/lib/dnd-api/` are **deleted**, not repointed (D31). What
> replaces them is smaller: two route handlers under `/api/srd/{collection}[/{index}]`
> over a registry, serving only the long tail. Classes and species are read straight out
> of `src/lib/srd/` by the components that need them — `rules.ts` already puts
> `classes.json` in the client bundle for the sheet, so fetching them over HTTP as well
> would have shipped the same JSON twice. The 2014 `/classes/{index}/spells` endpoint
> became `?class=` on the spell list rather than a route of its own.
>
> Four upstream corrections were added to the eleven the data layer already carried:
> Greater Invisibility (Open5e ships it with a null description), Hide Armor (filed under
> light armour upstream while carrying the medium AC rule), the Luckstone's slug (arrives
> as `stone-of-good-luck-(luckstone)`, which is not a URL segment), and each spell's own
> damage row (upstream's `casting_options` carry only the *higher* slots, so casting
> Fireball at 3rd would have shown no damage at all). The **SRD 5.1 attribution is gone**
> from the footer, the README and the register, in this same change.
>
> One thing picked up that stub 6 did not ask for: `rules-chapters-2024` left the
> **weapon-proficiency enumerations in `classes.json`** to "whoever next touches
> `scripts/srd/build-srd-data.mjs`", and this ticket both touched it and made the field
> more visible (the class detail view renders those proficiencies as badges). The Rogue's
> upstream list was genuinely wrong — it included Longswords, whose only property is
> Versatile — so both the Monk's and the Rogue's are now the SRD's own sentence
> ("Martial weapons that have the Light property") rather than a list that can go stale.
>
> Two things worth knowing downstream. Monster indexes moved with the ruleset — 2024
> publishes `goblin-warrior`, `goblin-minion` and `goblin-boss` where 2014 had `goblin` —
> so an encounter still holding a 2014 index resolves to `null` and is *named as
> unpriced* rather than counted as zero (DND-055's existing behaviour). And no schema
> changed: this ticket is data and transport only.
