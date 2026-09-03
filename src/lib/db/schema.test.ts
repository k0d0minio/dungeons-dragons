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
  campaignHandouts,
  campaignLocations,
  campaignMembers,
  campaignNotes,
  campaignNpcs,
  campaigns,
  campaignSessionPlans,
  characterCampaigns,
  characterItems,
  characterNotes,
  characters,
  sessionPlanItems,
  sessionPlanLinks,
} from './schema'

const MIGRATION_DIR = join(__dirname, '../../../drizzle')

const migration = readFileSync(join(MIGRATION_DIR, '0001_campaigns.sql'), 'utf8')
const notesMigration = readFileSync(join(MIGRATION_DIR, '0005_notes.sql'), 'utf8')
const npcsMigration = readFileSync(join(MIGRATION_DIR, '0010_npcs.sql'), 'utf8')
const prepMigration = readFileSync(join(MIGRATION_DIR, '0011_locations-handouts.sql'), 'utf8')
const planMigration = readFileSync(join(MIGRATION_DIR, '0012_session-plans.sql'), 'utf8')
const gatesMigration = readFileSync(join(MIGRATION_DIR, '0013_campaign-gates.sql'), 'utf8')
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

describe('the revealable prep entity (`dm-prep-suite/npc-roster`, D38)', () => {
  /** The columns a player must never be able to read, whatever happens later. */
  const DM_ONLY = ['motivation', 'secrets', 'twist', 'stat_reference', 'dm_notes']

  it('is a purely additive migration — one new table, no existing table touched', () => {
    expect(npcsMigration).not.toMatch(/ALTER TABLE "characters"/)
    expect(npcsMigration).not.toMatch(/ALTER TABLE "campaigns"/)
    expect(npcsMigration).not.toMatch(/DROP/)
    expect(npcsMigration).not.toMatch(/ALTER COLUMN/)
    expect(npcsMigration).not.toMatch(/neon_auth/)

    expect(npcsMigration.match(/CREATE TABLE "\w+"/g)).toEqual(['CREATE TABLE "campaign_npcs"'])
  })

  it('cascades with the campaign that owns it, and indexes the roster read', () => {
    expect(foreignKeysOf(campaignNpcs)).toEqual([
      { column: 'campaign_id', references: 'campaigns.id', onDelete: 'cascade' },
    ])
    expect(indexNamesOf(campaignNpcs)).toContain('campaign_npcs_campaign_id_idx')
  })

  it('starts hidden: revealed_at is nullable, with no default to make it otherwise', () => {
    const revealedAt = getTableConfig(campaignNpcs).columns.find(
      (column) => column.name === 'revealed_at',
    )

    expect(revealedAt?.notNull).toBe(false)
    expect(revealedAt?.hasDefault).toBe(false)
    expect(npcsMigration).toContain('"revealed_at" timestamp with time zone,')
    expect(npcsMigration).not.toMatch(/"revealed_at"[^,]*DEFAULT/)
  })

  it('names the reveal state once, as a timestamp — no second boolean to drift', () => {
    const columns = getTableConfig(campaignNpcs).columns.map((column) => column.name)

    expect(columns).toContain('revealed_at')
    expect(columns).not.toContain('is_revealed')
    expect(columns).not.toContain('revealed')
  })

  it('keeps every DM-only column nullable — prep is written in the order it comes', () => {
    const columns = getTableConfig(campaignNpcs).columns

    for (const name of DM_ONLY) {
      expect(columns.find((column) => column.name === name)?.notNull).toBe(false)
    }
  })

  it('requires a name and refuses a blank one at the database', () => {
    const name = getTableConfig(campaignNpcs).columns.find((column) => column.name === 'name')

    expect(name?.notNull).toBe(true)
    expect(npcsMigration).toContain('CONSTRAINT "campaign_npcs_name_not_blank"')
  })

  it('has no version column — prep is not contested state, so no 409 guard', () => {
    expect(getTableConfig(campaignNpcs).columns.map((column) => column.name)).not.toContain(
      'version',
    )
  })

  // `npc-roster` left this slot open and asserted it was empty, because
  // `locations-handouts` owned the storage decision for the whole suite. It
  // made it (Vercel Blob, private objects), so the assertion is now about the
  // column that arrived rather than the one that had not.
  it('carries the portrait slot, nullable, as one JSONB fact', () => {
    const portrait = getTableConfig(campaignNpcs).columns.find(
      (column) => column.name === 'portrait',
    )

    expect(portrait?.notNull).toBe(false)
    expect(portrait?.hasDefault).toBe(false)
    expect(portrait?.getSQLType()).toBe('jsonb')
  })
})

