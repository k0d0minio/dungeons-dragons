import { readFileSync } from 'fs'
import { join } from 'path'

// The production migration job runs in parallel with the Vercel deploy by
// design (`.github/workflows/db-migrate-production.yml:12-16`), so for a minute
// or so on every merge, new code is live against an un-migrated database and
// old code is live against a migrated one. Both directions have to work, which
// is what "additive" in `.icm/project.md` means in practice.
//
// This reads the checked-in migrations and fails on the shapes that break that
// window. A migration is free to do anything it likes to a table it creates in
// the same file — nothing is reading it yet.
//
// Recovered from `claude/dnd-campaigns-substrate-awdt22`, whose PR was closed
// unmerged; the rules are narrowed to the shapes that are actually unsafe, so
// it runs green against the migrations already applied. See
// `.icm/intake/triage/_done/migrations-additive-guard.md`.
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'drizzle')

type Journal = { entries: { idx: number; tag: string }[] }

const journal: Journal = JSON.parse(
  readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'),
)

/** Migrations in the order `drizzle-kit migrate` applies them. */
const migrations = [...journal.entries]
  .sort((a, b) => a.idx - b.idx)
  .map((entry) => ({
    tag: entry.tag,
    statements: readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean),
  }))

/** What each statement does, and to which table. */
function parse(statement: string): { verb: 'create' | 'alter' | 'other'; table: string } {
  const created = /^CREATE TABLE (?:IF NOT EXISTS )?"([^"]+)"/i.exec(statement)
  if (created) return { verb: 'create', table: created[1] }

  const altered = /^ALTER TABLE (?:ONLY )?"([^"]+)"/i.exec(statement)
  if (altered) return { verb: 'alter', table: altered[1] }

  return { verb: 'other', table: '' }
}

/**
 * Changes that a running deployment can notice. A column the old code does not
 * know about is harmless; one it is required to write, or one that disappears
 * from under it, is an outage.
 */
const DESTRUCTIVE: { pattern: RegExp; unless?: RegExp; why: string }[] = [
  // A NOT NULL *with* a DEFAULT is safe, and 0002 and 0003 both rely on it:
  // Postgres fills existing rows in, and the old code's inserts, which never
  // name the column, take the default too. A bare NOT NULL is the outage —
  // every insert the old code makes fails until it is redeployed.
  {
    pattern: /\bNOT NULL\b/i,
    unless: /\bDEFAULT\b/i,
    why: 'adds a NOT NULL with no DEFAULT, which the currently-deployed code cannot insert past',
  },
  { pattern: /\bDROP\b/i, why: 'drops something the currently-deployed code may still use' },
  { pattern: /\bRENAME\b/i, why: 'renames something the currently-deployed code still refers to' },
]

/** The column an `ADD COLUMN` introduces, if that is what this statement is. */
function addedColumn(statement: string): string | null {
  return /\bADD COLUMN "([^"]+)"/i.exec(statement)?.[1] ?? null
}

/**
 * A CHECK is only safe in the deploy window when every column it constrains
 * arrived in the same migration: no existing row can violate it, and the old
 * code — which knows nothing about those columns — cannot write one that does.
 * A CHECK over a column that was already there is an outage waiting for the
 * first old-code write that falls outside it.
 *
 * Returns the reasons this CHECK is unsafe, empty when it is fine. An
 * unqualified CHECK is reported rather than waved through: the columns it
 * constrains cannot be read off it, and silently passing is how a guard stops
 * being one. `drizzle-kit` writes them qualified, so this only bites a
 * hand-edited migration, and qualifying the column fixes it.
 */
