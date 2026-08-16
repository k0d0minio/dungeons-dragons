# DND-053 · Ship the nine rules chapters already sitting in the repo

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | feature |
| Priority | P1 |
| Size | S |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `docs/rules/` · `src/lib/rules/load.ts` · `src/app/rules/` |

## Problem

The app's "understanding" half is thinner than the repo it ships from. `docs/rules/`
holds eleven finished SRD 5.1 chapters (~200 KB of prose — core mechanics, abilities and
skills, combat, spellcasting, equipment, adventuring, a DM guide…); exactly two are
rendered in-app (`/rules/conditions`, `/rules/quick-reference`), and
`src/lib/rules/load.ts` literally types its input as those two filenames. There is no
`/rules` index page — the only ways in are two chips on the homepage and the ⓘ links from
the conditions card.

Everything expensive already exists: the markdown, the renderer, the static-page pattern,
the anchor scheme, the CC-BY attribution (DND-017). This is the cheapest genuine widening
of the app left. The one honest counterpoint: `docs/rules/README.md` declares the
playbook "**not** user-facing product content", written to be read by AI — so shipping it
reverses a stated stance, and the prose was written for precision, not for a player
reading on a phone. Some chapters may need a tone pass; some (the DM guide) may not
belong in a player's face at all.

## Decision — Jamie

- [ ] **Ship the player-relevant set** — core mechanics, abilities & skills, combat,
      spellcasting, equipment, adventuring — plus a `/rules` index page listing all
      chapters. DM guide and character-creation/classes chapters stay repo-only.
- [ ] **Ship everything**, DM guide included (it's SRD-derived; the reference browser is
      public anyway).
- [ ] **Index page only** — no new chapters, just make the two existing ones findable.
- [ ] **Kill.** The playbook stays an internal knowledge base per its README.
      `> Dropped:` and done.

## Acceptance

- [ ] `/rules` exists and lists every shipped chapter; the homepage links to it
- [ ] Each shipped chapter renders with the existing `RulesChapter` pattern, anchors and
      cross-links intact, readable on a phone in dim light
- [ ] `docs/rules/README.md` is updated to match whatever stance was chosen
- [ ] SRD attribution still covers the new pages (check what DND-017 established)
- [ ] CI green

## Prompt

Jamie has picked which chapters ship in the Decision section of
`.icm/intake/DND-053-ship-remaining-rules-chapters.md` — read it, and `.icm/project.md`
for context. If killed, `git mv` to `_done/` with a `> Dropped:` line and stop.

Widen the union type in `src/lib/rules/load.ts`, add one static page per chapter under
`src/app/rules/` following the two existing pages, and build a `/rules` index. Skim each
chapter as you ship it: strip or rewrite anything that only makes sense to an AI reader
(implementation notes, ticket references), keep the `**2024 note:**` blockquotes. The
`sibling` cross-link prop won't scale past two pages — replace it with the index or a
chapter list. Open a PR on a `claude/` branch; CI is the source of truth.
