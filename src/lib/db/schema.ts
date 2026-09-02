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
  boolean,
  check,
  date,
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
 * Points added to ability scores by one choice, keyed as
 * `src/lib/characters/schema.ts` keys the six abilities. Restated here rather
 * than imported for the same reason `backgroundAbilitySpread` restates its
 * union: the schema module is the bottom of the import graph and stays there.
 */
export type AbilityIncreases = Partial<
  Record<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', number>
>

/**
 * One feat taken at a level (SRD 5.2.1), as the level planner recorded it.
 *
 * A single shape for both branches of the 4th/8th/12th/16th/19th-level choice,
 * because in the 2024 rules there is only one branch: the Ability Score
 * Improvement *is* a feat, so "+2 Intelligence" is the feat
 * `ability-score-improvement` carrying its increases, and Grappler is another
 * feat that happens to carry none. That leaves room for the feats which do both
 * without a second column.
 *
 * `increases` is what was **applied**, not what was asked for: the 20 cap is
 * enforced when the choice is made, so a +2 that only had room for +1 is stored
 * as +1. That is what makes levelling back down exact — the number to subtract
 * is the number that was added.
 */
export interface LevelFeat {
  /** The character level it was taken at — one of the class's feat levels. */
  level: number
  /** An SRD feat index; `'ability-score-improvement'` for a plain increase. */
  featIndex: string
  /** The ability points it added, absent for a feat that adds none. */
  increases?: AbilityIncreases
}

/** When a class resource pool refills on its own (register decision D23). */
export type ClassResourceRecharge = 'short-rest' | 'long-rest' | 'manual'

/**
 * One class resource pool — rage uses, ki points, Channel Divinity — tracked as
 * a generic named counter with a recharge rule rather than per-class columns
 * (register decision D23). `max` is stored for the same reason spell slot
 * maxima are: the class tables are a starting offer, and a subclass feature or
 * a DM's ruling diverges from them. `recharge` is what lets a rest (DND-033)
 * know which pools to refill: `'short-rest'` pools also refill on a long rest,
 * `'manual'` pools never refill on their own.
 */
export interface ClassResource {
  name: string
  max: number
  used: number
  recharge: ClassResourceRecharge
}

/**
 * What a character is currently concentrating on (DND-049).
 *
 * One value rather than a list: 5e allows exactly one concentration effect at a
 * time, so "concentrating on nothing" is `null` and there is no state that can
 * hold two — see `docs/rules/06-spellcasting.md`.
 *
 * `index` is the dnd5eapi spell index when the player picked the spell off
 * their own list, and `null` when they typed the name. Free text is not a
 * fallback for a broken picker, it is the common case the picker cannot cover:
 * a magic item, a monster's effect, a readied spell, or homebrew. `name` is
 * always what the sheet, the party glance and the tracker show, so a row whose
 * index the reference API has never heard of still reads correctly.
 */
export interface Concentration {
  index: string | null
  name: string
}

/**
 * The most weapons one character may be recorded as having mastery with.
 *
 * Slack, not tight: the highest any SRD class reaches is a 16th-level
 * fighter's six, and the bound that actually matters —
 * `weaponMasteryCount(classIndex, level)` — moves with the level, which a
 * CHECK constraint cannot. This is the guardrail against an absurd row, and
 * `src/lib/characters/schema.ts` is where the real rule is applied.
 */
