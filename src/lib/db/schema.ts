// Drizzle schema for the D&D 5e Companion (DND-007, DND-026).
//
// `characters` is deliberately wide. The 2026-08-13 scope decisions put this app
// firmly in friends-and-family territory — a normalised spells/conditions/slots
// model would be four joins to render one phone screen. Split it when a real
// need turns up, not before.
//
// The campaign tables added by DND-026 are the exception that proves it: they
// are narrow because they are *relationships*, not sheet state, and because a
// character may sit in several campaigns at once (register decision D14).
//
// ## Foreign keys and deletion — the policy for the whole schema (DND-026)
//
// Two kinds of reference exist here, and they are treated differently on
// purpose. Settled once so the tables DND-027, DND-030 and DND-031 add do not
// have to re-decide it.
//
// **A reference to a user is plain `text` with no foreign key.** `ownerId`,
// `dmUserId` and `campaignMembers.userId` all hold `neon_auth.user.id`. That
// table belongs to Managed Better Auth and the `neon_auth` schema only exists
// once a human enables Auth in the Neon console, so a FK would make this
// migration fail against any database where that has not happened yet — a fresh
// local database, or a preview branch cut before Auth was on. `characters`
// carried that as a promised follow-up migration; DND-026 makes it the standing
// answer instead. We also do not own that table, so we could not attach a
// cascade to it even if the constraint were safe to add.
//
// **A reference to one of our own tables is a real foreign key with
// `ON DELETE CASCADE`.** Both join tables point at `campaigns`, and
// `campaignCharacters` also points at `characters`. Nothing in them means
// anything once the row they hang off is gone, so deleting a campaign or a
// character clears its associations in the same statement. `characters`
// themselves are never cascaded into: a campaign disbanding must not delete
// anybody's character.
//
// **The consequence, stated rather than hidden.** Because user ids carry no FK,
// deleting an auth user still orphans their rows — their characters, the
// campaigns they DM and their membership rows all survive with an id that
// resolves to nobody. That is unchanged from v1 and accepted at this scale:
// nobody can sign in as that user, so the rows are invisible rather than wrong.
// If account deletion is ever built it owns this cleanup explicitly; there is no
// database-level machinery waiting to do it.
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
 * console. It is plain `text` with **no foreign key**, and per the policy at the
 * top of this file that is now the settled answer for every user reference in
 * the schema rather than a follow-up migration waiting to happen.
 *
 * Ownership is still the only access rule these columns encode. DND-027 widens
 * *reads* to "owner, or the DM of a campaign this character is in" using the
 * join table below; DND-026 deliberately left every query alone.
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

/**
 * A campaign — one table, one DM, the thing every DM feature scopes to (DND-026).
 *
 * `dmUserId` is the single source of truth for who runs a campaign, in the same
 * shape and for the same reasons as `characters.ownerId`: a `neon_auth.user.id`
 * held as plain `text`. DND-027's viewer predicate reads exactly this column, so
 * it is indexed rather than reached through `campaignMembers`.
 *
 * Nothing here is a *setting*. Anything a DM configures per campaign — notes
 * visibility, house rules, the active encounter — belongs to the ticket that
 * introduces it, not to a speculative column added now.
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
    // "The campaigns I run" — DND-027's predicate and DND-030's party glance both
    // start here, and it is the only way in that does not begin with a campaign id.
    index('campaigns_dm_user_id_idx').on(table.dmUserId),

    // Same guardrail habit as `characters`: keep the shapes the UI would have to
    // defend against out of the table. A campaign with a blank name is a row no
    // screen can render and no DM can pick out of a list.
    check('campaigns_name_not_blank', sql`length(btrim(${table.name})) > 0`),
  ]
)

/** The seat a member holds at a campaign's table. */
export const CAMPAIGN_MEMBER_ROLES = ['dm', 'player'] as const

/** @see {@link CAMPAIGN_MEMBER_ROLES} */
export type CampaignMemberRole = (typeof CAMPAIGN_MEMBER_ROLES)[number]

/**
 * Who is at a campaign's table (DND-026).
 *
 * **`role` does not grant anything.** DM authority comes from
 * `campaigns.dmUserId` and nowhere else, so there is exactly one column to get
 * right in DND-027's predicate and no way for two tables to disagree about who
 * runs a game. This table answers a different question — who is *at the table* —
 * and `role` only records which chair they sit in, which matters because the DM
 * at this table also plays. Writers derive it from `campaigns.dmUserId` rather
 * than taking it from a caller (see `src/lib/db/campaigns.ts`); a CHECK cannot
 * span two tables, so that invariant lives in the data layer.
 *
 * The primary key is `(campaign_id, user_id)` — a person is in a campaign once
 * or not at all — and it doubles as the index for "everyone in this campaign",
 * that being its leading column.
 */
export const campaignMembers = pgTable(
  'campaign_members',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),

    role: text('role').$type<CampaignMemberRole>().notNull().default('player'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.campaignId, table.userId] }),

    // "The campaigns I play in" — the player-side counterpart to
    // `campaigns_dm_user_id_idx`, and not served by the primary key, whose
    // leading column is the campaign.
    index('campaign_members_user_id_idx').on(table.userId),

    // Roles are a closed set. Postgres holds the line so a typo cannot create a
    // third kind of member that every later `switch` has to have an arm for.
    check('campaign_members_role_valid', sql`${table.role} in ('dm', 'player')`),
  ]
)

/**
 * Which characters are being played in which campaign (DND-026).
 *
 * A join table rather than a `campaign_id` column on `characters`, per register
 * decision D14: the same character may be run in several campaigns, and a
 * character in none is the normal state for every row that exists today.
 *
 * That last point is why this table exists at all rather than a nullable column:
 * adding it changes nothing about `characters`, so the production migration — which
 * runs in parallel with the Vercel deploy by design, see
 * `.github/workflows/db-migrate-production.yml:8-13` — cannot break a live sheet
 * mid-session no matter which of the two lands first.
 *
 * The primary key is `(campaign_id, character_id)`, whose leading column makes it
 * the index for DND-027's "every character in this campaign" as well as the
 * constraint that a character joins a campaign once.
 */
export const campaignCharacters = pgTable(
  'campaign_characters',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.campaignId, table.characterId] }),

    // "The campaigns this character is in" — the reverse lookup, which the
    // primary key does not serve. It is also what keeps deleting a character
    // cheap: Postgres does not index the referencing side of a foreign key on
    // its own, so without this the cascade would scan the whole table.
    index('campaign_characters_character_id_idx').on(table.characterId),
  ]
)

/** A campaign row as read from the database. */
export type Campaign = typeof campaigns.$inferSelect

/** A campaign row as written to the database. */
export type NewCampaign = typeof campaigns.$inferInsert

/** A campaign membership row as read from the database. */
export type CampaignMember = typeof campaignMembers.$inferSelect

/** A character↔campaign association as read from the database. */
export type CampaignCharacter = typeof campaignCharacters.$inferSelect
