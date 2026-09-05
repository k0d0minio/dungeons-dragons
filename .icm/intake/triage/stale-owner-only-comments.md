# Stub: Three comments say "owner-only" about pages the DM can open

- lane: chore
- found-by: first-timer audit, 2026-09-05 (`.icm/docs/2026-09-05-first-timer-audit.md` §B)
- priority: P2
- size: S

`src/app/characters/[id]/edit/page.tsx` and `src/app/characters/[id]/level/page.tsx`
both say they are "owner-only the same way the sheet is… `getCharacter` folds the
session user into the WHERE clause". `getCharacter` uses `viewableBy`, which admits the
DM of any campaign the character is on (D13) — and on production the DM opens both
pages and can save from both. The sheet page's comment on `LevelUpWaitingBand` explains
its owner-only rendering with "the planner it opens is owner-only, so a DM… would be
offered a link that 404s" — the link does not 404. Behaviour is fine and is what D13
asks for; the comments are wrong. Rewrite the three so the next reader is not told the
opposite of what the predicate does, and say which of the two the level route intends
(it uses `getCharacter` too).

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/stale-owner-only-comments.md`. Fix the comments on a `claude/`
branch and open a PR; CI is the only evidence. `git mv` the stub into
`.icm/intake/triage/_done/` in the same PR.
