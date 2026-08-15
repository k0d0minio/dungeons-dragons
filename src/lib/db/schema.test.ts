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
  campaigns,
  characterCampaigns,
  characters,
} from './schema'

const MIGRATION_DIR = join(__dirname, '../../../drizzle')

const migration = readFileSync(join(MIGRATION_DIR, '0001_campaigns.sql'), 'utf8')
const snapshot = JSON.parse(
  readFileSync(join(MIGRATION_DIR, 'meta/0001_snapshot.json'), 'utf8')
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
  // The policy the ticket asked to settle once. Written as a table so a new
  // user-id column added later without a cascade shows up as a missing row
  // rather than as nothing at all.
  it.each([
    ['campaigns.dm_user_id', campaigns, 'dm_user_id'],
    ['campaign_members.user_id', campaignMembers, 'user_id'],
  ])('%s references neon_auth.user and cascades on delete', (_label, table, column) => {
    const fk = foreignKeysOf(table).find((f) => f.column === column)

    expect(fk).toEqual({ column, references: 'user.id', onDelete: 'cascade' })
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

  it('never generates DDL against the neon_auth schema', () => {
    // Neon owns `neon_auth`. Emitting a CREATE for it — which is what happens
    // if `authUser` in schema.ts is ever exported — fails the production
    // migration against a database where Auth is already enabled.
    expect(migration).toMatch(/REFERENCES "neon_auth"\."user"/)
    expect(migration).not.toMatch(/CREATE SCHEMA/)
    expect(migration).not.toMatch(/CREATE TABLE "neon_auth"/)

    expect(snapshot.schemas).toEqual({})
    expect(Object.keys(snapshot.tables).filter((t) => !t.startsWith('public.'))).toEqual([])
  })
})
