// Typed data access for campaign locations (`dm-prep-suite/locations-handouts`).
//
// The same five statements `npcs.ts` has, against a different table, and
// deliberately not generalised into one: the shared parts — the authority
// EXISTS, the pre-insert read, the reveal predicates — already live in
// `revealable.ts` and are imported, so what is left per entity is the column
// list and the ORDER BY, and a factory that abstracted *those* would hide the
// only two things worth reading here.
//
// Every statement folds `campaigns.dm_user_id` into its WHERE through
// `runByDm`, and the INSERT — which cannot carry an EXISTS — is preceded by
// `campaignRunBy`. A campaign someone else runs and one that never existed are
// indistinguishable from the outside: both are `null`, which the routes turn
// into 404, never 403.
import { and, asc, eq } from 'drizzle-orm'

import { getDb } from './client'
import { campaignRunBy, isRowId, runByDm } from './revealable'
import { campaignLocations, type CampaignLocation } from './schema'

export type { CampaignLocation } from './schema'

/**
 * The **only** selection a player-facing read of a location may name.
 *
 * Unused, like `npcPublicColumns` was when it landed, and here for the same
 * reason: `dm-run-suite/reveal-controls` is what adds the player surface, and
 * the safety property is easier to state now than to remember then. The
 * `PublicLocation` this produces has no `secrets` and no `dmNotes` on it, so
 * leaking either would be a compile error rather than a review someone has to
 * catch.
 */
export const locationPublicColumns = {
  id: campaignLocations.id,
  campaignId: campaignLocations.campaignId,
  name: campaignLocations.name,
  summary: campaignLocations.summary,
  description: campaignLocations.description,
  revealedAt: campaignLocations.revealedAt,
} as const

/** A location as a player would read it: the public layer, and nothing else. */
export type PublicLocation = Pick<
  CampaignLocation,
  'id' | 'campaignId' | 'name' | 'summary' | 'description' | 'revealedAt'
>

/** The fields a DM may write. `null` clears one; omitted leaves it alone. */
export type LocationPatch = Partial<
  Pick<CampaignLocation, 'name' | 'summary' | 'description' | 'secrets' | 'dmNotes'>
>

/** A new location: a name, and as much of the rest as exists yet. */
export type NewLocationInput = LocationPatch & { name: string }

/**
 * Every location in a campaign `dmUserId` runs, **both layers**, by name.
 *
 * Alphabetical for the same reason the roster is: mid-scene a DM is looking up
 * a place whose name they already have, not reading a feed. `null` when there
 * is no such campaign for this DM — distinct from a campaign with nowhere in
 * it yet, so the page 404s rather than offering to add a place to someone
 * else's table.
 */
export async function listCampaignLocations(
  dmUserId: string,
  campaignId: string,
): Promise<CampaignLocation[] | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  return getDb()
    .select()
    .from(campaignLocations)
    .where(and(eq(campaignLocations.campaignId, campaignId), runByDm(campaignLocations, dmUserId)))
    .orderBy(asc(campaignLocations.name), asc(campaignLocations.createdAt))
}

/**
 * Write a new location into a campaign `dmUserId` runs.
 *
 * `revealed_at` is not settable here and is left to its nullable default:
 * prep starts hidden, and revealing is `dm-run-suite/reveal-controls`' act.
 * There is no path through this file that creates an already-revealed row.
 */
export async function createCampaignLocation(
  dmUserId: string,
  campaignId: string,
  input: NewLocationInput,
): Promise<CampaignLocation | null> {
  if (!isRowId(campaignId)) return null

  // Authority before the write: the insert cannot carry an EXISTS, so this
  // scoped read is what stands between a stranger and a row in someone else's
  // campaign.
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const [location] = await getDb()
    .insert(campaignLocations)
    .values({ ...input, campaignId })
    .returning()

  return location ?? null
}

/** Apply `patch` to one location in a campaign `dmUserId` runs. `null` on a miss. */
export async function updateCampaignLocation(
  dmUserId: string,
  campaignId: string,
  locationId: string,
  patch: LocationPatch,
): Promise<CampaignLocation | null> {
  if (!isRowId(campaignId) || !isRowId(locationId)) return null

  const [location] = await getDb()
    .update(campaignLocations)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(campaignLocations.id, locationId),
        eq(campaignLocations.campaignId, campaignId),
        runByDm(campaignLocations, dmUserId),
      ),
    )
    .returning()

  return location ?? null
}

/** Delete one location. `false` when there was nothing this DM could delete. */
export async function deleteCampaignLocation(
  dmUserId: string,
  campaignId: string,
  locationId: string,
): Promise<boolean> {
  if (!isRowId(campaignId) || !isRowId(locationId)) return false

  const deleted = await getDb()
    .delete(campaignLocations)
    .where(
      and(
        eq(campaignLocations.id, locationId),
        eq(campaignLocations.campaignId, campaignId),
        runByDm(campaignLocations, dmUserId),
      ),
    )
    .returning({ id: campaignLocations.id })

  return deleted.length > 0
}
