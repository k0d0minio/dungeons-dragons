# Is dnd5eapi.co an adequate SRD 5.2.1 source? (2026-08-30)

> Assessment commissioned by `srd-2024-migration/srd-data-layer`, which asks whether the
> long-tail reference content can stay proxied. Probed live on 2026-08-30 against
> `https://www.dnd5eapi.co/api/2024/`.

**Verdict: adequate for creation-critical content, not adequate for the long tail.**
Species, backgrounds, classes, subclasses, conditions, equipment and the mastery tables
are all present and transcribed from SRD 5.2.1. The three sets the reference browser
actually exists to serve — **spells, monsters and class level tables** — are missing or
all but empty. So: creation-critical content ships local (which the ticket asked for
anyway), and the 2014 `/api/dnd5e/*` proxy stays where it is rather than being repointed
at a 2024 namespace that cannot answer.

## What exists

`/api/2024/` is a real namespace: the API root redirects to `/api/2014/`, and `/api/2024/`
returns its own index of twenty-three collections, of which these are populated and 5.2.1-shaped:

| Collection                   | Count | Notes                                                       |
| ---------------------------- | ----- | ----------------------------------------------------------- |
| `species`                    | 9     | Traits only, no ability scores — correctly 2024             |
| `subspecies` (lineages)      | 24    | Level-gated traits (Drow's Faerie Fire at 3)                |
| `backgrounds`                | 4     | Ability scores, Origin feat, skills, equipment              |
| `classes`                    | 12    | Hit die, saves, skill choices, starting equipment           |
| `subclasses`                 | 12    | Exactly one per class, with full feature text by level      |
| `features`                   | 232   | Class **and** subclass features, `subclass` field to sort   |
| `conditions`                 | 15    | Includes 2024 cumulative Exhaustion                         |
| `feats`                      | 17    | 4 Origin, fighting-style, ASI, Epic Boons                   |
| `equipment`                  | 182   | Weapons carry `mastery`                                     |
| `weapon-mastery-properties`  | 8     | Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex           |
| `weapon-properties`          | 10    | 2024 wording                                                |
| `magic-items`                | 262   | 5.2.1 text, incl. the SRD renames                           |

## What does not

- **`spells` — no endpoint at all.** `/api/2024/spells` is 404 and `spells` is absent from
  the `/api/2024/` index. All ~400 SRD 5.2.1 spells are missing. `/api/2014/spells` has
  319. This alone settles it: the reference browser's most-used type has no 2024 source.
- **`monsters` — 3 of 300+.** `aboleth`, `adult-black-dragon`, `adult-blue-dragon`: an
  alphabetical prefix, i.e. an import that stopped. `/api/2014/monsters` has 334.
- **Class level tables — advertised, 404.** Every class payload carries
  `"class_levels": "/api/2024/classes/{index}/levels"`, and every one of those URLs is a
  404. No proficiency-bonus table, no features-by-level table, no spell-slot progression.
- **`rules` / `rule-sections` — absent.** Present under `/api/2014`, gone under `/api/2024`.

## Transcription errors found while building the local data

Cross-checked against the SRD 5.2.1 PDF (`SRD_CC_v5.2.pdf`, 361pp). Eleven corrections,
each carried in `scripts/srd/build-srd-data.mjs` and asserted in `src/lib/srd/data.test.ts`:

- **Weapons (9 of 38 rows wrong).** Dart 5 GP → **5 CP**; Hand Crossbow 25 GP → **75 GP**
  and 2 lb → **3 lb**; Javelin 5 GP → **5 SP**; Longbow 5 GP → **50 GP**; Spear 5 GP →
  **1 GP** and 2 lb → **3 lb**; Mace 2 lb → **4 lb**; Pike 6 lb → **18 lb**; Sling
  Piercing → **Bludgeoning**; Trident 1d6 → **1d8** (versatile 1d8 → **1d10**).
- **Species sizes.** Tiefling `null`, Human `Medium`; the SRD gives both
  **"Medium or Small, chosen when you select this species"**.
- **Soldier's tool proficiency dropped** — the SRD's "Choose one kind of Gaming Set" is a
  choice upstream does not model, so the background arrived with no tool at all.
- **Charmed paraphrased** — "Advantage on ability checks to interact socially with you"
  for the SRD's "Advantage on any ability check to interact with you socially".

Also worth knowing: the four `simple|martial-melee|ranged-weapons` categories are
incomplete (the Longsword is absent from `martial-melee-weapons` while
`/equipment/longsword` lists that category). The `weapons` category is the complete list.

Against the SRD PDF, 828 of 855 long sentences in the generated data match **verbatim**;
the 27 that do not are upstream's own flattening of SRD tables into prose ("Choose 2:
Arcana, History, …") or PDF column-order artefacts, not rewritten rules.

## What this means for the app

1. **Creation-critical content is local** — `src/lib/srd/`. Not a fallback position: a
   saving throw bonus is not something to wait on a network round trip for, and upstream
   being wrong on 9 of 38 weapon rows is the argument for owning a checked copy.
2. **The 2014 proxy is not repointed and not retired.** Repointing would mix rulesets
   behind an 8-day CDN window (D31); retiring it today would delete spells, monsters and
   magic items from the app with nothing to replace them. It keeps serving SRD 5.1, and
   the footer keeps the 5.1 attribution alongside the 5.2.1 one for exactly as long.
3. **Re-check upstream before the long-tail tickets.** If `/api/2024/spells` and a full
   `/api/2024/monsters` land, a new `/api/dnd5e-2024/*` namespace becomes the cheap
   option. If they do not, importing an open SRD 5.2.1 dataset locally is the fallback the
   epic already names — and either way the 2014 namespace is retired whole, never
   repointed.
