# DND-040 · Bring the docs level with the code, and stop pointing at deleted files

| | |
|---|---|
| Status | ready |
| Type | chore |
| Priority | P2 |
| Size | S |
| Sources | ticket-scout · tech lens · data lens · copy lens · `README.md:20-38,47,96-99` · `CLAUDE.md` · `src/app/characters/[id]/page.tsx:42` · `src/app/api/characters/[id]/route.ts:28` |

## Problem

**README.md is two features behind.** It still carries a "What is not built yet" section stating
that `/characters` is a placeholder page, that there is no character creation and no sheet, and
that DND-008 and DND-009 are "the next two tickets". All three claims are false:
`src/app/characters/page.tsx` is a real owner-scoped list, `src/app/characters/new/page.tsx` is
the creation form, and `src/app/characters/[id]/page.tsx` is the sheet. It also claims 12 test
files when there are 21 (`README.md:47`), and cites DND-008/009/010/011/012 — none of which are
on the board.

**CLAUDE.md is one feature behind** — its "What exists in `src/`" lists the creation form but not
the sheet, because it was rewritten in `934b681` just before `b4501fc` merged the sheet.

**Live code points users at files that no longer exist.** `1b151fa` deleted all four `.icm/docs/`
runbooks, and three surfaces still cite them:

- `src/app/characters/[id]/page.tsx:42` renders `.icm/docs/neon-database-setup.md` **to an end
  user** on an unconfigured deploy.
- `src/app/api/characters/[id]/route.ts:28` returns the same path in a 503 body. Its sibling at
  `src/app/api/characters/route.ts:21` already gets this right with the same message minus the
  path — copy that.
- Both migration workflows cite `.icm/docs/db-migrations-deploy.md` in five log messages.
  (DND-024 owns those — leave them.)

**There is no `.env.example`.** README documents the five runtime variables, but the workflows
also need `NEON_API_KEY`, `NEON_PROJECT_ID`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` and
`VERCEL_TEAM_ID`, documented only in the deleted runbook.

## Acceptance

- [ ] README describes what the app actually does, with no "not built yet" claims that are built
- [ ] The test-file count is right, or the claim is removed rather than maintained
- [ ] Neither README nor CLAUDE.md cites a ticket that is not on the board
- [ ] CLAUDE.md routes to `.icm/project.md`, which now exists
- [ ] No internal repo path is rendered to an end user or returned in an API body
- [ ] `.env.example` exists and covers both runtime and CI variables
- [ ] CI green

## Prompt

Bring the D&D 5e Companion's documentation level with its code, and stop the app pointing people
at files that were deleted.

**README.md.** Its "What is not built yet" section (`:20-38`) says `/characters` is a placeholder
with no creation form and no sheet, and names DND-008 and DND-009 as the next tickets. All of
that shipped — `src/app/characters/page.tsx`, `.../new/page.tsx` and `.../[id]/page.tsx` are all
real. It also claims 12 test files (`:47`) when there are 21, and its ticket table (`:96-99`)
cites five tickets that no longer exist. Rewrite it against what the code actually does. Consider
dropping the test count rather than maintaining a number that goes stale every PR.

**CLAUDE.md.** Its "What exists in `src/`" mentions the creation form but not the character
sheet. It also says `.icm/project.md` is "not yet written" and routes to it as missing — **it now
exists**, so fix the routing table and remove the "Intent is not yet established" warning block.

**The dangling `.icm/docs/` references.** `1b151fa` deleted all four runbooks. Two surfaces show
the paths to users: `src/app/characters/[id]/page.tsx:42` renders
`.icm/docs/neon-database-setup.md` on screen, and `src/app/api/characters/[id]/route.ts:28`
returns it in a 503 body. Fix both — the sibling route at `src/app/api/characters/route.ts:21`
already has the right shape, the same message without the internal path. Leave the workflow log
messages alone; DND-024 owns those.

**Add `.env.example`.** Cover the five runtime variables README documents (`:61-77`) and the CI
secrets the workflows need — `NEON_API_KEY`, `NEON_PROJECT_ID`, `VERCEL_TOKEN`,
`VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` — with a comment on which are runtime and which are
Actions secrets. Never put a real value in it.

Do not restore the deleted runbooks in this ticket. DND-016 restores the Neon Auth one and
DND-024 the migrations one, each with someone who has verified its contents.

Read `.icm/intake/DND-040-docs-level-with-reality.md` and `.icm/project.md` for context. Open a
PR on a `claude/` branch; do not run local checks — CI is the source of truth.