function unsafeCheckReasons(statement: string, addedHere: Set<string>): string[] {
  if (!/\bADD CONSTRAINT\b[\s\S]*\bCHECK\b/i.test(statement)) return []

  const check = statement.slice(statement.search(/\bCHECK\b/i))
  const columns = [...check.matchAll(/"[^"]+"\."([^"]+)"/g)].map((match) => match[1])

  if (columns.length === 0) {
    return ['adds a CHECK whose columns are not table-qualified, so it cannot be checked here']
  }

  return columns
    .filter((column) => !addedHere.has(column))
    .map((column) => `adds a CHECK over pre-existing column "${column}"`)
}

/**
 * The same rule as a CHECK's, for the two other constraints a migration can
 * bolt onto a table that already exists.
 *
 * A FOREIGN KEY and a UNIQUE are both validated against every row already in
 * the table and enforced against every row the currently-deployed code writes
 * next, so either one over a **pre-existing** column is the same outage a
 * CHECK would be: the migration fails on the rows that are already there, or
 * the old code's next insert fails on a value it had no reason to think was
 * constrained. Over a column that arrived in the same migration, neither can
 * bite — every existing row has null in it, and the old code never names it.
 *
 * `dm-chronology/session-chain` is the first migration in this repo to add a
 * foreign key to a table it did not create (`campaign_notes.plan_id`), which
 * is what these two arms are here to keep honest — the constraint is safe
 * because the column is new, and the guard now says so rather than the commit
 * message.
 */
function unsafeConstraintReasons(statement: string, addedHere: Set<string>): string[] {
  const kinds: { pattern: RegExp; what: string }[] = [
    { pattern: /\bADD CONSTRAINT\b[\s\S]*\bFOREIGN KEY\s*\(([^)]*)\)/i, what: 'a FOREIGN KEY' },
    { pattern: /\bADD CONSTRAINT\b[\s\S]*\bUNIQUE\s*\(([^)]*)\)/i, what: 'a UNIQUE' },
  ]

  return kinds.flatMap(({ pattern, what }) => {
    const columnList = pattern.exec(statement)?.[1]
    if (columnList === undefined) return []

    const columns = [...columnList.matchAll(/"([^"]+)"/g)].map((match) => match[1])

    if (columns.length === 0) {
      return [`adds ${what} whose columns are not quoted, so it cannot be checked here`]
    }

    return columns
      .filter((column) => !addedHere.has(column))
      .map((column) => `adds ${what} over pre-existing column "${column}"`)
  })
}

describe('checked-in migrations', () => {
  it('has a readable file for every journal entry', () => {
    // Reading them at module load is the assertion — a journal entry with no
    // file, or a file with no statements, is a migration that will not apply.
    expect(migrations.length).toBe(journal.entries.length)
    expect(migrations.every((migration) => migration.statements.length > 0)).toBe(true)
    expect(migrations[0].tag).toBe('0000_characters')
  })

  it('changes tables that already existed only in ways a live deployment survives', () => {
    const existingTables = new Set<string>()
    const violations: string[] = []

    for (const { tag, statements } of migrations) {
      const createdHere = new Set<string>()
      // Per table, not per migration: two tables in one migration can each add
      // a column of the same name, and only the one on *this* table excuses a
      // CHECK on it.
      const columnsAddedHere = new Map<string, Set<string>>()

      for (const statement of statements) {
        const { verb, table } = parse(statement)
        if (verb === 'create') createdHere.add(table)

        const added = addedColumn(statement)
        if (added) {
          const forTable = columnsAddedHere.get(table) ?? new Set<string>()
          forTable.add(added)
          columnsAddedHere.set(table, forTable)
        }

        if (verb !== 'alter' || createdHere.has(table) || !existingTables.has(table)) continue

        for (const { pattern, unless, why } of DESTRUCTIVE) {
          if (!pattern.test(statement)) continue
          if (unless?.test(statement)) continue
          violations.push(`${tag} ${why}: ${statement}`)
        }

        const addedToTable = columnsAddedHere.get(table) ?? new Set<string>()
        for (const why of [
          ...unsafeCheckReasons(statement, addedToTable),
          ...unsafeConstraintReasons(statement, addedToTable),
        ]) {
          violations.push(
            `${tag} ${why}, which the currently-deployed code may violate: ${statement}`,
          )
        }
      }

      for (const table of createdHere) existingTables.add(table)
    }

    expect(violations).toEqual([])
  })
})

describe('the constraint arms of the guard', () => {
  // The rule above is only worth having if it bites, and every checked-in
  // migration is (by construction) safe — so the unsafe shapes are asserted
  // here against the function itself rather than against the repository.
  const NEW_COLUMN = new Set(['plan_id'])

  const FK =
    'ALTER TABLE "campaign_notes" ADD CONSTRAINT "campaign_notes_plan_id_campaign_session_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."campaign_session_plans"("id") ON DELETE set null ON UPDATE no action'

  it('passes a foreign key over a column the same migration added', () => {
    expect(unsafeConstraintReasons(FK, NEW_COLUMN)).toEqual([])
  })

  it('catches the same foreign key when the column was already there', () => {
    expect(unsafeConstraintReasons(FK, new Set())).toEqual([
      'adds a FOREIGN KEY over pre-existing column "plan_id"',
    ])
  })

  it('reads the constrained column off a UNIQUE too', () => {
    const unique =
      'ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_table_token_unique" UNIQUE("table_token")'

    expect(unsafeConstraintReasons(unique, new Set(['table_token']))).toEqual([])
    expect(unsafeConstraintReasons(unique, new Set())).toEqual([
      'adds a UNIQUE over pre-existing column "table_token"',
    ])
  })

  it('says nothing about a statement that adds no constraint', () => {
    expect(
      unsafeConstraintReasons('ALTER TABLE "campaign_notes" ADD COLUMN "plan_id" uuid', new Set()),
    ).toEqual([])
  })
})
