# First-campaign direction — planning Q&A record (2026-08-29)

> The decision record behind the six first-campaign epics cut on 2026-08-29. Every
> answer below is Jamie's, given through a structured Q&A in that planning session.
> Companion research: [2026-08-29-first-campaign-research.md](2026-08-29-first-campaign-research.md).
> The next `/project` run should reconcile `.icm/project.md` against this document.

## The goal

Jamie's group of 5–6 friends — all brand-new to D&D — create their characters,
learn how the game works and what their choices do in play, and Jamie (the DM)
preps and runs a first campaign from a published starter box with the app holding
his prep. The interface is simplified and rebuilt on Apple HIG structure and norms,
keeping the D&D theming but subtle.

## Jamie's decisions (Q&A, 2026-08-29)

| Topic | Decision |
|---|---|
| Rules edition | **Migrate to the 2024 rules** (SRD 5.2.1, CC-BY-4.0). Asked twice: first answer was "stay on 2014", reversed after the research landed (starter set, print material, and tutorials the group will meet are all 2024). |
| Character creation | **Guided + escape hatch** — vibe quiz recommends class/species/background, defaults accepted one tap at a time; an advanced toggle exposes the full SRD choice lists. |
| Learning mechanisms | **All four**: inline "in play" notes on every pick · live-play roll walkthroughs · a learn-to-play section · glossary popovers on rules terms. |
| Turn coaching depth | **Walkthroughs only** — tap an attack/spell/check for what-to-roll guidance. No turn-aware "you're up" mode. |
| Devices | **Phones at the physical table** only. No desktop layouts, no remote play. Mobile-first premise holds. |
| Front door | **Signed-in players land on their character** (or creation if none); the reference browser becomes a search-first Library; signed-out gets a welcome + sign-in. |
| Sheet | **Segmented + beginner mode** — Play / Spells / Gear / Me segments; advanced bits collapsed until relevant. |
| DM gating | **All four kinds**: DM-only tools (existing role gate) · reveal gates on content · feature gates per campaign · secret DM state. |
| Campaign source | **Published starter + own notes** — the box (research recommends *Heroes of the Borderlands*) is run from the book; the app holds Jamie's prep keyed to it. Adventure text is never encoded as app data. |
| Prep suite | **All four**: NPC roster with secrets · Lazy-DM session plans · encounter builder with difficulty budget · locations & handouts. |
| Session tools | **All four**: reveal controls · stat blocks in the tracker · DM rules crib · session log & recap. |
| Leveling | **Milestone** — resolves the register's open question. XP award UI is retired/hidden. |
| Visual identity | **Subtle fantasy** — Apple structure and restraint; D&D lives in a warm parchment-and-deep-red token palette, a display serif for headings only, thematic iconography. |
| Party size | **5–6 players** — encounter budgets, party glance, and table screen must handle 6 rows. |
| Sequencing | **All four streams are must-haves before session 1** — the epics are ordered, not scoped down. |

## Register items this direction touches (for the next `/project` reconcile)

- **D11** ("where the 2024 PHB differs, SRD 5.1 wins") — **superseded**: the
  baseline becomes SRD 5.2.1 / the 2024 rules.
- **D18** (the on-screen word is "race") — **superseded**: 2024 retires the term;
  the word becomes "species" (matching the existing `species_index` column).
- The **onboarding/tutorials kill** — **superseded** by the learn-to-play epic:
  the group is now the explicit audience, not experienced players.
- **D8** (no dice roller — physical dice are the point) — **stands**. Roll
  walkthroughs teach which physical dice to pick up; the app never rolls.
- Open question "XP or milestone" — **resolved: milestone**.
- "Not a campaign manager" (project.md scope line) — **narrowed**: the app becomes
  a campaign *companion* for one table; it still isn't a general-purpose campaign
  product.

## Program order across the six epics

1. **`srd-2024-migration`** — the data and rules foundation everything sits on.
2. **`apple-redesign`** — tokens and navigation can start in parallel; the sheet
   re-segmentation lands after the 2024 rules engine so it is done once.
3. **`guided-creation`** — needs the 2024 data layer and the new design system.
4. **`learn-to-play`** — weaves into the new sheet and wizard.
5. **`dm-prep-suite`** — needs 2024 monsters for the encounter builder.
6. **`dm-run-suite`** — needs the prep suite's entities to reveal.
