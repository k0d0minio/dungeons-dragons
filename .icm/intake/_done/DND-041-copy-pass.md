# DND-041 · Copy pass — one word for race, real error messages, a 404 that helps

| | |
|---|---|
| Status | ready |
| Type | bug |
| Priority | P2 |
| Size | S |
| Sources | copy lens · `src/components/characters/character-form.tsx:180,244-254` · `src/app/page.tsx:69,378` · `src/app/characters/[id]/page.tsx:57` · `src/app/layout.tsx:19-22,44` · register D18 |

## Problem

Five small copy defects, none individually urgent, all cheap in one pass.

**The app calls the same thing two different words.** The character half says **Species**
(`character-form.tsx:244,246,254`, `src/lib/characters/schema.ts:59`,
`src/app/characters/page.tsx:102`); the reference half says **Race** (`src/app/page.tsx:118,154,252,274`,
`reference-detail-sheet.tsx:28`). One card uses both — `page.tsx:252-256` is titled "Races" and
described as "Different species and cultures". A player picks "Species: Elf" then taps "Races" to
read what an elf does. Register decision **D18 settles it: race on screen**, because SRD 5.1 is
the rules baseline and *species* is 2024 PHB vocabulary the data source does not serve.
`speciesIndex` stays as the column name — this is display strings only.

**Raw server strings reach the player.** `character-form.tsx:180` pipes the API's `error` field
straight into its banner, so a session that expired during ten minutes of typing reports the
single word "Unauthorized" (`src/app/api/characters/route.ts:43`). The sheet already solves this
properly at `use-combat-state.ts:20-24` — *"You have been signed out. Sign in again to keep
tracking."*

**There is no `not-found.tsx`.** `src/app/characters/[id]/page.tsx:57` calls `notFound()`, which
renders Next's stock unbranded page with no route back. That page is also, by design, what
someone else's character id returns — so it is a load-bearing screen rendered by default.

**The footer credits Next.js 15**; the repo is on 16 (`src/app/page.tsx:378`). A test asserts the
stale sentence verbatim at `src/app/page.test.tsx:83`, so it survives casual edits.

**Two names and no title template.** `layout.tsx:44` renders "D&D 5e Companion"; `page.tsx:69`
renders "Dungeons & Dragons" directly below it. And root metadata has no `title.template`
(`layout.tsx:19-22`), so child titles replace it outright — tabs read "Characters", "Character
sheet", "New character" with nothing identifying the app. README's claim that
`NEXT_PUBLIC_APP_NAME` overrides the title is true only of the root, and both env vars are
build-time inlined, so changing them in Vercel needs a redeploy — which README does not say.

## Acceptance

- [ ] One word for the concept across both halves — **race** per D18 — with `speciesIndex`
      unchanged as a column name
- [ ] The creation form maps server errors to human sentences rather than echoing them
- [ ] A `not-found.tsx` exists with a route back to somewhere useful
- [ ] The footer names the right framework version, and its test is updated with it
- [ ] The app has one name, and page titles keep it
- [ ] README's claim about the env overrides is corrected, including the redeploy caveat
- [ ] CI green

## Prompt

Do a copy pass over the D&D 5e Companion. Five small things, one PR.

**1 — One word: race, not species.** The character half says "Species"
(`src/components/characters/character-form.tsx:244,246,254`, `src/lib/characters/schema.ts:59`,
`src/app/characters/page.tsx:102`); the reference half says "Race"
(`src/app/page.tsx:118,154,252,274`). `page.tsx:252-256` uses both in one card. Register decision
D18 settles it as **race** — SRD 5.1 is the rules baseline and "species" is 2024 PHB vocabulary
this app's data source does not serve. **Display strings only** — leave `speciesIndex` as the
column name, and do not write a migration.

**2 — Map server errors to sentences.** `character-form.tsx:180` does
`setSubmitError(payload.error ?? …)`, so an expired session shows the player the word
"Unauthorized". The sheet already has the right pattern at
`src/components/characters/sheet/use-combat-state.ts:20-24`; reuse it rather than writing a second
mapping.

**3 — Add `src/app/not-found.tsx`.** `src/app/characters/[id]/page.tsx:57` calls `notFound()` and
gets Next's stock page with no way back — and that page is deliberately also what another user's
character id returns, so it is load-bearing. Give it the app's styling and a route home. Keep it
generic: it must not hint whether the id existed.

**4 — Fix the footer version.** `src/app/page.tsx:378` says "Next.js 15"; the repo is on 16.
Update the assertion at `src/app/page.test.tsx:83` in the same change. Note DND-017 also edits this
footer to add SRD attribution — check whether it has landed and rebase.

**5 — One name, and a title template.** `src/app/layout.tsx:44` says "D&D 5e Companion";
`src/app/page.tsx:69` says "Dungeons & Dragons" right below. Pick one. Add `title.template` to the
root metadata (`layout.tsx:19-22`) so the hardcoded child titles in
`src/app/characters/{page,[id]/page,new/page}.tsx` keep the app name. While there, correct
`README.md:75` — the `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_DESCRIPTION` overrides reach the
root title only, and both are build-time inlined, so changing them in Vercel requires a redeploy.

Read `.icm/intake/DND-041-copy-pass.md` and `.icm/project.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
