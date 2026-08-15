// Drizzle schema for the D&D 5e Companion (DND-007, DND-026).
//
// `characters` stays one wide table. The 2026-08-13 scope decisions put this app
// firmly in friends-and-family territory — a normalised spells/conditions/slots
// model would be four joins to render one phone screen. Split it when a real
// need turns up, not before.
//
// DND-026 adds the campaigns substrate the DM role needs: `campaigns`,
// `campaign_members` and the `character_campaigns` join. It changes no access
// rule — DND-027 does that, deliberately and on its own.
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Spell slot state, keyed by spell level as a string ("1".."9").
 *
 * `max` is stored rather than derived: warlock pact magic, multiclassing and the
 * odd homebrew ruling all break the tidy class-table derivation, and DND-009
 * needs to render "3/4" without a round-trip to the reference API. `used` is what
 * the sheet's tap-to-spend actually mutates. Levels the character has no slots
 * for are simply absent from the object.
 *
 * Derived values that *are* stable (ability modifiers, proficiency bonus, save
 * and skill bonuses) stay computed at render time — see DND-009.
 */
export type SpellSlotState = Record<string, { max: number; used: number }>

/**
 * Player characters, one row each, owned by a Neon Auth user.
 *
 * `ownerId` holds `neon_auth.user.id` — Managed Better Auth's user table, which
 * lives in this same database, created when Auth is enabled in the Neon
 * console. It is plain
 * `text` with **no foreign key**: the `neon_auth` schema is created by Neon when
 * a human enables Auth in the console, so a FK here would make this migration
 * fail against any database where that has not happened yet. Add the constraint
 * in a follow-up migration once Auth is enabled on every environment.
 *
 * Reference data (class, species, spells, conditions) is stored as dnd5eapi.co
 * *index* strings — `"wizard"`, `"half-elf"`, `"fireball"`, `"prone"` — the same
 * identifiers `/api/dnd5e/*` serves, so the sheet can tap through to a detail
 * view without a lookup table of our own.
 */
export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id').notNull(),

    // Identity
    name: text('name').notNull(),
    classIndex: text('class_index').notNull(),
    speciesIndex: text('species_index').notNull(),
    level: smallint('level').notNull().default(1),

    // The six ability scores, as entered (DND-008 takes direct entry, no point-buy).
    strength: smallint('strength').notNull().default(10),
    dexterity: smallint('dexterity').notNull().default(10),
    constitution: smallint('constitution').notNull().default(10),
    intelligence: smallint('intelligence').notNull().default(10),
    wisdom: smallint('wisdom').notNull().default(10),
    charisma: smallint('charisma').notNull().default(10),

    // Combat state, tracked live during a session by the DND-009 sheet.
    maxHitPoints: integer('max_hit_points').notNull(),
    currentHitPoints: integer('current_hit_points').notNull(),
    temporaryHitPoints: integer('temporary_hit_points').notNull().default(0),
    armorClass: smallint('armor_class').notNull().default(10),
    speed: smallint('speed').notNull().default(30),

    spellSlots: jsonb('spell_slots').$type<SpellSlotState>().notNull().default({}),

    /** dnd5eapi condition indexes currently applied, e.g. `['prone', 'poisoned']`. */
    conditions: text('conditions').array().notNull().default(sql`'{}'::text[]`),

    deathSaveSuccesses: smallint('death_save_successes').notNull().default(0),
    deathSaveFailures: smallint('death_save_failures').notNull().default(0),

    /** dnd5eapi spell indexes. `prepared` is a subset of `known` for prepared casters. */
    knownSpellIndexes: text('known_spell_indexes').array().notNull().default(sql`'{}'::text[]`),
    preparedSpellIndexes: text('prepared_spell_indexes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every read is owner-scoped; this is the only access pattern v1 has.
    index('characters_owner_id_idx').on(table.ownerId),

    // Guardrails for the ranges 5e actually defines, so a bad client can't write
    // a row the sheet then has to defend against. Deliberately one column per
    // check — a cross-column rule like "current <= max" would make every partial
    // update have to know about the other column, and level-up would have to
    // order its writes. Clamping HP against max is the sheet's job (DND-009).
    check('characters_level_range', sql`${table.level} between 1 and 20`),
    check('characters_strength_range', sql`${table.strength} between 1 and 30`),
    check('characters_dexterity_range', sql`${table.dexterity} between 1 and 30`),
    check('characters_constitution_range', sql`${table.constitution} between 1 and 30`),
    check('characters_intelligence_range', sql`${table.intelligence} between 1 and 30`),
    check('characters_wisdom_range', sql`${table.wisdom} between 1 and 30`),
    check('characters_charisma_range', sql`${table.charisma} between 1 and 30`),
    check('characters_max_hit_points_positive', sql`${table.maxHitPoints} >= 1`),
    check('characters_current_hit_points_positive', sql`${table.currentHitPoints} >= 0`),
    check('characters_temporary_hit_points_positive', sql`${table.temporaryHitPoints} >= 0`),
    check('characters_armor_class_positive', sql`${table.armorClass} >= 0`),
    check('characters_speed_positive', sql`${table.speed} >= 0`),
    check('characters_death_save_successes_range', sql`${table.deathSaveSuccesses} between 0 and 3`),
    check('characters_death_save_failures_range', sql`${table.deathSaveFailures} between 0 and 3`),
  ]
)

/** A character row as read from the database. */
export type Character = typeof characters.$inferSelect

/** A character row as written to the database. */
export type NewCharacter = typeof characters.$inferInsert

