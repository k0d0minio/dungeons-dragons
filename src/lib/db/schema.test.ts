// Schema-shape tests for the campaigns substrate (DND-026).
//
// These assert the properties that are load-bearing but silent: nothing throws
// if a cascade is dropped, an index is renamed, or the migration quietly starts
// touching `characters`. The cost of finding those out in production is a
// failed migration or an orphaned row, so they are pinned here instead.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getTableName } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'

import {
  CAMPAIGN_ROLES,
  campaignMembers,
  campaignNotes,
  campaigns,
  characterCampaigns,
  characterItems,
  characterNotes,
  characters,
} from './schema'

const MIGRATION_DIR = join(__dirname, '../../../drizzle')

const migration = readFileSync(join(MIGRATION_DIR, '0001_campaigns.sql'), 'utf8')
const notesMigration = readFileSync(join(MIGRATION_DIR, '0005_notes.sql'), 'utf8')
const snapshot = JSON.parse(
  readFileSync(join(MIGRATION_DIR, 'meta/0001_snapshot.json'), 'utf8'),
) as { schemas: Record<string, unknown>; tables: Record<string, unknown> }

/** `[column, referencedTable.referencedColumn, onDelete]` for each FK on a table. */
function foreignKeysOf(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).foreignKeys.map((fk) => {
    const { columns, foreignColumns } = fk.reference()

    return {
      column: columns[0].name,
      references: `${getTableName(foreignColumns[0].table)}.${foreignColumns[0].name}`,
      onDelete: fk.onDelete,
    }
  })
}

function indexNamesOf(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table).indexes.map((i) => i.config.name)
}

describe('the foreign-key and deletion policy (DND-026)', () => {
  // These two pin a revert, not a preference. The first cut of this ticket gave
  // both columns a real FK into `neon_auth.user` with ON DELETE CASCADE; the
  // production migration failed on first contact and rolled back. Creating a
  // foreign key needs REFERENCES on the target, and `neon_auth.user` belongs to
  // Neon's managed auth service — enabling Auth puts the table there but grants
  // us nothing over it. Re-adding these without checking the grant first breaks
  // the production migration again, and every migration queued behind it.
  it.each([
    ['campaigns.dm_user_id', campaigns, 'dm_user_id'],
    ['campaign_members.user_id', campaignMembers, 'user_id'],
  ])('%s is plain text, like characters.owner_id', (_label, table, column) => {
    const owner = getTableConfig(characters).columns.find((c) => c.name === 'owner_id')
    const subject = getTableConfig(table).columns.find((c) => c.name === column)

    expect(subject?.getSQLType()).toBe(owner?.getSQLType())
    expect(subject?.notNull).toBe(true)
    expect(foreignKeysOf(table).find((f) => f.column === column)).toBeUndefined()
  })

  it('cascades every campaign-scoped row when a campaign is deleted', () => {
    for (const table of [campaignMembers, characterCampaigns]) {
      const fk = foreignKeysOf(table).find((f) => f.column === 'campaign_id')

      expect(fk).toMatchObject({ references: 'campaigns.id', onDelete: 'cascade' })
    }
  })

  it('removes a deleted character from its campaigns, and no more than that', () => {
    const fks = foreignKeysOf(characterCampaigns)

    expect(fks).toContainEqual({
      column: 'character_id',
      references: 'characters.id',
      onDelete: 'cascade',
    })

    // The cascade runs join-row-wards only. Nothing points *at* `characters`
    // from a campaign, so deleting a campaign cannot take a player's character
    // with it — the failure mode that would make this table unshippable.
    expect(foreignKeysOf(characters)).toHaveLength(0)
  })
})

describe('the indexes DND-027 will read through', () => {
  it('indexes campaigns by the DM who runs them', () => {
    expect(indexNamesOf(campaigns)).toContain('campaigns_dm_user_id_idx')
  })

  it('indexes the join by campaign, which the primary key cannot serve', () => {
    // The PK leads with `character_id`, so "every character in this campaign"
    // would be a sequential scan without this.
    const { primaryKeys } = getTableConfig(characterCampaigns)

    expect(primaryKeys[0].columns.map((c) => c.name)).toEqual(['character_id', 'campaign_id'])
    expect(indexNamesOf(characterCampaigns)).toContain('character_campaigns_campaign_id_idx')
  })

  it('lets one character belong to several campaigns', () => {
    // Register decision D14. A unique constraint on `character_id` alone — the
    // shape a `campaign_id` column on `characters` would have forced — is
    // exactly what must not appear here.
    const { primaryKeys, uniqueConstraints } = getTableConfig(characterCampaigns)

    expect(primaryKeys[0].columns).toHaveLength(2)
    expect(uniqueConstraints).toHaveLength(0)
  })
})

