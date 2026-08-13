# DND-003 · Reference detail views — make the five tab lists clickable

| | |
|---|---|
| Type | feature |
| Priority | P1 |
| Size | M |

## Problem
Every list card on the home page's five tabs (spells / classes / races / equipment /
monsters) says **"Click to view details"** with no click handler (`src/app/page.tsx`);
earlier viewer components were deleted in the "new ui" rewrite. The detail data already
exists as API routes (`/api/dnd5e/*/[index]`). "Basic spell/equipment reference" is an
MVP core feature, and the BRD requires "Spell information shall include all mechanical
details and descriptions" (FR-003) with "mobile-optimized progressive disclosure"
(FR-002, business-requirements.mdx).

## Acceptance
- [ ] Tapping any card in all five tabs opens a detail view fed by the existing `/api/dnd5e/*/[index]` routes
- [ ] Spell details show full mechanical detail ("all mechanical details and descriptions" — FR-003)
- [ ] Mobile-first layout, usable one-handed (NFR-002: 44px touch targets)
- [ ] CI green

## Prompt

Wire up detail views in the D&D 5e Companion PWA. `src/app/page.tsx` renders five tabbed
lists whose cards promise "Click to view details" but have no handler; detail API routes
`/api/dnd5e/{spells,classes,races,equipment,monsters}/[index]` already exist. Add detail
views (drawer/dialog or route — match the existing shadcn/Radix component style) for all
five content types, mobile-first. Read `.icm/intake/DND-003-reference-detail-views.md`
for full context. Open a PR on a `claude/` branch; do not run local checks — CI is the
source of truth.
