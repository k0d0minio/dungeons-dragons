# DND-045 · Magic items in reference lookup

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | S |
| Sources | product lens · `src/app/api/dnd5e/` · `src/components/reference/reference-detail-sheet.tsx:17` |

## Problem

The v1 bar says "look up any spell, monster or **item** in under ten seconds". Item currently
resolves to the mundane equipment list only — a rope, a longsword, a set of thieves' tools. Search
for a Bag of Holding or a +1 longsword and there is nothing, because magic items are a separate
dnd5eapi.co resource with no proxy route.

Routes exist only for spells, classes, races, equipment and monsters (`src/app/api/dnd5e/`), and
`ReferenceType` at `reference-detail-sheet.tsx:17` has five members to match.

This is the cheapest genuine widening of the reference browser available: the upstream resource
exists, the proxy pattern is established, the card and detail-sheet components are generic, and
the tab bar already exists. It is listed last among the P2s because nothing is broken — the app
simply does slightly less than its own description claims.

Sequencing note: this adds a sixth tab to a bar that DND-022 is already rebuilding because five do
not fit at 320px. Land after it, or the tab problem gets worse before it gets better.

## Acceptance

- [ ] Magic items are searchable and browsable alongside the other reference types
- [ ] A magic item's detail view shows rarity, attunement requirement and its description
- [ ] The proxy route follows the caching and validation pattern DND-020 established
- [ ] The tab bar still works at 320px with the extra category
- [ ] CI green

## Prompt

Add magic items to the D&D 5e Companion's reference browser. The app promises "look up any spell,
monster or item in under ten seconds" but only serves mundane equipment — a Bag of Holding or a +1
longsword returns nothing.

Magic items are a separate resource on dnd5eapi.co with no route in this app. Add the proxy route
under `src/app/api/dnd5e/`, following the shape of the existing handlers — and **follow the
caching and `[index]` validation pattern DND-020 established**, rather than the older uncached
shape the existing files were written in. Check what DND-020 actually did before copying anything.

On the client, `ReferenceType` at `src/components/reference/reference-detail-sheet.tsx:17` has
five members; add the sixth. The reference card and detail-sheet components are generic, so most
of the work is the route, the hook in `src/lib/dnd-api/swr-hooks.ts`, and a detail view — model it
on `src/components/reference/equipment-detail.tsx`. Magic items carry rarity and attunement
requirements that mundane equipment does not, so the detail view needs a little more than a
straight copy.

**Sequencing:** this adds a sixth tab to a bar that already does not fit at 320px — DND-022 is
rebuilding it for exactly that reason. Land after DND-022, and make sure whatever it chose still
works with six. Search behaviour across tabs is DND-021; if it has landed, the new tab must honour
the query the same way (it must not repeat the Classes/Races bug of ignoring search entirely).

Read `.icm/intake/DND-045-magic-items.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