describe('the roster is not a permission grant', () => {
  it('allows a DM to also sit on the roster', () => {
    expect(CAMPAIGN_ROLES).toEqual(['dm', 'player'])
  })

  it('defaults a new member to player', () => {
    const role = getTableConfig(campaignMembers).columns.find((c) => c.name === 'role')

    expect(role?.default).toBe('player')
    expect(role?.notNull).toBe(true)
  })

  it('keeps the DM of record on campaigns, not on the roster', () => {
    // The whole point of the warning in the schema comment: authority is a
    // NOT NULL column on `campaigns`, so DND-027 has exactly one place to look
    // and a member row cannot forge it.
    const dm = getTableConfig(campaigns).columns.find((c) => c.name === 'dm_user_id')

    expect(dm?.notNull).toBe(true)
  })
})

describe('the migration is additive (DND-026)', () => {
  it('creates only the three new tables', () => {
    expect(migration.match(/CREATE TABLE "(\w+)"/g)).toEqual([
      'CREATE TABLE "campaign_members"',
      'CREATE TABLE "campaigns"',
      'CREATE TABLE "character_campaigns"',
    ])
  })

  it('leaves the characters table alone', () => {
    // Existing production rows must need no backfill and behave unchanged. The
    // only permitted mention of `characters` is the join's FK target.
    expect(migration).not.toMatch(/ALTER TABLE "characters"/)
    expect(migration).not.toMatch(/NOT NULL;/)
  })

  it('touches nothing outside the public schema', () => {
    // The whole migration must be DDL against objects this repo owns. The first
    // cut reached into `neon_auth` for two foreign keys and failed in
    // production (run 31910353352) — every statement here now references only
    // tables it creates, or `characters`, which 0000 already created.
    expect(migration).not.toMatch(/neon_auth/)
    expect(migration).not.toMatch(/CREATE SCHEMA/)

    expect(snapshot.schemas).toEqual({})
    expect(Object.keys(snapshot.tables).filter((t) => !t.startsWith('public.'))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Sheet features (DND-015/033/034/035/036/038 — drizzle/0003)
// ---------------------------------------------------------------------------

const sheetMigration = readFileSync(join(MIGRATION_DIR, '0003_sheet-features.sql'), 'utf8')

describe('the sheet-features migration is additive (drizzle/0003)', () => {
  it('creates only character_items and adds columns with defaults', () => {
    expect(sheetMigration.match(/CREATE TABLE "(\w+)"/g)).toEqual([
      'CREATE TABLE "character_items"',
    ])

    // Every ALTER on `characters` is an ADD with a DEFAULT (register rule:
    // the migrate job runs in parallel with the deploy, so a NOT NULL add
    // without a default is a live outage window) — or an added CHECK.
    const alters = sheetMigration.match(/ALTER TABLE "characters" [^;]+;/g) ?? []
    expect(alters.length).toBeGreaterThan(0)

    for (const statement of alters) {
      expect(statement).toMatch(/ADD (COLUMN "\w+" .*DEFAULT|CONSTRAINT)/)
    }

    expect(sheetMigration).not.toMatch(/DROP/)
    expect(sheetMigration).not.toMatch(/ALTER COLUMN/)
  })

  it('folds the legacy exhaustion condition into the level column (DND-038)', () => {
    // The hand-appended data migration: chip → level >= 1, chip removed.
    expect(sheetMigration).toMatch(/GREATEST\("exhaustion", 1\)/)
    expect(sheetMigration).toMatch(/array_remove\("conditions", 'exhaustion'\)/)
    expect(sheetMigration).toMatch(/WHERE 'exhaustion' = ANY\("conditions"\)/)
  })

  it('touches nothing outside the public schema', () => {
    expect(sheetMigration).not.toMatch(/neon_auth/)
    expect(sheetMigration).not.toMatch(/CREATE SCHEMA/)
  })
})

describe('character_items (DND-035)', () => {
  it('cascades with its character and is indexed by it', () => {
    expect(foreignKeysOf(characterItems)).toContainEqual({
      column: 'character_id',
      references: 'characters.id',
      onDelete: 'cascade',
    })
    expect(indexNamesOf(characterItems)).toContain('character_items_character_id_idx')
  })

  it('lets an item be reference data, homebrew, or a renamed reference item', () => {
    const columns = getTableConfig(characterItems).columns
    const equipmentIndex = columns.find((c) => c.name === 'equipment_index')
    const customName = columns.find((c) => c.name === 'custom_name')

    // Both nullable — the CHECK ("named") demands at least one, app logic and
    // the zod schemas do the rest.
    expect(equipmentIndex?.notNull).toBe(false)
    expect(customName?.notNull).toBe(false)
    expect(sheetMigration).toContain(
      '"character_items"."equipment_index" is not null or "character_items"."custom_name" is not null',
    )
  })

  it('has no attunement CHECK — the cap is app logic, deliberately', () => {
    // 5e caps attunement at three, homebrew breaks it, so the ticket demands
    // the cap live in `src/lib/db/items.ts` and never in the database.
    expect(sheetMigration).not.toMatch(/attuned[^,\n]*CHECK/i)
    expect(sheetMigration.match(/CONSTRAINT "character_items_\w+" CHECK/g)).toEqual([
      'CONSTRAINT "character_items_quantity_positive" CHECK',
      'CONSTRAINT "character_items_named" CHECK',
    ])
  })
})

describe('notes (DND-058)', () => {
  it('is a purely additive migration — two new tables, no existing table touched', () => {
    // The whole safety argument for shipping this during a deploy window: an
    // app that has never heard of these tables keeps working, and no existing
    // row is rewritten. A stray ALTER on `characters` would break both claims.
    expect(notesMigration).not.toMatch(/ALTER TABLE "characters"/)
    expect(notesMigration).not.toMatch(/ALTER TABLE "campaigns"/)
    expect(notesMigration).not.toMatch(/DROP/)
    expect(notesMigration).not.toMatch(/ALTER COLUMN/)
    expect(notesMigration).not.toMatch(/neon_auth/)

    expect(notesMigration.match(/CREATE TABLE "\w+"/g)).toEqual([
      'CREATE TABLE "campaign_notes"',
      'CREATE TABLE "character_notes"',
    ])
  })

  it('cascades notes with the campaign they belong to, and indexes the read', () => {
    expect(foreignKeysOf(campaignNotes)).toEqual([
      { column: 'campaign_id', references: 'campaigns.id', onDelete: 'cascade' },
    ])
    expect(indexNamesOf(campaignNotes)).toContain('campaign_notes_campaign_id_idx')
  })

  it('keeps a note the DM’s until they share it', () => {
    const shared = getTableConfig(campaignNotes).columns.find(
      (column) => column.name === 'shared_with_players',
    )

    // The register's visibility rule as a default: unshared, and NOT NULL so
    // there is no third state for a query to have to think about.
    expect(shared?.notNull).toBe(true)
    expect(notesMigration).toContain('"shared_with_players" boolean DEFAULT false NOT NULL')
  })

  it('dates a note with a calendar date the database defaults itself', () => {
    // `current_date`, not an app-server clock: it is also what the quick
    // capture matches on, and two clocks would disagree about which night it is.
    expect(notesMigration).toContain('"session_date" date DEFAULT current_date NOT NULL')
  })

  it('refuses a blank note body at the database, as the last line of defence', () => {
    expect(notesMigration).toContain('CONSTRAINT "campaign_notes_body_not_blank"')
  })

  it('gives a character exactly one notebook, cascading with the character', () => {
    const config = getTableConfig(characterNotes)
    const characterId = config.columns.find((column) => column.name === 'character_id')

    // Primary key on `character_id` alone is what makes the save a single-row
    // upsert — `neon-http` has no transactions, so that matters.
    expect(characterId?.primary).toBe(true)
    expect(foreignKeysOf(characterNotes)).toEqual([
      { column: 'character_id', references: 'characters.id', onDelete: 'cascade' },
    ])
  })

  it('does not put a player’s notes on the characters table, where a DM would read them', () => {
    // The one property this table exists for. `getCharacter` and
    // `getCampaignRoster` select whole character rows through the DND-027
    // viewer predicate, which a DM satisfies — a `notes` column there would
    // ride down with the party glance on first paint.
    const characterColumns = getTableConfig(characters).columns.map((column) => column.name)

    expect(characterColumns).not.toContain('notes')
    expect(getTableName(characterNotes)).toBe('character_notes')
  })

  it('has no version column on either table — notes are not contested state', () => {
    // DND-058 is explicit that these are plain saves, never the 409 path.
    expect(getTableConfig(campaignNotes).columns.map((c) => c.name)).not.toContain('version')
    expect(getTableConfig(characterNotes).columns.map((c) => c.name)).not.toContain('version')
  })
})
