// Typed data access for campaign handouts (`dm-prep-suite/locations-handouts`).
//
// The authority model is `npcs.ts`': every statement folds
// `campaigns.dm_user_id` into its WHERE through `runByDm`, the INSERT is
// preceded by `campaignRunBy`, and a miss is `null` rather than a 403.
//
// **What is new here is the image, and one rule governs it: the store key never
// leaves this file.** A handout row carries a {@link StoredImage} whose
// `pathname` addresses a private blob. That value reaching a browser would put
// the app one leaked string away from the thing the private store exists to
// prevent — and rows reach browsers two ways, as JSON from the API and as the
// RSC payload of a server component's props. So the reads below return
// {@link HandoutForDm}, whose `image` is metadata only, and the single function
// that hands back the real descriptor ({@link loadHandoutImage}) is called by
// exactly one caller: the route that serves or replaces the bytes.
//
// `neon-http` cannot do transactions, so attaching an image is two statements
// and the order is fixed: the blob is written first, then the column. See
// `src/lib/images/store.ts` for why that way round.
import { and, asc, eq } from 'drizzle-orm'

import { imageMeta, type ImageMeta, type StoredImage } from '@/lib/images/schema'

import { getDb } from './client'
import { campaignRunBy, isRowId, runByDm } from './revealable'
import { campaignHandouts, type CampaignHandout } from './schema'

export type { CampaignHandout } from './schema'

/**
 * A handout as everything above the data layer sees one.
 *
 * Identical to the row except that `image` says *that there is one* and how big
 * it is, not where it lives. Every read in this module returns this; nothing
 * else can, because nothing else has the row.
 */
export type HandoutForDm = Omit<CampaignHandout, 'image'> & { image: ImageMeta | null }

/** The redaction. One function, applied on every way out of this module. */
function dmView(handout: CampaignHandout): HandoutForDm {
  return { ...handout, image: imageMeta(handout.image) }
}

/**
 * The **only** selection a player-facing read of a handout may name.
 *
 * `image` is absent on purpose even though a revealed handout's picture is
 * exactly what a player is meant to see: what they will be given is the authed
 * route's URL, built from the id, not the store key. Nothing player-facing
 * exists yet — `dm-run-suite/reveal-controls` is what adds it, alongside
 * `revealedOnly(campaignHandouts)`.
 */
export const handoutPublicColumns = {
  id: campaignHandouts.id,
  campaignId: campaignHandouts.campaignId,
  title: campaignHandouts.title,
  body: campaignHandouts.body,
  revealedAt: campaignHandouts.revealedAt,
} as const

/** A handout as a player would read it: the public layer, and nothing else. */
export type PublicHandout = Pick<
  CampaignHandout,
  'id' | 'campaignId' | 'title' | 'body' | 'revealedAt'
>

/**
 * The text fields a DM may write. The image is not among them: it arrives as
 * bytes on its own endpoint, never as a value in a JSON patch, so there is no
 * request shape in this app that can point a handout at an arbitrary object.
 */
export type HandoutPatch = Partial<
  Pick<CampaignHandout, 'title' | 'body' | 'provenance' | 'dmNotes'>
>

/** A new handout: a title, and whatever else is written down yet. */
export type NewHandoutInput = HandoutPatch & { title: string }

/**
 * Every handout in a campaign `dmUserId` runs, **both layers**, by title.
 *
 * Alphabetical, matching the roster: a handout is looked up by the name the DM
 * gave it, in the middle of the scene it belongs to.
 */
export async function listCampaignHandouts(
  dmUserId: string,
  campaignId: string,
): Promise<HandoutForDm[] | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const rows = await getDb()
    .select()
    .from(campaignHandouts)
    .where(and(eq(campaignHandouts.campaignId, campaignId), runByDm(campaignHandouts, dmUserId)))
    .orderBy(asc(campaignHandouts.title), asc(campaignHandouts.createdAt))

  return rows.map(dmView)
}

/**
 * Write a new handout into a campaign `dmUserId` runs.
 *
 * Text only — a handout is created, then its image is uploaded to the row that
 * now exists. `revealed_at` is left to its nullable default: prep starts hidden.
 */