export const MAX_MASTERED_WEAPONS = 8

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

    /**
     * Experience points, or `null` for a character nobody is counting XP for
     * (DND-055).
     *
     * Nullable is the whole design, not just the additive-migration rule: most
     * home tables level by milestone, and for those the honest value is "we do
     * not track this" rather than a zero that looks like a party who never
     * fought anything. A `null` character shows no XP on the sheet at all; the
     * first award — or the sheet's own "Track XP" — is what opts them in, and
     * it is reversible from the same card.
     *
     * Levelling never follows from this number. Crossing a threshold nudges;
     * `level` still only moves through the DND-032 planner.
     */
    experience: integer('experience'),

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
    conditions: text('conditions')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    deathSaveSuccesses: smallint('death_save_successes').notNull().default(0),
    deathSaveFailures: smallint('death_save_failures').notNull().default(0),

    /**
     * Exhaustion by level, 0–6 (DND-038). A column rather than an entry in
     * `conditions` because the level *is* the information — the boolean chip
     * could not say whether the character was winded or dying. Level 6 is
     * death. The 0003 migration folds any legacy `'exhaustion'` entry in
     * `conditions` into this column at level ≥ 1.
     */
    exhaustion: smallint('exhaustion').notNull().default(0),

    /**
     * The one concentration effect a character may have running (DND-049), or
     * `NULL` for none — see {@link Concentration}.
     *
     * Nullable with no default, which keeps the migration additive: a row
     * written before 0006 reads as "not concentrating", which is exactly what
     * it was. `jsonb` rather than a pair of text columns because the two halves
     * are one fact — a name without its index is fine, an index without its
     * name is not a state the sheet can render — and NULL says "none" once
     * instead of twice.
     */
    concentration: jsonb('concentration').$type<Concentration>(),

    /**
     * Hit dice spent since the last long rest (DND-033). The *total* pool is
     * derived — one die per character level, sized by class (D15: single
     * class) — so only the spent count is state. A long rest gives back up to
     * half the total (min 1); a short rest is what spends them.
     */
    hitDiceUsed: smallint('hit_dice_used').notNull().default(0),

    /**
     * Class resource pools — rage, ki, Channel Divinity — as generic counters
     * (D23). JSONB like `spell_slots` and for the same reason: the set of
     * pools is per-character, the sheet renders them all in one read, and a
     * normalised table would be a join to render three numbers.
     */
    classResources: jsonb('class_resources').$type<ClassResource[]>().notNull().default([]),

    // Currency (DND-035), one integer column per 5e coin. Copper through
    // platinum; no auto-conversion — the app stores what the player counts.
    cp: integer('cp').notNull().default(0),
    sp: integer('sp').notNull().default(0),
    ep: integer('ep').notNull().default(0),
    gp: integer('gp').notNull().default(0),
    pp: integer('pp').notNull().default(0),

    /**
     * Optimistic-concurrency version (DND-028), bumped by every update. A
     * writer sends the version it read; a mismatch means someone else wrote in
     * between, and the API answers 409 with the current row instead of
     * silently overwriting it. `NOT NULL DEFAULT 0` is still an additive,
     * no-rewrite migration on Postgres 14+, and code that never mentions the
     * column keeps working — the deploy/migrate window stays safe.
     */
    version: integer('version').notNull().default(0),

    /**
     * dnd5eapi spell indexes (DND-036, D22). What each list means depends on
     * the class's preparation model (`spellPreparationModel` in
     * `src/lib/characters/rules.ts`): known-casters (bard, sorcerer, warlock,
     * ranger) use `known` only; a wizard's `known` is their spellbook and
     * `prepared` the subset readied from it; cleric/druid/paladin prepare
     * straight from the full class list, so `known` is unused and `prepared`
     * is the whole story.
     */
    knownSpellIndexes: text('known_spell_indexes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    preparedSpellIndexes: text('prepared_spell_indexes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    /**
     * Chosen skill proficiencies and expertise, as dnd5eapi skill indexes
     * (DND-015, D21). The one derived-looking number the sheet cannot derive:
     * 5e has the player *choose* these. `skill_expertise` ⊆
     * `skill_proficiencies` is app logic, not a CHECK — the rules layer
     * filters, the same split as the attunement cap.
     */
    skillProficiencies: text('skill_proficiencies')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    skillExpertise: text('skill_expertise')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    // -----------------------------------------------------------------------
    // The 2024 build (srd-2024-migration/character-model-migration)
    // -----------------------------------------------------------------------
    //
    // Every column below is nullable with no default, and that is a deployment
    // rule before it is a modelling one: the production migrate job runs *in
    // parallel* with the Vercel deploy, so for a few seconds the old code is
    // talking to the new table. A `NOT NULL` add is an outage window in that
    // gap; a nullable add is invisible to code that has never heard of the
    // column. It also happens to say the true thing about a row written before
    // this migration — a character created under the 2014 model has no
    // background, and `NULL` is that, where `''` would be a background whose
    // name is empty.
    //
    // Indexes are SRD 5.2.1 slugs from `src/lib/srd/`, spelled exactly as the
    // 2014 indexes were, so a column holding `'fighter'` keeps its meaning.

    /**
     * The character's background (SRD 5.2.1), e.g. `'soldier'`.
     *
     * The single biggest change the 2024 rules made to character creation: a
     * background is where ability score increases come from and what grants
     * the Origin feat, both of which the species used to do.
     */
    backgroundIndex: text('background_index'),

    /**
     * How the background's ability score increases were spent: `'two-and-one'`
     * (+2 to one of its three abilities, +1 to another) or `'one-each'` (+1 to
     * all three). The keys are `BACKGROUND_ABILITY_SPREADS` in
     * `src/lib/srd/backgrounds.ts`, which is the source of truth — restated as
     * a union here only so a stored row types as one of the two, and held to it
     * by the zod enum in `src/lib/characters/schema.ts` (built from that
     * constant) rather than by a CHECK that would have to be migrated to change.
     */
    backgroundAbilitySpread: text('background_ability_spread').$type<'two-and-one' | 'one-each'>(),

    /**
     * Which abilities the spread was spent on, in the order it spends them —
     * so `['strength', 'constitution']` under `'two-and-one'` is +2 Strength,
     * +1 Constitution. Ability keys as `src/lib/characters/schema.ts` spells
     * them.
     *
     * Stored rather than folded into the six score columns, because those hold
     * the character's *final* scores as the player typed them (DND-008 takes
     * direct entry). Adding the increase again at render time would inflate
     * every derived number on the sheet. This is the record of the choice, and
     * what the creation wizard (`guided-creation`) will hand to
     * `abilityScoresWithBackground` when it starts from base scores instead.
     */
    backgroundAbilities: text('background_abilities').array(),

    /**
     * The Origin feat the background granted, e.g. `'magic-initiate'`.
     *
     * Its own column rather than derived from `background_index`, even though
     * the SRD's four backgrounds each name exactly one: the feat is the
     * character's, a DM may hand out a different one, and a derived value
     * cannot be corrected on a sheet.
     */
    originFeatIndex: text('origin_feat_index'),

    /**
     * The subclass chosen at 3rd level (SRD 5.2.1 uniform subclass level), e.g.
     * `'champion'`, or `NULL` below 3rd — and `NULL` is the honest value there,
     * not a placeholder: a 2nd-level fighter has no subclass, and listing
     * Improved Critical for them would be wrong in the direction that gets
     * someone to use a feature they do not have.
     */
    subclassIndex: text('subclass_index'),

    /**
     * The weapons this character has Weapon Mastery with, as SRD weapon
     * indexes — `['longsword', 'shortbow']`.
     *
     * Weapons, not mastery properties: the 2024 feature reads "you gain the
     * mastery property of N kinds of weapons of your choice", and each weapon
     * carries exactly one property. Storing the weapon keeps the choice the
     * player actually made, and the property follows from
     * `masteryFor(weaponIndex)`. How many they may hold is
     * `weaponMasteryCount(classIndex, level)`, which moves with the level — so
     * it is not a bound this column can carry.
     */
    masteredWeaponIndexes: text('mastered_weapon_indexes').array(),

    /**
     * Heroic Inspiration (SRD 5.2.1) — 2024's replacement for Inspiration.
     *
     * The one column in this block that is live session state rather than a
     * build field: it is handed out and spent mid-session, so the sheet owns it
     * and it goes through the same version guard every other in-play write has.
     * A flag rather than a counter because the rule is a flag — a second one is
     * lost unless you give it away (`HEROIC_INSPIRATION.max` is 1).
     *
     * `NULL` and `false` both mean "does not have it"; nothing reads the
     * difference, and `NULL` is simply what a row written before this migration
     * says.
     */
    heroicInspiration: boolean('heroic_inspiration'),

    /**
     * The feats taken at this character's Ability Score Improvement levels —
     * 4th, 8th, 12th, 16th and 19th, plus 6th and 14th for a Fighter and 10th
     * for a Rogue (`srd-2024-migration/asi-and-feats`).
     *
     * A record of the choice, *and* the ledger that makes it reversible: the
     * six score columns hold final scores as typed (DND-008), so an increase is
     * applied to them when it is taken, and levelling back down subtracts
     * exactly the entries it gives back. Rows written before this column have
     * `NULL`, which reads as "no history recorded" rather than "no feats" — so
     * levelling a 12th-level character down takes nothing off scores this app
     * never added.
     */
    featChoices: jsonb('feat_choices').$type<LevelFeat[]>(),

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
    // Null is "not counting XP" (see the column); a tracked total is never
    // negative. 5e's own ceiling is 355,000 at 20th, so the bound is slack
    // rather than tight — a table that keeps awarding past 20 is not wrong.
    check('characters_experience_positive', sql`${table.experience} >= 0`),
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
    check(
      'characters_death_save_successes_range',
      sql`${table.deathSaveSuccesses} between 0 and 3`,
    ),
    check('characters_death_save_failures_range', sql`${table.deathSaveFailures} between 0 and 3`),
    check('characters_exhaustion_range', sql`${table.exhaustion} between 0 and 6`),
    check('characters_hit_dice_used_positive', sql`${table.hitDiceUsed} >= 0`),
    check('characters_cp_positive', sql`${table.cp} >= 0`),
    check('characters_sp_positive', sql`${table.sp} >= 0`),
    check('characters_ep_positive', sql`${table.ep} >= 0`),
    check('characters_gp_positive', sql`${table.gp} >= 0`),
    check('characters_pp_positive', sql`${table.pp} >= 0`),
    // The 2024 columns get the same treatment: a bound a bad client cannot get
    // around, one column at a time. `cardinality(NULL)` is NULL, which a CHECK
    // reads as "not false" — so an unset column passes without a `coalesce`.
    // Three is the most abilities any spread spends; the mastery cap is slack
    // rather than tight (a 16th-level fighter holds six) because the real
    // ceiling moves with class and level, and only `weaponMasteryCount` knows it.
    check(
      'characters_background_abilities_size',
      sql`cardinality(${table.backgroundAbilities}) <= 3`,
    ),
    check(
      'characters_mastered_weapon_indexes_size',
      sql`cardinality(${table.masteredWeaponIndexes}) <= ${sql.raw(String(MAX_MASTERED_WEAPONS))}`,
    ),
  ],
)