// ---------------------------------------------------------------------------
// Campaigns (DND-026)
// ---------------------------------------------------------------------------
//
// **Foreign-key and deletion policy, settled here once (DND-026).**
//
// User ids on these tables are plain `text` with **no** foreign key into
// `neon_auth.user`, exactly as `characters.owner_id` is and for the same reason
// (`:37-43`). Foreign keys *between* these tables are real, because they point
// at tables in `public` that this schema owns.
//
// This was tried the other way first and reverted. The original DND-026 PR
// declared real `references(neon_auth.user.id)` columns with `ON DELETE
// CASCADE`, on the reasoning that DND-007's objection had expired now that Auth
// is enabled on production. **It had not.** `drizzle/0001_campaigns.sql` failed
// on first contact with the production database (run 31910353352) and rolled
// back; the whole migrate run is one transaction, so nothing landed. Enabling
// Auth puts `neon_auth.user` in the database, but it does not follow that the
// app's migration role may point a constraint at a table Neon's managed auth
// service owns — creating a foreign key needs `REFERENCES` on the target, and
// that grant is not ours to assume.
//
// The cost of reverting is real and is **not** fixed by this ticket: deleting an
// auth user still orphans their campaigns and memberships permanently, the same
// way it already orphans their characters
// (`.icm/docs/neon-auth-setup.md:154-155`). DND-044 tracks that as an Article 17
// problem. Restoring the cascade needs one read-only check first —
// `select has_table_privilege(current_user, 'neon_auth.user', 'REFERENCES')`
// and the `data_type` of `neon_auth.user.id` — and then its own migration,
// where a failure costs a follow-up rather than the substrate.
//
// **`characters.owner_id` is not converted here either**, and now clearly should
// not be: adding a FK to a table that already holds production rows is not the
// additive, no-backfill migration this ticket promised.

/**
 * A campaign — one table, one DM, the party that plays at it.
 *
 * **`dm_user_id` is the only thing that says who runs a campaign**, and it is
 * `NOT NULL`, so the answer is exactly one person and cannot be absent or
 * ambiguous. DND-027's viewer predicate is a single equality against this
 * column. A `campaign_members` row with `role = 'dm'` grants *nothing* — see
 * the warning on that table.
 */
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dmUserId: text('dm_user_id').notNull(),
    name: text('name').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // "Every campaign this user runs" — one half of DND-027's predicate, and the
    // query behind the DND-030 party glance.
    index('campaigns_dm_user_id_idx').on(table.dmUserId),

    // Same spirit as the `characters` range checks: keep a bad client from
    // writing a row the UI then has to defend against. A campaign with a blank
    // name renders as an empty tap target.
    check('campaigns_name_not_blank', sql`length(btrim(${table.name})) > 0`),
  ]
)

/**
 * Who sits at a campaign's table.
 *
 * **This table is a roster, not a permission grant.** `role` records the seat a
 * person holds so the UI can label them; it is *not* consulted when deciding
 * what anyone may read or write. Authority to see a campaign's characters comes
 * from `campaigns.dm_user_id` and nowhere else. `'dm'` is an allowed role
 * because Jamie runs the game *and* plays in it, so the DM legitimately appears
 * on the roster — but writing `where role = 'dm'` in an access check would be a
 * privilege-escalation bug, since nothing stops a member row saying `'dm'` for
 * a campaign someone else owns.
 *
 * Keyed by `(campaign_id, user_id)`: a person is at a table once.
 */
export const campaignMembers = pgTable(
  'campaign_members',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role').notNull().default('player'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.campaignId, table.userId] }),

    // "Every campaign this person is in" — the reverse of the primary key, which
    // only serves lookups that lead with `campaign_id`.
    index('campaign_members_user_id_idx').on(table.userId),

    check('campaign_members_role_known', sql`${table.role} in ('dm', 'player')`),
  ]
)

/**
 * Which characters are in which campaigns.
 *
 * A join table rather than a `campaign_id` column on `characters`, per register
 * decision D14: a character may belong to several campaigns. That also keeps
 * this migration additive — existing rows gain no column, need no backfill, and
 * a character in no campaign simply has no row here and behaves exactly as it
 * does today.
 *
 * Both foreign keys cascade, but they mean different things: deleting a
 * character removes it from every campaign, and deleting a campaign removes its
 * roster of characters **without touching the characters themselves**.
 */
export const characterCampaigns = pgTable(
  'character_campaigns',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Leads with `character_id`, which serves "is this character in a campaign
    // run by X" — the per-character half of DND-027's predicate.
    primaryKey({ columns: [table.characterId, table.campaignId] }),

    // "Every character in this campaign" — the other half, and the DND-030 list.
    // The primary key cannot serve it: `campaign_id` is not its leading column.
    index('character_campaigns_campaign_id_idx').on(table.campaignId),
  ]
)

/** A campaign row as read from / written to the database. */
export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert

/** A roster row as read from / written to the database. */
export type CampaignMember = typeof campaignMembers.$inferSelect
export type NewCampaignMember = typeof campaignMembers.$inferInsert

/** A character↔campaign association as read from / written to the database. */
export type CharacterCampaign = typeof characterCampaigns.$inferSelect
export type NewCharacterCampaign = typeof characterCampaigns.$inferInsert

/** The seats a roster row may record. Not an access-control input — see above. */
export const CAMPAIGN_ROLES = ['dm', 'player'] as const
export type CampaignRole = (typeof CAMPAIGN_ROLES)[number]
