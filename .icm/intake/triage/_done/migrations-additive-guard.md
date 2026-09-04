# Stub: The additive-migration guard that never landed

- lane: chore
- found-by: remote-branch-prune, 2026-09-03
- priority: P2
- size: S
- sources: `origin/claude/dnd-campaigns-substrate-awdt22:src/lib/db/migrations.test.ts`
  (commit `f12dc77`, PR `#21`, closed unmerged)

Found while pruning dead remote branches. `claude/dnd-campaigns-substrate-awdt22` is the
one branch of 70 that is **not** safe to delete: PR `#21` was closed unmerged in favour of
`#22`, which landed the campaigns substrate from a different branch — so the tables, the
migration and `src/lib/db/campaigns.ts` are all in `main`, but one file rode only on `#21`
and exists nowhere else: `src/lib/db/migrations.test.ts`.

It reads the checked-in migrations from `drizzle/meta/_journal.json` in the order
`drizzle-kit migrate` applies them, and fails on the shapes that break the deploy window —
`db-migrate-production.yml` runs the migration job *in parallel* with the Vercel deploy, so
for a minute on every merge new code is live against an un-migrated database and old code
against a migrated one. "Additive and nullable" in `.icm/project.md` is exactly what that
window needs, and nothing currently enforces it: no file under `src/` or `scripts/` reads
`_journal.json` or `drizzle/meta` at all. Twelve migrations have landed since.

Decide whether the guard is worth having. If yes, take the file off the branch and let CI
run it. If no, say so here and the branch can be pruned with the rest.

**Until this is decided, do not delete `claude/dnd-campaigns-substrate-awdt22`** — it is
the only copy.

## Prompt

You are at the root of the dungeons-dragons repo. Read
`.icm/intake/triage/migrations-additive-guard.md`. Recover
`src/lib/db/migrations.test.ts` from `origin/claude/dnd-campaigns-substrate-awdt22`
(`git show origin/claude/dnd-campaigns-substrate-awdt22:src/lib/db/migrations.test.ts`),
check it still parses the twelve migrations in `drizzle/` as they are shaped today, and
decide with Jamie whether to land it. Produce the evidence — which migrations it passes
and which it flags — and let Jamie call it; do not tick the decision yourself. If it
lands, note in `.icm/intake/triage/remote-branch-prune.md` that the branch is now free to
prune.

## Outcome — landed, narrowed (Jamie, 2026-09-04)

Recovered and landed at `src/lib/db/migrations.test.ts`, with the rule set narrowed to the
shapes that are actually unsafe. The branch is now free to prune.

**There are seventeen migrations, not twelve** — `0000`–`0016`. The stub's count was
written against a stale reading.

The file as recovered passed one of its three tests:

- **Journal integrity — passed.** All seventeen entries have a readable `.sql` with at
  least one statement, in `idx` order, starting at `0000_characters`.
- **The additive guard — failed, 11 violations**, all in `0002_authority` (1) and
  `0003_sheet-features` (10), every one the same shape:
  `ALTER TABLE "characters" ADD COLUMN … DEFAULT <x> NOT NULL`.
- **"Leaves `characters` alone after `0000`" — failed, 34 statements.** Dead on arrival:
  it froze `characters` as DND-026's join-table rationale, and `0002`, `0003`, `0006`,
  `0007`, `0008` and `0009` have deliberately altered it since. Not a deploy-window rule.
  **Dropped**, not fixed.

Against the hazards the guard actually names, the history is clean — nothing applied to
production is unsafe:

| shape | occurrences across `drizzle/*.sql` |
| --- | --- |
| `DROP` (any) | 0 |
| `RENAME` (any) | 0 |
| `NOT NULL` with **no** `DEFAULT` | 0 |
| `NOT NULL` **with** a `DEFAULT` | 11 (`0002`, `0003`) |

So the 11 flags were the rule being wider than the hazard: Postgres fills existing rows in
from the default, and the old code's inserts, which never name the column, take it too.
The rule now fires only on a **bare** `NOT NULL`, which needs no grandfather list —
`0002` and `0003` stop being violations rather than being exempted.

`.icm/project.md`'s standing rule said "additive and nullable … nothing has a `NOT NULL`
window", which read literally condemned `0002`/`0003`. Amended to match: additive, with
`NOT NULL` permitted when it carries a `DEFAULT`.

One gap in the recovered file, closed while landing it: `ADD CONSTRAINT … CHECK` on a
pre-existing table rejects writes old code is still making, and nothing caught it. Eleven
such statements exist today, all benign — each constrains a column added in the same
migration — but a hostile one passed unnoticed. A CHECK is now allowed only when every
column it constrains arrived in that same migration *on that same table*; an unqualified
CHECK, whose columns cannot be read off it, is reported rather than waved through.

Verified by injecting each shape into `0016` and re-running, so the guard is known to trip
rather than merely to pass:

| injected statement | verdict |
| --- | --- |
| bare `NOT NULL` on an existing table | caught |
| `NOT NULL` **with** a `DEFAULT` | allowed |
| `DROP COLUMN` | caught |
| `RENAME COLUMN` | caught |
| `CHECK` over a pre-existing column | caught |
| `CHECK` over a column added in the same migration | allowed |
| `CHECK` with an unqualified column | caught |
| `CHECK` excused only by that column name on *another* table | caught |
| plain nullable `ADD COLUMN` | allowed |
| `CREATE TABLE` with its own `NOT NULL` | allowed |

No coverage impact: it is a test file, excluded from `collectCoverageFrom`, and imports
nothing from `src/`.
