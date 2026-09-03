// Typed data access for campaign NPCs (`dm-prep-suite/npc-roster`, D38).
//
// The first revealable prep entity, and the reference implementation for the
// two that follow. Everything authority-shaped is imported from
// `revealable.ts` rather than restated, so "a DM's prep is the DM's" is one
// property proved in one place: every statement here folds
// `campaigns.dm_user_id` into its WHERE clause through `runByDm`, and the one
// statement that cannot carry an EXISTS — the INSERT — is preceded by
// `campaignRunBy`. A foreign or fictional id is indistinguishable either way:
// a miss is `null`, which the routes turn into 404, never 403.
//
// **The public/DM-only split is enforced by `npcPublicColumns`.** The DM-side
// reads below select whole rows, which is correct — they answer to the DM. A
// player-facing read (`dm-run-suite/reveal-controls`) must name that selection
// and `revealedOnly()`, and gets a type that has no DM-only field on it, so
// leaking a secret would have to be written on purpose.
//
// `neon-http` cannot do transactions, so every write here is a single row.
import { and, asc, eq } from 'drizzle-orm'

import { getDb } from './client'
import { campaignRunBy, isRowId, runByDm } from './revealable'
import { campaignNpcs, type CampaignNpc } from './schema'

export type { CampaignNpc } from './schema'

/**
 * The **only** selection a player-facing read of an NPC may name.
 *
 * Not used yet — nothing is player-visible in this stub — and here anyway,
 * because the property it carries is one that is easy to state now and easy to
 * get wrong later. `reveal-controls` selects this and nothing else, alongside
 * `revealedOnly(campaignNpcs)`; the resulting `PublicNpc` has no
 * `motivation`, `secrets`, `twist`, `stat_reference` or `dm_notes` on it, so a
 * leak is a compile error rather than a code review someone has to catch.
 */
export const npcPublicColumns = {
  id: campaignNpcs.id,
  campaignId: campaignNpcs.campaignId,
  name: campaignNpcs.name,
  summary: campaignNpcs.summary,
  description: campaignNpcs.description,
  revealedAt: campaignNpcs.revealedAt,
} as const

/** An NPC as a player would read it: the public layer, and nothing else. */
export type PublicNpc = Pick<
  CampaignNpc,
  'id' | 'campaignId' | 'name' | 'summary' | 'description' | 'revealedAt'
>

/** The fields a DM may write on an NPC. `null` clears one; omitted leaves it. */
export type NpcPatch = Partial<
  Pick<
    CampaignNpc,
    | 'name'
    | 'summary'
    | 'description'
    | 'motivation'
    | 'secrets'
    | 'twist'
    | 'statReference'
    | 'dmNotes'
  >
>

/** A new NPC: a name, and as much or as little of the rest as exists yet. */
export type NewNpcInput = NpcPatch & { name: string }

/**
 * Every NPC in a campaign `dmUserId` runs, **both layers**, by name.
 *
 * Alphabetical rather than newest-first: a roster is something a DM scans for a
 * name they already have in mind mid-scene, which is a different job from a
 * notes list you read from the top. `null` when there is no such campaign for
 * this DM — distinct from a campaign with an empty roster, so the page 404s
 * rather than offering to add an NPC to someone else's table.
 */
export async function listCampaignNpcs(
  dmUserId: string,
  campaignId: string,
): Promise<CampaignNpc[] | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  return getDb()
    .select()
    .from(campaignNpcs)
    .where(and(eq(campaignNpcs.campaignId, campaignId), runByDm(campaignNpcs, dmUserId)))
    .orderBy(asc(campaignNpcs.name), asc(campaignNpcs.createdAt))
}

/**
 * Write a new NPC into a campaign `dmUserId` runs.
 *
 * `revealed_at` is not settable here and is left to its nullable default:
 * campaign content starts hidden, and revealing is a deliberate later act
 * (`dm-run-suite/reveal-controls`). There is no path through this file that
 * creates an already-revealed row.
 */
export async function createCampaignNpc(
  dmUserId: string,
  campaignId: string,
  input: NewNpcInput,
): Promise<CampaignNpc | null> {
  if (!isRowId(campaignId)) return null

  // Authority before the write: the insert cannot carry an EXISTS, so this
  // scoped read is what stands between a stranger and a row in someone else's
  // campaign.
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const [npc] = await getDb()
    .insert(campaignNpcs)
    .values({ ...input, campaignId })
    .returning()

  return npc ?? null
}

/** Apply `patch` to one NPC in a campaign `dmUserId` runs. `null` on a miss. */
export async function updateCampaignNpc(
  dmUserId: string,
  campaignId: string,
  npcId: string,
  patch: NpcPatch,
): Promise<CampaignNpc | null> {
  if (!isRowId(campaignId) || !isRowId(npcId)) return null

  const [npc] = await getDb()
    .update(campaignNpcs)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(campaignNpcs.id, npcId),
        eq(campaignNpcs.campaignId, campaignId),
        runByDm(campaignNpcs, dmUserId),
      ),
    )
    .returning()

  return npc ?? null
}

/** Delete one NPC. `false` when there was nothing this DM could delete. */
export async function deleteCampaignNpc(
  dmUserId: string,
  campaignId: string,
  npcId: string,
): Promise<boolean> {
  if (!isRowId(campaignId) || !isRowId(npcId)) return false

  const deleted = await getDb()
    .delete(campaignNpcs)
    .where(
      and(
        eq(campaignNpcs.id, npcId),
        eq(campaignNpcs.campaignId, campaignId),
        runByDm(campaignNpcs, dmUserId),
      ),
    )
    .returning({ id: campaignNpcs.id })

  return deleted.length > 0
}
