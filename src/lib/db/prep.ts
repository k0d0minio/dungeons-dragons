// What the Prep tab counts (`dm-chronology/prep-tab`).
//
// The tab is a set of value rows — "12 · 4 revealed", "2 ready", "5 · 1 not
// ready" — and this is the one module behind them: **one function per entity
// family**, each DM-scoped through `runByDm`, each selecting the smallest
// thing that answers its row.
//
// Two properties are worth stating, because they are the reason this is a
// module rather than five counts written into a page:
//
// - **None of these selects a DM-only column.** A tally of NPCs is a number
//   and a number of revealed ones; it never reads a secret to produce one. So
//   the Prep tab, which is a server component handing props to the browser,
//   cannot ship a campaign's prep down to render a count of it.
// - **Every statement carries `runByDm`.** The counts are cheap and there are
//   five of them, which is exactly the shape where somebody eventually writes
//   the sixth without the authority arm. Sharing `tally` means the three
//   revealable families carry *identical* authority, and the two that cannot
//   share it (encounters have no reveal, characters are not a prep entity)
//   fold the same fragment in by hand, one line each.
import { and, eq, sql } from 'drizzle-orm'

import { characterReadiness, readinessOutstanding } from '@/lib/characters/readiness'

import { getDb } from './client'
import { readinessItemsByCharacter } from './items'
import { isRowId, runByDm } from './revealable'
import {
  campaignHandouts,
  campaignLocations,
  campaignNpcs,
  characterCampaigns,
  characters,
  encounters,
} from './schema'

/** A revealable family: how much has been written, and how much is public. */
export interface RevealTally {
  total: number
  revealed: number
}

/** The fights: how many exist, and how many are still to run. */
export interface FightTally {
  total: number
  /** `completed_at is null` — a fight built and not yet called over. */
  ready: number
}

/** The party: how many characters, and how many the night would trip up. */
export interface PartyTally {
  total: number
  notReady: number
}

const NO_REVEALS: RevealTally = { total: 0, revealed: 0 }

/** The three tables that are campaign-scoped, revealable and counted alike. */
type RevealableFamily = typeof campaignNpcs | typeof campaignLocations | typeof campaignHandouts

/**
 * "How many, and how many revealed", for one revealable family.
 *
 * `count(revealed_at)` rather than a filtered count: a null timestamp is a
 * hidden row, and counting a nullable column is Postgres already saying so.
 */
async function tally(
  table: RevealableFamily,
  dmUserId: string,
  campaignId: string,
): Promise<RevealTally> {
  if (!isRowId(campaignId)) return NO_REVEALS

  const [row] = await getDb()
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      revealed: sql<number>`count(${table.revealedAt})`.mapWith(Number),
    })
    .from(table)
    .where(and(eq(table.campaignId, campaignId), runByDm(table, dmUserId)))

  return row ?? NO_REVEALS
}

/** Everyone the party might meet, and how many they have met. */
export async function countCampaignNpcs(
  dmUserId: string,
  campaignId: string,
): Promise<RevealTally> {
  return tally(campaignNpcs, dmUserId, campaignId)
}

/** Everywhere they might go, and how much of the map they have. */
export async function countCampaignLocations(
  dmUserId: string,
  campaignId: string,
): Promise<RevealTally> {
  return tally(campaignLocations, dmUserId, campaignId)
}

/** What is staged to hand over, and what is already in their hands. */
export async function countCampaignHandouts(
  dmUserId: string,
  campaignId: string,
): Promise<RevealTally> {
  return tally(campaignHandouts, dmUserId, campaignId)
}

/**
 * The fights built for this campaign, and the ones still to run.
 *
 * `encounters` predates `revealableColumns()` and has no `revealed_at` — a
 * fight is not something the party is shown, it is something that happens to
 * them — so this is its own statement rather than a fourth call to `tally`.
 * The authority fragment is the same one.
 */
export async function countCampaignEncounters(
  dmUserId: string,
  campaignId: string,
): Promise<FightTally> {
  if (!isRowId(campaignId)) return { total: 0, ready: 0 }

  const [row] = await getDb()
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      ready: sql<number>`count(*) filter (where ${encounters.completedAt} is null)`.mapWith(Number),
    })
    .from(encounters)
    .where(and(eq(encounters.campaignId, campaignId), runByDm(encounters, dmUserId)))

  return row ?? { total: 0, ready: 0 }
}

/**
 * The party, and how many of them are not ready for a night
 * (`first-table/creation-readiness`).
 *
 * Two statements: the roster, then the packs of exactly those characters.
 * `characterReadiness` then decides each one, so this number and the amber
 * dots on the character's own DM page are the same rule — the Prep tab never
 * re-derives what "ready" means.
 *
 * Scoped through `character_campaigns`, whose `campaign_id` carries `runByDm`
 * exactly as a prep table's does: a campaign this DM does not run counts
 * nobody, which is the same answer as a campaign with an empty roster and
 * that is fine — this is a tally on a tab, not a route that has to 404.
 */
export async function countPartyReadiness(
  dmUserId: string,
  campaignId: string,
): Promise<PartyTally> {
  if (!isRowId(campaignId)) return { total: 0, notReady: 0 }

  const party = await getDb()
    .select({
      id: characters.id,
      classIndex: characters.classIndex,
      level: characters.level,
      strength: characters.strength,
      dexterity: characters.dexterity,
      spellSlots: characters.spellSlots,
      masteredWeaponIndexes: characters.masteredWeaponIndexes,
      skillProficiencies: characters.skillProficiencies,
    })
    .from(characterCampaigns)
    .innerJoin(characters, eq(characterCampaigns.characterId, characters.id))
    .where(
      and(eq(characterCampaigns.campaignId, campaignId), runByDm(characterCampaigns, dmUserId)),
    )

  if (party.length === 0) return { total: 0, notReady: 0 }

  const packs = await readinessItemsByCharacter(party.map((character) => character.id))

  const notReady = party.filter(
    (character) =>
      readinessOutstanding(characterReadiness(character, packs[character.id] ?? [])) > 0,
  ).length

  return { total: party.length, notReady }
}
