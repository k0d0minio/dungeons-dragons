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
// **The portrait obeys a second rule, added by `locations-handouts`: the store
// key never leaves this file.** `campaign_npcs.portrait` addresses a *private*
// blob, and that address reaching a browser — as API JSON, or as the RSC
// payload of a server component's props — would undo the reason the blob is
// private. So every read below returns {@link NpcForDm}, whose `portrait` is
// metadata only, and {@link loadNpcPortrait} is the single unredacted read,
// called by exactly one caller: the route that serves or replaces the bytes.
//
// `neon-http` cannot do transactions, so every write here is a single row.
import { and, asc, eq } from 'drizzle-orm'

import { imageMeta, type ImageMeta, type StoredImage } from '@/lib/images/schema'

import { getDb } from './client'
import { campaignRunBy, isRowId, revealStamp, runByDm } from './revealable'
import { campaignNpcs, type CampaignNpc } from './schema'

export type { CampaignNpc } from './schema'

/**
 * An NPC as everything above the data layer sees one: the whole row, with the
 * portrait reduced to "there is one, and it is this big".
 */
export type NpcForDm = Omit<CampaignNpc, 'portrait'> & { portrait: ImageMeta | null }

/** The redaction. One function, applied on every way out of this module. */
function dmView(npc: CampaignNpc): NpcForDm {
  return { ...npc, portrait: imageMeta(npc.portrait) }
}

/**
 * The **only** selection a player-facing read of an NPC may name.
 *
 * `src/lib/db/discovered.ts` selects this and nothing else, alongside
 * `revealedOnly(campaignNpcs)`. The resulting `PublicNpc` has no `motivation`,
 * `secrets`, `twist`, `stat_reference` or `dm_notes` on it, so a leak is a
 * compile error rather than a code review someone has to catch. The table
 * screen's featured reveal narrows this further still — see `encounters.ts`,
 * which takes two of these columns and is allowed no more than that.
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
): Promise<NpcForDm[] | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const rows = await getDb()
    .select()
    .from(campaignNpcs)
    .where(and(eq(campaignNpcs.campaignId, campaignId), runByDm(campaignNpcs, dmUserId)))
    .orderBy(asc(campaignNpcs.name), asc(campaignNpcs.createdAt))

  return rows.map(dmView)
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
): Promise<NpcForDm | null> {
  if (!isRowId(campaignId)) return null

  // Authority before the write: the insert cannot carry an EXISTS, so this
  // scoped read is what stands between a stranger and a row in someone else's
  // campaign.
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const [npc] = await getDb()
    .insert(campaignNpcs)
    .values({ ...input, campaignId })
    .returning()

  return npc ? dmView(npc) : null
}

/** Apply `patch` to one NPC in a campaign `dmUserId` runs. `null` on a miss. */
export async function updateCampaignNpc(
  dmUserId: string,
  campaignId: string,
  npcId: string,
  patch: NpcPatch,
): Promise<NpcForDm | null> {
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

  return npc ? dmView(npc) : null
}

/**
 * Reveal this NPC to the party, or take the reveal back
 * (`dm-run-suite/reveal-controls`).
 *
 * The **only** statement in this file that writes `revealed_at`, and the value
 * it writes comes from {@link revealStamp} rather than being spelled here — so
 * "revealed" means one thing across all three prep entities: a timestamp when
 * shown, null when not. There is no second flag to fall out of step with it.
 *
 * Separate from {@link updateCampaignNpc} rather than another key in
 * `NpcPatch`, because these are different acts with different consequences. An
 * edit changes prep only the DM reads; this one puts a name on five phones and
 * a shared screen within a poll, and a route that can do both is a route where
 * a typo in a field name reveals an NPC.
 *
 * Un-revealing is a first-class outcome, not a repair: a misclick at the table
 * has to be undoable in one tap, and `revealStamp(false)` clears the timestamp
 * rather than keeping it beside a false flag.
 */
export async function setNpcRevealed(
  dmUserId: string,
  campaignId: string,
  npcId: string,
  revealed: boolean,
): Promise<NpcForDm | null> {
  if (!isRowId(campaignId) || !isRowId(npcId)) return null

  const [npc] = await getDb()
    .update(campaignNpcs)
    .set({ ...revealStamp(revealed), updatedAt: new Date() })
    .where(
      and(
        eq(campaignNpcs.id, npcId),
        eq(campaignNpcs.campaignId, campaignId),
        runByDm(campaignNpcs, dmUserId),
      ),
    )
    .returning()

  return npc ? dmView(npc) : null
}

/**
 * Delete one NPC, and say what portrait went with them.
 *
 * `deleted: false` is the miss; the image is returned separately so the caller
 * can forget the object too, because "deleted, and they had no portrait" is a
 * real outcome that must not read as a miss.
 */
export async function deleteCampaignNpc(
  dmUserId: string,
  campaignId: string,
  npcId: string,
): Promise<{ deleted: boolean; portrait: StoredImage | null }> {
  if (!isRowId(campaignId) || !isRowId(npcId)) return { deleted: false, portrait: null }

  const [row] = await getDb()
    .delete(campaignNpcs)
    .where(
      and(
        eq(campaignNpcs.id, npcId),
        eq(campaignNpcs.campaignId, campaignId),
        runByDm(campaignNpcs, dmUserId),
      ),
    )
    .returning({ id: campaignNpcs.id, portrait: campaignNpcs.portrait })

  return { deleted: row !== undefined, portrait: row?.portrait ?? null }
}

/**
 * The store descriptor for one NPC's portrait — **the one unredacted read**.
 *
 * Outer `null` is "no such NPC for this DM"; an inner `portrait: null` is
 * "that NPC has no picture". Different answers, different statuses.
 */
export async function loadNpcPortrait(
  dmUserId: string,
  campaignId: string,
  npcId: string,
): Promise<{ image: StoredImage | null } | null> {
  if (!isRowId(campaignId) || !isRowId(npcId)) return null

  const [row] = await getDb()
    .select({ portrait: campaignNpcs.portrait })
    .from(campaignNpcs)
    .where(
      and(
        eq(campaignNpcs.id, npcId),
        eq(campaignNpcs.campaignId, campaignId),
        runByDm(campaignNpcs, dmUserId),
      ),
    )
    .limit(1)

  return row ? { image: row.portrait ?? null } : null
}

/**
 * Point an NPC at a stored portrait, or at nothing.
 *
 * Called only after the object exists in the store (attach) or after the
 * caller has decided to forget it (detach); deleting the previous object is
 * the caller's next step, not this function's business.
 */
export async function setNpcPortrait(
  dmUserId: string,
  campaignId: string,
  npcId: string,
  portrait: StoredImage | null,
): Promise<NpcForDm | null> {
  if (!isRowId(campaignId) || !isRowId(npcId)) return null

  const [npc] = await getDb()
    .update(campaignNpcs)
    .set({ portrait, updatedAt: new Date() })
    .where(
      and(
        eq(campaignNpcs.id, npcId),
        eq(campaignNpcs.campaignId, campaignId),
        runByDm(campaignNpcs, dmUserId),
      ),
    )
    .returning()

  return npc ? dmView(npc) : null
}