/** A character row as read from the database. */
export type Character = typeof characters.$inferSelect

/** A character row as written to the database. */
export type NewCharacter = typeof characters.$inferInsert

// ---------------------------------------------------------------------------
// Inventory, first slice (DND-035)
// ---------------------------------------------------------------------------

/**
 * What a character carries — deliberately the *equipped* slice, not a full
 * ledger: the weapon and armour that produce an attack bonus, a damage die and
 * an AC, plus whatever else the player cares to note. Carrying capacity and
 * encumbrance are out of scope by ticket.
 *
 * `equipment_index` / `custom_name` are a nullable pair: a row is either a
 * dnd5eapi reference item (`equipment_index`, resolvable through
 * `/api/dnd5e/equipment/[index]`) or homebrew (`custom_name`), and the CHECK
 * demands at least one. Both set is fine — a renamed reference item.
 *
 * The 5e attunement cap of three is **app logic in `src/lib/db/items.ts`, not
 * a CHECK** — homebrew breaks it, so the database must not enforce it.
 */
export const characterItems = pgTable(
  'character_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),

    /** dnd5eapi equipment index, e.g. `'longsword'`. Null for homebrew. */
    equipmentIndex: text('equipment_index'),
    /** A homebrew item's name, or a rename of a reference item. */
    customName: text('custom_name'),

    quantity: smallint('quantity').notNull().default(1),
    equipped: boolean('equipped').notNull().default(false),
    attuned: boolean('attuned').notNull().default(false),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every read is "this character's items" — same pattern as
    // `characters_owner_id_idx`.
    index('character_items_character_id_idx').on(table.characterId),

    check('character_items_quantity_positive', sql`${table.quantity} >= 1`),

    // An item must be nameable: a reference index, a custom name, or both.
    check(
      'character_items_named',
      sql`${table.equipmentIndex} is not null or ${table.customName} is not null`,
    ),
  ],
)

