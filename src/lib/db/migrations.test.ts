import { readFileSync } from 'fs'
import { join } from 'path'

// The production migration job runs in parallel with the Vercel deploy by
// design (`.github/workflows/db-migrate-production.yml:8-13`), so for a minute
// or so on every merge, new code is live against an un-migrated database and
// old code is live against a migrated one. Both directions have to work, which
// is what "additive and nullable" in `.icm/project.md` means in practice.
//
// This reads the checked-in migrations and fails on the shapes that break that
// window. A migration is free to do anything it likes to a table it creates in
// the same file — nothing is reading it yet.
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'drizzle')

type Journal = { entries: { idx: number; tag: string }[] }

const journal: Journal = JSON.parse(
  readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')
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
const DESTRUCTIVE = [
  { pattern: /\bNOT NULL\b/i, why: 'adds a NOT NULL the currently-deployed code does not write' },
  { pattern: /\bDROP\b/i, why: 'drops something the currently-deployed code may still use' },
  { pattern: /\bRENAME\b/i, why: 'renames something the currently-deployed code still refers to' },
]

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

      for (const statement of statements) {
        const { verb, table } = parse(statement)
        if (verb === 'create') createdHere.add(table)

        if (verb !== 'alter' || createdHere.has(table) || !existingTables.has(table)) continue

        for (const { pattern, why } of DESTRUCTIVE) {
          if (pattern.test(statement)) violations.push(`${tag} ${why}: ${statement}`)
        }
      }

      for (const table of createdHere) existingTables.add(table)
    }

    expect(violations).toEqual([])
  })

  it('leaves the characters table alone after the migration that created it', () => {
    // DND-026's whole reason for a join table rather than a `campaign_id` column:
    // existing production characters keep working with no campaign at all, so
    // whichever of the migration and the deploy lands first, nothing breaks.
    const later = migrations.slice(1).flatMap((migration) => migration.statements)

    expect(later.filter((statement) => parse(statement).table === 'characters')).toEqual([])
  })
})
