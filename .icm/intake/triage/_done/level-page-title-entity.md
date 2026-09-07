# Stub: The level page prints "&rsquo;" instead of an apostrophe

- lane: bug
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §E)
- priority: P2
- size: S

`src/app/characters/[id]/level/page.tsx` builds the page title as a JS template string
— `` `Manage ${character.name}&rsquo;s level` `` — so the HTML entity is rendered
literally: production shows "Manage Ava Delacroix&rsquo;s level". Use the character
(’) or a JSX expression. Check `PageHeader`'s other callers for the same shape while
there.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/level-page-title-entity.md`. Fix it on a `claude/` branch and open a
PR; CI is the only evidence. `git mv` the stub into `.icm/intake/triage/_done/` in the
same PR.

## Outcome — 2026-09-07

Fixed on `claude/level-page-title-entity-triage-arwr6t`. The title now uses the
character itself: ``title={`Manage ${character.name}’s level`}``.

The sweep of `PageHeader`'s other callers found no second instance — every other
title, subtitle and `backLabel` is either plain prose or an interpolation, and the
entities elsewhere in `src/` all sit in JSX text, where they decode correctly.

Since the two shapes are indistinguishable in a diff,
`src/html-entities-in-strings.test.ts` now parses every source file and fails on an
HTML entity inside a string or template literal, leaving JSX text alone.