/** An inventory row as read from the database. */
export type CharacterItem = typeof characterItems.$inferSelect

/** An inventory row as written to the database. */
export type NewCharacterItem = typeof characterItems.$inferInsert

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
// way it already orphans their characters. DND-044 tracks that as an Article 17
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

    /**
     * The way into a campaign (DND-046): the DM shares `/campaigns/join/<code>`
     * and a signed-in player attaches their character. Unguessable (128 random
     * bits, base64url), regenerable, and **not** a permission grant beyond
     * joining — knowing it lets you join the roster, nothing else. Nullable
     * because rows may predate it; the app treats null as "no live join link".
     */
    joinCode: text('join_code').unique(),

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
  ],
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
  ],
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
  ],
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

// ---------------------------------------------------------------------------
// Encounters (DND-031, register decisions D17 and D24)
// ---------------------------------------------------------------------------

/**
 * A fight, persisted between sessions (D17): it survives a page reload, a
 * phone lock and a week between game nights. Belongs to exactly one campaign,
 * and authority follows the campaign — `campaigns.dm_user_id` and nowhere
 * else, the same rule every other DM query obeys.
 *
 * `round`/`active_turn` are the stepper's state: the round counter starts at
 * 1 like the fiction does, and `active_turn` is a 0-based index into the
 * initiative order as sorted (initiative descending, unset sinking to the
 * bottom). It is an index rather than a combatant id so removing a combatant
 * cannot orphan the turn — the tracker clamps it.
 *
 * `share_token` is D24's table screen: 128 random bits, base64url, same
 * pattern as a campaign join code. Knowing it grants a read of the sanitized
 * player-visible view — never monster HP — and nothing else. Nullable: null
 * means no live table screen, and regenerating kills the old link.
 */