export async function createCampaignHandout(
  dmUserId: string,
  campaignId: string,
  input: NewHandoutInput,
): Promise<HandoutForDm | null> {
  if (!isRowId(campaignId)) return null
  if (!(await campaignRunBy(dmUserId, campaignId))) return null

  const [handout] = await getDb()
    .insert(campaignHandouts)
    .values({ ...input, campaignId })
    .returning()

  return handout ? dmView(handout) : null
}

/** Apply `patch` to one handout in a campaign `dmUserId` runs. `null` on a miss. */
export async function updateCampaignHandout(
  dmUserId: string,
  campaignId: string,
  handoutId: string,
  patch: HandoutPatch,
): Promise<HandoutForDm | null> {
  if (!isRowId(campaignId) || !isRowId(handoutId)) return null

  const [handout] = await getDb()
    .update(campaignHandouts)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(campaignHandouts.id, handoutId),
        eq(campaignHandouts.campaignId, campaignId),
        runByDm(campaignHandouts, dmUserId),
      ),
    )
    .returning()

  return handout ? dmView(handout) : null
}

/**
 * Delete one handout. `false` when there was nothing this DM could delete.
 *
 * Returns the image the row was carrying so the caller can forget the object
 * too — a deleted handout whose blob survives is a secret still sitting in the
 * store. `deleted: false` is the miss, and the two are separate fields rather
 * than a nullable return because "deleted, and it had no image" is a real
 * outcome that must not read as a miss.
 */
export async function deleteCampaignHandout(
  dmUserId: string,
  campaignId: string,
  handoutId: string,
): Promise<{ deleted: boolean; image: StoredImage | null }> {
  if (!isRowId(campaignId) || !isRowId(handoutId)) return { deleted: false, image: null }

  const [row] = await getDb()
    .delete(campaignHandouts)
    .where(
      and(
        eq(campaignHandouts.id, handoutId),
        eq(campaignHandouts.campaignId, campaignId),
        runByDm(campaignHandouts, dmUserId),
      ),
    )
    .returning({ id: campaignHandouts.id, image: campaignHandouts.image })

  return { deleted: row !== undefined, image: row?.image ?? null }
}

/**
 * The store descriptor for one handout's image — **the one unredacted read**.
 *
 * The outer `null` is "no such handout for this DM"; an inner `image: null` is
 * "that handout has no picture". They are different answers and the image
 * route sends different statuses for them, which is why this does not collapse
 * to a single nullable value.
 */
export async function loadHandoutImage(
  dmUserId: string,
  campaignId: string,
  handoutId: string,
): Promise<{ image: StoredImage | null } | null> {
  if (!isRowId(campaignId) || !isRowId(handoutId)) return null

  const [row] = await getDb()
    .select({ image: campaignHandouts.image })
    .from(campaignHandouts)
    .where(
      and(
        eq(campaignHandouts.id, handoutId),
        eq(campaignHandouts.campaignId, campaignId),
        runByDm(campaignHandouts, dmUserId),
      ),
    )
    .limit(1)

  return row ? { image: row.image ?? null } : null
}

/**
 * Point a handout at a stored image, or at nothing.
 *
 * Called only after the object exists in the store (attach) or after the
 * caller has decided to forget it (detach). Deleting the *previous* object is
 * the caller's next step and not this function's business — the column is what
 * makes an image the handout's, and it is already correct when this returns.
 */
export async function setHandoutImage(
  dmUserId: string,
  campaignId: string,
  handoutId: string,
  image: StoredImage | null,
): Promise<HandoutForDm | null> {
  if (!isRowId(campaignId) || !isRowId(handoutId)) return null

  const [handout] = await getDb()
    .update(campaignHandouts)
    .set({ image, updatedAt: new Date() })
    .where(
      and(
        eq(campaignHandouts.id, handoutId),
        eq(campaignHandouts.campaignId, campaignId),
        runByDm(campaignHandouts, dmUserId),
      ),
    )
    .returning()

  return handout ? dmView(handout) : null
}