// The second and third revealable entities (`dm-prep-suite/locations-handouts`).
// The properties are `campaign_npcs`', and they do not get weaker for being
// inherited: the shared columns come from `revealableColumns()`, so what is
// worth asserting is that the two new tables actually got them and that the
// migration stayed additive across the deploy window.
describe('the prep tables locations-handouts adds', () => {
  it('is an additive migration — two new tables and two nullable columns', () => {
    expect(prepMigration.match(/CREATE TABLE "\w+"/g)).toEqual([
      'CREATE TABLE "campaign_handouts"',
      'CREATE TABLE "campaign_locations"',
    ])

    // The production migrate job runs in parallel with the Vercel deploy, so
    // for a few seconds the old code talks to the new table. A NOT NULL add or
    // a DROP is an outage window in that gap; a nullable add is invisible.
    expect(prepMigration).not.toMatch(/DROP/)
    expect(prepMigration).not.toMatch(/ALTER COLUMN/)
    expect(prepMigration.match(/ADD COLUMN [^;]*/g)).toEqual([
      'ADD COLUMN "portrait" jsonb',
      'ADD COLUMN "portrait" jsonb',
    ])
  })

  const PREP_TABLES = { campaign_locations: campaignLocations, campaign_handouts: campaignHandouts }

  it.each(Object.keys(PREP_TABLES) as (keyof typeof PREP_TABLES)[])(
    'gives %s the revealable columns, and starts it hidden',
    (name) => {
      const columns = getTableConfig(PREP_TABLES[name]).columns
      const revealedAt = columns.find((column) => column.name === 'revealed_at')

      expect(columns.map((column) => column.name)).toEqual(
        expect.arrayContaining(['id', 'campaign_id', 'revealed_at', 'created_at', 'updated_at']),
      )
      expect(revealedAt?.notNull).toBe(false)
      expect(revealedAt?.hasDefault).toBe(false)
    },
  )

  it.each([
    ['campaign_locations', 'name'],
    ['campaign_handouts', 'title'],
  ] as const)(
    'requires %s to carry a %s, and refuses a blank one at the database',
    (name, column) => {
      const table = PREP_TABLES[name]

      expect(getTableConfig(table).columns.find((c) => c.name === column)?.notNull).toBe(true)
      expect(prepMigration).toContain(`CONSTRAINT "${name}_${column}_not_blank"`)
    },
  )

  it('keeps every DM-only column nullable — prep is written in the order it comes', () => {
    const locationColumns = getTableConfig(campaignLocations).columns
    const handoutColumns = getTableConfig(campaignHandouts).columns

    for (const name of ['secrets', 'dm_notes']) {
      expect(locationColumns.find((column) => column.name === name)?.notNull).toBe(false)
    }
    for (const name of ['body', 'provenance', 'dm_notes', 'image']) {
      expect(handoutColumns.find((column) => column.name === name)?.notNull).toBe(false)
    }
  })

  // One image slot in the suite, and it is the handout's: a picture of a place
  // *is* a handout — the map fragment, the sketch of the shrine.
  it('gives the image to the handout and not to the place', () => {
    expect(
      getTableConfig(campaignHandouts)
        .columns.find((c) => c.name === 'image')
        ?.getSQLType(),
    ).toBe('jsonb')
    expect(
      getTableConfig(campaignLocations).columns.filter((c) => /image|portrait/.test(c.name)),
    ).toEqual([])
  })

  it('has no version column — prep is not contested state, so no 409 guard', () => {
    for (const table of [campaignLocations, campaignHandouts]) {
      expect(getTableConfig(table).columns.map((column) => column.name)).not.toContain('version')
    }
  })
})