export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    round: smallint('round').notNull().default(1),
    activeTurn: smallint('active_turn').notNull().default(0),
    shareToken: text('share_token').unique(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // "Every encounter in this campaign" — the campaign page's list.
    index('encounters_campaign_id_idx').on(table.campaignId),

    check('encounters_name_not_blank', sql`length(btrim(${table.name})) > 0`),
    check('encounters_round_positive', sql`${table.round} >= 1`),
    check('encounters_active_turn_positive', sql`${table.activeTurn} >= 0`),
  ],
)

/**
 * One row per body in the fight. A combatant is **either** a reference to a
 * player character (`character_id`) **or** an ad-hoc monster instance
 * (`monster_index`, a dnd5eapi index) — the CHECK demands at least one.
 *
 * Monster HP is per instance (D17): three goblins are three rows, each owning
 * its own `current_hit_points`. **PC rows carry no hit points of their own**
 * — their HP columns stay null, because the character row is the single
 * source of truth (D13). The tracker reads and writes PC HP through the
 * characters data layer with its version guard, never through this table.
 *
 * `label` is the name on the tracker: "Goblin 3", or the character's name at
 * the moment it was added. `sort_order` breaks initiative ties and keeps
 * uninitiatived rows in insertion order.
 */
export const encounterCombatants = pgTable(
  'encounter_combatants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    encounterId: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'cascade' }),
    monsterIndex: text('monster_index'),
    label: text('label').notNull(),
    initiative: smallint('initiative'),
    sortOrder: smallint('sort_order').notNull().default(0),
    maxHitPoints: integer('max_hit_points'),
    currentHitPoints: integer('current_hit_points'),
    temporaryHitPoints: integer('temporary_hit_points').notNull().default(0),

    /** dnd5eapi condition indexes currently applied, e.g. `['prone']`. */
    conditions: text('conditions')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every read is "this encounter's combatants".
    index('encounter_combatants_encounter_id_idx').on(table.encounterId),

    check('encounter_combatants_label_not_blank', sql`length(btrim(${table.label})) > 0`),
    check(
      'encounter_combatants_temporary_hit_points_positive',
      sql`${table.temporaryHitPoints} >= 0`,
    ),

    // A combatant is a character or a monster — never neither.
    check(
      'encounter_combatants_identified',
      sql`${table.characterId} is not null or ${table.monsterIndex} is not null`,
    ),
  ],
)

/** An encounter row as read from / written to the database. */
export type Encounter = typeof encounters.$inferSelect
export type NewEncounter = typeof encounters.$inferInsert

/** A combatant row as read from / written to the database. */
export type EncounterCombatant = typeof encounterCombatants.$inferSelect
export type NewEncounterCombatant = typeof encounterCombatants.$inferInsert

// ---------------------------------------------------------------------------
// Global user roles (DND-047, register decision D19)
// ---------------------------------------------------------------------------

/**
 * One global role per user: `dm` or `player`.
 *
 * **This gates the DM tools, not the data.** A `dm` row lets a user see `/dm`
 * and create campaigns; what a DM may read or edit still flows from
 * `campaigns.dm_user_id` per campaign (DND-027), exactly as the warning on
 * `campaign_members` demands. **No row means `player`** — that is what makes
 * "every subsequent sign-up is a player" true without hooking sign-up, which
 * belongs to Neon's managed auth service and is not ours to hook.
 *
 * `user_id` is `neon_auth.user.id` as plain text with no foreign key, for the
 * reason settled at `:136-165`. The seed migration (`drizzle/0002`) marks
 * Jamie as `dm` and every user existing at migration time as `player`,
 * defensively: if `neon_auth.user` is not readable it warns instead of
 * failing the deploy, and the runbook carries the by-hand INSERT.
 */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: text('user_id').primaryKey(),
    role: text('role').notNull().default('player'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('user_roles_role_known', sql`${table.role} in ('dm', 'player')`)],
)

/** A role row as read from / written to the database. */
export type UserRoleRow = typeof userRoles.$inferSelect
export type NewUserRoleRow = typeof userRoles.$inferInsert

