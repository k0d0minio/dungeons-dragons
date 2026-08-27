> Dropped: kill box exercised — decided by Jamie in the 2026-08-27 estate ticket audit: the app has not yet been played at a real table, so no observed friction backs this convenience; re-cut with evidence if a session proves it missing.

# DND-051 · Reference filters — find by what it *is*, not what it's called

| | |
|---|---|
| Status | blocked — decision Jamie's, see § Decision |
| Type | improvement |
| Priority | P2 |
| Size | M |
| Sources | value audit 2026-08-16 (`.icm/docs/2026-08-16-value-audit.md`) · `src/app/page.tsx` · `src/components/reference/reference-tab-panel.tsx` · `src/app/api/dnd5e/spells/route.ts` |

## Problem

Reference search is name-substring only. Every question a player actually asks mid-game
that isn't "show me the spell I already know the name of" is unanswerable: *what 2nd-level
concentration spells does my druid have? which monsters are CR 2? which magic items are
uncommon?* The ten-second bar was met for known names (DND-020/021/022) and never for
discovery.

The data is already on the client — the six lists are fetched whole and filtered in the
browser — so faceting is a pure client-side win, no API work. (The spells route's own
comment claims it "handle[s] URL parameters"; it takes none —
`src/app/api/dnd5e/spells/route.ts`. Fix the comment while in there.)

The cost is UI surface on a 320px screen that DND-022 fought hard to keep minimal. Filters
must fold away — chips or a filter sheet, not a permanent toolbar.

## Decision — Jamie

Which facets earn their screen space? (Tick any; each is roughly independent.)

- [ ] **Spells**: level, school, class, concentration, ritual — the highest-value set
- [ ] **Monsters**: CR range, type, size — mostly a DM-prep tool
- [ ] **Magic items**: rarity
- [ ] **Equipment**: category (weapon / armour / gear / tools)
- [ ] **None** — name search is the job; kill with a `> Dropped:` line

## Acceptance

- [ ] The ticked facets filter their tab, composable with the existing name search
- [ ] Collapsed by default; the browser looks unchanged until a filter is opened
- [ ] Still works one-handed at 320px; active filters are visible and one-tap clearable
- [ ] The cross-tab "Found in:" hint still behaves sensibly with filters active
- [ ] CI green

## Prompt

Jamie has ticked the facets to build in the Decision section of
`.icm/intake/DND-051-reference-filters.md` — read it, and `.icm/project.md` for context.
If none, `git mv` to `_done/` with a `> Dropped:` line and stop.

Filtering is client-side over the already-fetched lists —
`src/components/reference/reference-tab-panel.tsx` and the search plumbing in
`src/app/page.tsx`. The list payloads from dnd5eapi.co are summaries; check which facet
fields the list endpoint actually carries (spell level yes; school may need the detail
payloads or an enriched fetch — verify before promising a facet the data can't serve, and
say in the PR what each facet cost). Respect DND-022's phone layout: filters live behind
a chip row or a small sheet, never a permanent toolbar. Open a PR on a `claude/` branch;
CI is the source of truth.