// The fourth revealable entity and the first one that owns rows of its own
// (`dm-prep-suite/session-plans`). What is worth pinning here is the half the
// pattern does *not* cover: two child tables with no `campaign_id` to scope by,
// a link that must point at exactly one thing, and a `checked_at` that is
// deliberately not a second `revealed_at`.
describe('session plans (`dm-prep-suite/session-plans`)', () => {
  it('is a purely additive migration — three new tables, no existing table touched', () => {
    expect(planMigration.match(/CREATE TABLE "\w+"/g)).toEqual([
      'CREATE TABLE "campaign_session_plans"',
      'CREATE TABLE "session_plan_items"',
      'CREATE TABLE "session_plan_links"',
    ])

    // The production migrate job runs in parallel with the Vercel deploy, so
    // for a few seconds the old code talks to the new tables. A NOT NULL add
    // or a DROP is an outage window in that gap; new tables are invisible.
    expect(planMigration).not.toMatch(/DROP/)
    expect(planMigration).not.toMatch(/ALTER COLUMN/)
    expect(planMigration).not.toMatch(/ADD COLUMN/)
    expect(planMigration).not.toMatch(/ALTER TABLE "characters"/)
    expect(planMigration).not.toMatch(/ALTER TABLE "campaigns"/)
  })

  it('gives the plan the revealable columns, and starts it un-announced', () => {
    const columns = getTableConfig(campaignSessionPlans).columns
    const revealedAt = columns.find((column) => column.name === 'revealed_at')

    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['id', 'campaign_id', 'revealed_at', 'created_at', 'updated_at']),
    )
    expect(revealedAt?.notNull).toBe(false)
    expect(revealedAt?.hasDefault).toBe(false)

    expect(foreignKeysOf(campaignSessionPlans)).toEqual([
      { column: 'campaign_id', references: 'campaigns.id', onDelete: 'cascade' },
    ])
    expect(indexNamesOf(campaignSessionPlans)).toContain('campaign_session_plans_campaign_id_idx')
  })

  it('requires a title and refuses a blank one at the database', () => {
    const title = getTableConfig(campaignSessionPlans).columns.find((c) => c.name === 'title')

    expect(title?.notNull).toBe(true)
    expect(planMigration).toContain('CONSTRAINT "campaign_session_plans_title_not_blank"')
  })

  it('keeps every DM-only column nullable — prep is written in the order it comes', () => {
    const columns = getTableConfig(campaignSessionPlans).columns

    for (const name of ['session_date', 'strong_start', 'treasure']) {
      expect(columns.find((column) => column.name === name)?.notNull).toBe(false)
    }
  })

  it('has no version column — prep is not contested state, so no 409 guard', () => {
    expect(getTableConfig(campaignSessionPlans).columns.map((c) => c.name)).not.toContain('version')
  })

  // The child tables. Authority reaches them through `plan_id` and nothing
  // else, which is why neither carries a `campaign_id` of its own: a second
  // answer to "whose is this" is the one that eventually disagrees.
  it('hangs the lines and the links off the plan alone, and cascades with it', () => {
    for (const table of [sessionPlanItems, sessionPlanLinks]) {
      expect(getTableConfig(table).columns.map((c) => c.name)).not.toContain('campaign_id')
    }

    expect(foreignKeysOf(sessionPlanItems)).toEqual([
      { column: 'plan_id', references: 'campaign_session_plans.id', onDelete: 'cascade' },
    ])
    expect(indexNamesOf(sessionPlanItems)).toContain('session_plan_items_plan_id_idx')
  })

  it('constrains a line’s kind at the database, not just in zod', () => {
    expect(planMigration).toContain('CONSTRAINT "session_plan_items_kind_known"')
    expect(planMigration).toContain("in ('scene', 'secret')")
    expect(planMigration).toContain('CONSTRAINT "session_plan_items_body_not_blank"')
  })

  it('ticks with a timestamp, and never with a second flag beside it', () => {
    const columns = getTableConfig(sessionPlanItems).columns
    const checkedAt = columns.find((column) => column.name === 'checked_at')

    expect(checkedAt?.notNull).toBe(false)
    expect(checkedAt?.hasDefault).toBe(false)
    expect(columns.map((column) => column.name)).not.toContain('checked')
    expect(columns.map((column) => column.name)).not.toContain('is_checked')
  })

  // A tick is the DM's own bookkeeping. If this column ever appeared here it
  // would mean a tap at the table could publish a clue.
  it('gives a line no reveal state at all — ticking one tells the party nothing', () => {
    expect(getTableConfig(sessionPlanItems).columns.map((c) => c.name)).not.toContain('revealed_at')
  })

  it('cascades a link from every side, so a deleted NPC takes its links with it', () => {
    expect(foreignKeysOf(sessionPlanLinks)).toEqual([
      { column: 'plan_id', references: 'campaign_session_plans.id', onDelete: 'cascade' },
      { column: 'npc_id', references: 'campaign_npcs.id', onDelete: 'cascade' },
      { column: 'location_id', references: 'campaign_locations.id', onDelete: 'cascade' },
      { column: 'encounter_id', references: 'encounters.id', onDelete: 'cascade' },
    ])
  })

  it('demands exactly one target on a link — never none, never two', () => {
    expect(planMigration).toContain('CONSTRAINT "session_plan_links_one_target"')
    for (const column of ['npc_id', 'location_id', 'encounter_id']) {
      expect(planMigration).toContain(`"${column}" is not null)::int`)
    }
    expect(planMigration).toContain('::int = 1')
  })

  it('keeps a plan from linking the same thing twice', () => {
    const unique = getTableConfig(sessionPlanLinks)
      .indexes.filter((index) => index.config.unique)
      .map((index) => index.config.name)

    expect(unique).toEqual([
      'session_plan_links_plan_npc_idx',
      'session_plan_links_plan_location_idx',
      'session_plan_links_plan_encounter_idx',
    ])
  })
})

