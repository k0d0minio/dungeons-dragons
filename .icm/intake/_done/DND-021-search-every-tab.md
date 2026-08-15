# DND-021 · Make search reach every tab, and say something when it finds nothing

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P1 |
| Size | M |
| Sources | ux lens · product lens · copy lens (all three independently) · `src/app/page.tsx:52-54,172,189-200,230,270` |

## Problem

Three defects in the reference browser, all in `src/app/page.tsx`, all hitting the same
promise — "look up any spell, monster or item in under ten seconds".

**Search silently ignores two of the five tabs.** `searchQuery` is applied to spells,
equipment and monsters only (`page.tsx:52-54`). On the Classes and Races tabs the query is
ignored entirely — `classes.slice(0, 12)` at `:230` and `races.slice(0, 12)` at `:270` never
reference it. Type "Wizard" on the Classes tab and the unfiltered list just sits there.
Nothing on screen says so; the placeholder reads "Search spells, equipment, monsters..."
(`:83`) and vanishes the moment you type.

**A search that matches nothing renders nothing.** The `.map()` at `:189-200` (and again at
`:309-324`, `:352-368`) has no empty branch, so a mistyped spell name mid-fight produces a
blank box under a card header, with no words at all. The spell picker already does this
right — `src/components/characters/spell-picker.tsx:142` renders `No spell matches "…"`.

**The counts lie.** Unsearched, the heading reads "Spells (319)" (`:172`) above six cards
(`:52` — `spells.slice(0, 6)`), with no pagination and nothing explaining the truncation.
Same at `:252` vs `:270` for races. A player reasonably concludes the thing they want is not
in there.

Cold-load makes the last one worse: the counts render `.length` of an SWR array that is `[]`
until the fetch resolves (`swr-hooks.ts:107` — `spells: data?.results || []`), so the first
paint at a table announces "0 Spells", with the spinner *below* the heading that already
claimed zero (`:179`).

## Acceptance

- [ ] Search filters all five tabs, including Classes and Races
- [ ] A no-match state renders real copy naming what was searched for
- [ ] Loading state is distinguishable from empty — no heading claims "0" while data is in flight
- [ ] Headings do not claim a count the list below does not show, whether by paginating,
      showing more, or saying plainly that the list is truncated
- [ ] The search placeholder describes what search actually covers
- [ ] CI green

## Prompt

Fix reference search in the D&D 5e Companion. It is the half of the app that has to answer a
question in under ten seconds at a table, and it currently fails three different ways — all
in `src/app/page.tsx`.

**Search ignores two tabs.** `searchQuery` is wired to spells, equipment and monsters only
(`page.tsx:52-54`); Classes at `:230` and Races at `:270` render `.slice(0, 12)` of the
unfiltered list and never look at the query. Make search work across all five, and update the
placeholder at `:83` so it stops naming only three of them.

**No-match renders silence.** The `.map()` calls at `:189-200`, `:309-324` and `:352-368`
have no empty branch, so a typo produces a blank box. There is already a good pattern for
this in the repo — copy the shape of
`src/components/characters/spell-picker.tsx:142`, which names the failed query back to the
user.

**Counts contradict the list.** The heading at `:172` says "Spells (319)" above six cards.
Decide how to resolve it — paginate, show more on scroll, or state the truncation — and apply
the same answer to all five tabs. Related: those counts read `.length` of an SWR array that
is `[]` while loading (`src/lib/dnd-api/swr-hooks.ts:107`), so a cold load currently announces
"0 Spells" above a spinner. Distinguish loading from empty.

Scope boundary: this ticket is about search *behaviour* and *states*. The layout problems on
the same page — the hero pushing search below the fold, the five-tab bar breaking at 320px —
are DND-022. Both touch `src/app/page.tsx`, so check whether DND-022 has landed and rebase
rather than fighting it.

Read `.icm/intake/DND-021-search-every-tab.md` and `.icm/project.md` for context. Open a PR on
a `claude/` branch; do not run local checks — CI is the source of truth.
