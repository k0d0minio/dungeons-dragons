# DND-022 · Give the reference browser the phone-first pass the sheet already had

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P1 |
| Size | M |
| Sources | ux lens · `src/app/page.tsx:62-90,93-139,143` · `src/components/ui/tabs.tsx:29,45` · `src/app/layout.tsx:24-29` · `src/components/ui/card.tsx:10,23,64` |

## Problem

Git tells the story: `src/app/page.tsx` was last touched at DND-003 (`5d9010c`), *before* the
sheet work in `c874e22`. The sheet cards got a phone-first pass and are genuinely good. The
reference browser never did, and it is half the v1 bar.

**The search box is below the fold.** The page opens with an icon block, a `text-5xl` h1, a
180-character `text-xl` paragraph (`:62-90`), then five stat cards in `grid-cols-2` (`:93-139`,
~450px), and only then the tabs (`:143`). On a 320×568 phone the search input sits roughly
650px down and the first result around 1350px. You scroll before you can type, and scroll
again to read the answer — that is the ten-second lookup, spent.

**The five-tab bar cannot fit.** `TabsList` is `grid-cols-5` (`:143`), giving each trigger
~56px at 320px, but each holds a 16px icon plus `whitespace-nowrap` text — "Equipment",
"Monsters" need ~105px and cannot wrap (`ui/tabs.tsx:45`). It overflows or clips. The list is
also `h-9` = 36px (`ui/tabs.tsx:29`), under thumb size, and it is the only way to change
category.

**Nothing can be made bigger.** The viewport is locked with `maximumScale: 1, userScalable:
false` (`layout.tsx:24-29`), while the sheet's densest labels are `text-[0.65rem]` (10.4px) in
`--muted-foreground` (~4.7:1 on white) and detail bodies are `text-sm`. In dim light at arm's
length that is unreadable with no recourse. The lock buys nothing: `ui/input.tsx:11` is
already `text-base` on mobile, so iOS focus-zoom was never a risk.

**Card padding eats a 320px screen.** `ui/card.tsx` hard-codes `px-6`/`py-6` with no mobile
step-down, taking 48px of a 288px content width.

## Acceptance

- [ ] The search input is visible on first paint at 320px without scrolling
- [ ] All five tabs are usable at 320px — no clipping, no overflow, and the control is at
      least 44px tall
- [ ] Pinch-zoom works
- [ ] The smallest type on the reference and sheet screens is legible in dim light — state
      what you raised and to what
- [ ] Card padding steps down on narrow screens
- [ ] Nothing regresses on the sheet, which is already correct
- [ ] CI green

## Prompt

Give the D&D 5e Companion's reference browser the phone-first pass its character sheet
already got. This app is used one-handed, on a phone, in dim light, at a table — and the
reference half was last touched before that standard existed.

Work in `src/app/page.tsx`, `src/app/layout.tsx` and the shared primitives.

**Cut the front door down.** `page.tsx:62-90` is a hero (icon block, `text-5xl` h1, a long
`text-xl` paragraph) and `:93-139` is five stat cards — together roughly 650px above the
search input on a 320px screen. This is an app with five known users; it does not need a
marketing hero. Get search onto the first screen. Jamie has not decided whether the hero and
stat cards should shrink or go entirely — propose it in the PR rather than silently deleting,
but do not preserve them at the cost of the fold.

**Rebuild the tab bar for 320px.** `TabsList` at `:143` is `grid-cols-5`, ~56px per tab, and
`src/components/ui/tabs.tsx:45` sets `whitespace-nowrap` on labels needing ~105px. Also raise
the `h-9` at `tabs.tsx:29` — 36px is under thumb size for the app's only category control.
Scrollable tabs, icon-only with labels on wider screens, or a different control entirely are
all fair; pick one and say why.

**Unlock zoom.** Remove `maximumScale: 1, userScalable: false` from `src/app/layout.tsx:24-29`.
It prevents a player enlarging anything and buys nothing, since `src/components/ui/input.tsx:11`
is already `text-base` on mobile.

**Raise the smallest type.** `src/components/characters/sheet/stats-cards.tsx:46,94,190,196`
use `text-[0.65rem]` in `--muted-foreground`. Judge against dim light at arm's length, not a
contrast-ratio number — the project's bar is phone-first hygiene, not WCAG.

**Step card padding down.** `src/components/ui/card.tsx:10,23,64` hard-codes `px-6`/`py-6`.
The visible casualty is the creation form's Combat card (`character-form.tsx:305-315`), a
`grid-cols-3` with ~75px columns under full-sentence validation messages.

Scope boundary: search behaviour and empty states are DND-021, same file. Check whether it has
landed and rebase rather than fighting it. Do not touch the sheet's in-session controls — the
tap counts there are already right.

Read `.icm/intake/DND-022-reference-browser-phone-pass.md` and `.icm/project.md` for context.
Open a PR on a `claude/` branch; do not run local checks — CI is the source of truth.