// The one column `dm-prep-suite/campaign-feature-gates` adds, and the two
// properties the feature rests on: it is additive enough to run while the old
// code is still serving, and `NULL` is a legal, meaningful value.
describe('campaign feature gates (`dm-prep-suite/campaign-feature-gates`)', () => {
  it('adds one nullable column and touches nothing else', () => {
    expect(gatesMigration.trim()).toBe('ALTER TABLE "campaigns" ADD COLUMN "gates" jsonb;')

    // The production migrate job runs in parallel with the Vercel deploy, so
    // for a few seconds the old code talks to the new column. A NOT NULL add,
    // a default backfill or a DROP is an outage window in that gap; a nullable
    // jsonb column the old build never selects is invisible.
    expect(gatesMigration).not.toMatch(/NOT NULL/)
    expect(gatesMigration).not.toMatch(/DEFAULT/)
    expect(gatesMigration).not.toMatch(/DROP/)
    expect(gatesMigration).not.toMatch(/ALTER COLUMN/)
    expect(gatesMigration).not.toMatch(/ALTER TABLE "characters"/)
  })

  it('leaves the column nullable and undefaulted, because NULL is "every gate off"', () => {
    const gates = getTableConfig(campaigns).columns.find((column) => column.name === 'gates')

    expect(gates?.notNull).toBe(false)
    expect(gates?.hasDefault).toBe(false)
    expect(gates?.getSQLType()).toBe('jsonb')
  })
})