/** The roles a user may hold. Absence of a row reads as `'player'`. */
export const USER_ROLES = ['dm', 'player'] as const
export type UserRole = (typeof USER_ROLES)[number]

// ---------------------------------------------------------------------------
// Notes (DND-058)
// ---------------------------------------------------------------------------
//
// **Two tables, because the register legislates two different secrets.** "A
// DM's own notes are not player-readable; a player's per-character notes are
// their own" is one sentence describing two visibility rules that do not
// compose, and the reason they are separate tables rather than a `notes` column
// on `campaigns` and one on `characters` is worth stating once:
//
// A `characters.notes` column would be readable by every query that already
// reads a character row — and `getCharacter` / `getCampaignRoster` use the
// DND-027 viewer predicate, which is *deliberately* wider than the owner (a DM
// sees and edits their party's sheets, D13). The player's private notes would
// have ridden down with the DM party glance on the first paint. Their own table
// means no existing query can return them by accident: the only statements that
// touch `character_notes` are the owner-scoped ones in `src/lib/db/notes.ts`,
// and owner-scoped is the whole rule.
//
// Neither table has a `version` column, on purpose. Notes are not contested
// state — nobody races the DM for the session log the way two phones race one
// pool of spell slots — so writes here are plain saves and never answer 409.
// DND-028's guard stays on `characters`, where it earns its keep.

/**
 * One session's notes for one campaign (DND-058).
 *
 * Written up after the session *and* typed during it: `body` is plain text that
 * grows a line at a time from the quick-capture field on the campaign page and
 * the encounter tracker. Which note a quick capture lands in is decided by
 * `session_date` — see `appendToSessionNote` in `src/lib/db/notes.ts` — so the
 * date is the note's identity at a table, not decoration.
 *
 * `shared_with_players` is the register's visibility rule as a column, and it
 * defaults to **false**: a note is the DM's until they say otherwise, which is
 * the safe direction for a default to be wrong in. Players read the shared ones
 * through `listSharedNotesForCharacter`, which never selects an unshared row.
 *
 * Authority is the campaign's: `campaigns.dm_user_id` and nowhere else, folded
 * into every WHERE clause exactly as `encounters` does it. The cascade means
 * deleting a campaign takes its notes with it.
 */
export const campaignNotes = pgTable(
  'campaign_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),

    /**
     * The session this note is about, as a plain calendar date — `date` rather
     * than `timestamp` because "which game night" is the question, and a
     * timezone on it would only invite the wrong answer. `mode: 'string'` keeps
     * it a `YYYY-MM-DD` string end to end, so it survives the trip through JSON
     * and into an `<input type="date">` without a parse.
     */
    sessionDate: date('session_date', { mode: 'string' })
      .notNull()
      .default(sql`current_date`),

    body: text('body').notNull(),

    /** False until the DM shares it. See the type doc above. */
    sharedWithPlayers: boolean('shared_with_players').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every read is "this campaign's notes", newest session first.
    index('campaign_notes_campaign_id_idx').on(table.campaignId),

    // Same spirit as `encounters_name_not_blank`: a blank note renders as an
    // empty block the UI would then have to defend against. The API refuses a
    // blank body before it gets here; this is the backstop.
    check('campaign_notes_body_not_blank', sql`length(btrim(${table.body})) > 0`),
  ],
)

/**
 * A player's private notes for one character (DND-058) — "owe 50gp to the
 * smith", "the mayor is lying". **Owner-only, and the DM cannot read them**,
 * which is the one thing this table exists to guarantee; see the section
 * comment above for why that made it a table rather than a column.
 *
 * Keyed by `character_id` alone: a character has one notebook, so the write is
 * a single-row upsert, which is what `neon-http` having no transactions asks
 * for. No `owner_id` column — ownership is `characters.owner_id`, and copying
 * it here would be a second answer to a question that already has one.
 */
export const characterNotes = pgTable('character_notes', {
  characterId: uuid('character_id')
    .primaryKey()
    .references(() => characters.id, { onDelete: 'cascade' }),

  body: text('body').notNull().default(''),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** A campaign note as read from / written to the database. */
export type CampaignNote = typeof campaignNotes.$inferSelect
export type NewCampaignNote = typeof campaignNotes.$inferInsert

/** A character's private notes as read from / written to the database. */
export type CharacterNote = typeof characterNotes.$inferSelect
export type NewCharacterNote = typeof characterNotes.$inferInsert
