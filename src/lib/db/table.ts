// The campaign's table screen, and everything the DM casts onto it
// (`dm-run-suite/table-screen-cast`).
//
// **This file is a disclosure boundary, like `discovered.ts` and for a harder
// reason: there is no session behind it at all.** The token in the URL is the
// entire credential — 128 unguessable bits the DM opened on a laptop and left
// on the table — so what these functions return *is* the surface, and the rules
// they hold to are the same three `discovered.ts` states, minus the one it has
// that this cannot:
//
// 1. **The token stands in for membership.** `campaignByToken` is the only way
//    in, and every read below takes the campaign it returns rather than an id
//    off a URL, so nothing here can be pointed at another table.
// 2. **`revealedOnly`** — the party has been shown this. Casting an NPC that
//    was hidden *reveals* it (see {@link setCampaignSpotlight}), so the screen
//    can never be showing something the players' own phones would deny; the
//    arm stays on the read anyway, because a reveal that happened one write ago
//    can be taken back and this is the statement that must notice.
// 3. **A named public-column selection.** `npcPublicColumns` and its two
//    siblings, and for a character the explicit list `tableSheet` needs. No
//    statement below writes `select()` on a prep table.
//
// **The one thing this screen shows that no player-facing surface showed
// before** is a character sheet, and it is stripped in
// `src/lib/campaigns/table-sheet.ts` — read the list of what is left out
// there, because it is the interesting half.
//
// **SRD entries are not resolved here at all.** A cast monster, spell or
// condition reaches the screen as `{kind, index}` and the browser fetches it
// from `/api/srd/*`, the public CDN-cached reference data (D34). So a stat
// block on the wall is the *book's* page: this campaign's goblin and its
// remaining hit points stay behind D24's line, which no longer needs restating
// because there is no statement here that could cross it.
import { and, eq, isNull } from 'drizzle-orm'

import {
  isCampaignSpotlight,
  parseSpotlight,
  stampSpotlight,
  type SpotlightTarget,
  type TableSpotlight,
} from '@/lib/campaigns/spotlight'
import { tableSheet, type TableSheet } from '@/lib/campaigns/table-sheet'
import { imageMeta, type StoredImage } from '@/lib/images/schema'

import { generateJoinCode } from './campaigns'
import { getDb } from './client'
import {
  getLiveTableEncounter,
  latestReveal,
  type TableEncounter,
  type TableReveal,
} from './encounters'
import { handoutPublicColumns } from './handouts'
import { equippedArmorByCharacter } from './items'
import { locationPublicColumns } from './locations'
import { npcPublicColumns } from './npcs'
import { isRowId, revealedOnly, runByDm } from './revealable'
import {
  campaignHandouts,
  campaignLocations,
  campaignNpcs,
  characterCampaigns,
  characters,
  campaigns,
  type Campaign,
} from './schema'

export type { TableSheet } from '@/lib/campaigns/table-sheet'

/** 128 random bits, base64url — the join code's shape, a third time. */
export function generateTableToken(): string {
  return generateJoinCode()
}

/** Tokens come off URLs; anything not token-shaped is a miss, not a query. */
function isTableToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token)
}

/** An NPC on the screen: the public layer, and that there is a face. */
export interface NpcSpotlight {
  kind: 'npc'
  at: string
  name: string
  summary: string | null
  description: string | null
  /** ISO 8601 when a portrait was uploaded, or `null`. Never the store key. */
  imageUploadedAt: string | null
}

/** A place on the screen: the public layer, and nothing else. */
export interface LocationSpotlight {
  kind: 'location'
  at: string
  name: string
  summary: string | null
  description: string | null
}

/** A handout on the screen: the artefact itself, which is its public layer. */
export interface HandoutSpotlight {
  kind: 'handout'
  at: string
  title: string
  body: string | null
  imageUploadedAt: string | null
}

/** A character sheet on the screen, stripped — see `table-sheet.ts`. */
export interface CharacterSpotlight {
  kind: 'character'
  at: string
  sheet: TableSheet
}

/**
 * An SRD entry on the screen, unresolved on purpose: the browser fetches it
 * from the public reference endpoints, so no game text crosses this token.
 */
export interface ReferenceSpotlightView {
  kind: 'monster' | 'spell' | 'condition'
  at: string
  index: string
}

export type SpotlightView =
  NpcSpotlight | LocationSpotlight | HandoutSpotlight | CharacterSpotlight | ReferenceSpotlightView

/** What a campaign's table token buys. Every field is player-visible. */
export interface TableView {
  campaignName: string
  /** What the DM has cast, or `null` for a screen showing the fight. */
  spotlight: SpotlightView | null
  /** The fight the DM has not ended, or `null`. */
  encounter: TableEncounter | null
  /** The newest reveal, if it is still news. Absent when there is none. */
  reveal?: TableReveal
}

/** The campaign behind a table token — the only way into everything below. */
async function campaignByToken(token: string): Promise<Campaign | null> {
  if (!isTableToken(token)) return null

  const [campaign] = await getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.tableToken, token))
    .limit(1)

  return campaign ?? null
}

/**
 * Resolve the pointer into the content the screen renders, or `null`.
 *
 * `null` covers every way a pointer can stop meaning something — the NPC was
 * deleted, the handout was hidden again, the character left the table — and it
 * is the same answer in each case: the screen falls back to the fight. That is
 * deliberate. A stale pointer must fail *closed* and silently, because the
 * failure is watched by six people and the DM's hands are elsewhere.
 */
async function resolveSpotlight(
  campaign: Campaign,
  spotlight: TableSpotlight,
): Promise<SpotlightView | null> {
  if (!isCampaignSpotlight(spotlight)) {
    return { kind: spotlight.kind, at: spotlight.at, index: spotlight.index }
  }

  const { id, at } = spotlight

  if (spotlight.kind === 'npc') {
    const [npc] = await getDb()
      .select({ ...npcPublicColumns, portrait: campaignNpcs.portrait })
      .from(campaignNpcs)
      .where(
        and(
          eq(campaignNpcs.id, id),
          eq(campaignNpcs.campaignId, campaign.id),
          revealedOnly(campaignNpcs),
        ),
      )
      .limit(1)

    return npc
      ? {
          kind: 'npc',
          at,
          name: npc.name,
          summary: npc.summary,
          description: npc.description,
          // The store key is redacted here, exactly as `npcs.ts` insists: the
          // bytes come from the token's own image route and nowhere else.
          imageUploadedAt: imageMeta(npc.portrait)?.uploadedAt ?? null,
        }
      : null
  }

  if (spotlight.kind === 'location') {
    const [location] = await getDb()
      .select(locationPublicColumns)
      .from(campaignLocations)
      .where(
        and(
          eq(campaignLocations.id, id),
          eq(campaignLocations.campaignId, campaign.id),
          revealedOnly(campaignLocations),
        ),
      )
      .limit(1)

    return location
      ? {
          kind: 'location',
          at,
          name: location.name,
          summary: location.summary,
          description: location.description,
        }
      : null
  }

  if (spotlight.kind === 'handout') {
    const [handout] = await getDb()
      .select({ ...handoutPublicColumns, image: campaignHandouts.image })
      .from(campaignHandouts)
      .where(
        and(
          eq(campaignHandouts.id, id),
          eq(campaignHandouts.campaignId, campaign.id),
          revealedOnly(campaignHandouts),
        ),
      )
      .limit(1)

    return handout
      ? {
          kind: 'handout',
          at,
          title: handout.title,
          body: handout.body,
          imageUploadedAt: imageMeta(handout.image)?.uploadedAt ?? null,
        }
      : null
  }

  return resolveCharacterSpotlight(campaign, id, at)
}

/**
 * A character sheet for the screen — the columns `tableSheet` reads, and no
 * others.
 *
 * The join through `character_campaigns` is the authority: a character has to
 * be *at this table* for its own campaign's screen to show it, so a uuid off a
 * stale pointer (or off a request the route has already refused) cannot pull a
 * sheet in from another table. There is no `owner_id` in the selection, no
 * currency, no inventory and no note — see `table-sheet.ts` for the full list
 * and why each is absent.
 */
async function resolveCharacterSpotlight(
  campaign: Campaign,
  characterId: string,
  at: string,
): Promise<CharacterSpotlight | null> {
  const [row] = await getDb()
    .select({
      id: characters.id,
      name: characters.name,
      level: characters.level,
      speciesIndex: characters.speciesIndex,
      classIndex: characters.classIndex,
      subclassIndex: characters.subclassIndex,
      backgroundIndex: characters.backgroundIndex,
      strength: characters.strength,
      dexterity: characters.dexterity,
      constitution: characters.constitution,
      intelligence: characters.intelligence,
      wisdom: characters.wisdom,
      charisma: characters.charisma,
      armorClass: characters.armorClass,
      currentHitPoints: characters.currentHitPoints,
      maxHitPoints: characters.maxHitPoints,
      temporaryHitPoints: characters.temporaryHitPoints,
      speed: characters.speed,
      conditions: characters.conditions,
      exhaustion: characters.exhaustion,
      skillProficiencies: characters.skillProficiencies,
      skillExpertise: characters.skillExpertise,
      portrait: characters.portrait,
    })
    .from(characters)
    .innerJoin(characterCampaigns, eq(characterCampaigns.characterId, characters.id))
    .where(and(eq(characters.id, characterId), eq(characterCampaigns.campaignId, campaign.id)))
    .limit(1)

  if (!row) return null

  const armor = await equippedArmorByCharacter([row.id])

  return {
    kind: 'character',
    at,
    sheet: tableSheet(row, armor[row.id] ?? [], imageMeta(row.portrait)?.uploadedAt ?? null),
  }
}

/**
 * Everything the screen renders, from the token alone.
 *
 * Three things, and the screen decides between them rather than this: what the
 * DM cast, the fight nobody has ended, and the newest reveal. All three can be
 * present at once — a DM who casts a place mid-fight has not stopped the
 * fight — so none of them is conditional on the others here.
 */
export async function getTableView(token: string): Promise<TableView | null> {
  const campaign = await campaignByToken(token)
  if (!campaign) return null

  const pointer = parseSpotlight(campaign.tableSpotlight)

  const [spotlight, encounter, reveal] = await Promise.all([
    pointer ? resolveSpotlight(campaign, pointer) : Promise.resolve(null),
    getLiveTableEncounter(campaign.id),
    latestReveal(campaign.id),
  ])

  return {
    campaignName: campaign.name,
    spotlight,
    encounter,
    ...(reveal ? { reveal } : {}),
  }
}

/**
 * The picture of whatever is on the screen right now, for the token's own
 * image route.
 *
 * **The narrowest gate in the app, and the shape is the point.** It takes no
 * entity id: the only image this token can ever fetch is the one attached to
 * the thing the DM has *currently cast*, so an unrevealed handout is not one
 * guessed id away — it is not addressable at all. Cast something else and the
 * previous picture stops being fetchable in the same write.
 */
export async function loadSpotlightImage(
  token: string,
): Promise<{ image: StoredImage | null } | null> {
  const campaign = await campaignByToken(token)
  if (!campaign) return null

  const pointer = parseSpotlight(campaign.tableSpotlight)
  if (!pointer || !isCampaignSpotlight(pointer)) return null

  if (pointer.kind === 'npc') {
    const [npc] = await getDb()
      .select({ image: campaignNpcs.portrait })
      .from(campaignNpcs)
      .where(
        and(
          eq(campaignNpcs.id, pointer.id),
          eq(campaignNpcs.campaignId, campaign.id),
          revealedOnly(campaignNpcs),
        ),
      )
      .limit(1)

    return npc ?? null
  }

  if (pointer.kind === 'handout') {
    const [handout] = await getDb()
      .select({ image: campaignHandouts.image })
      .from(campaignHandouts)
      .where(
        and(
          eq(campaignHandouts.id, pointer.id),
          eq(campaignHandouts.campaignId, campaign.id),
          revealedOnly(campaignHandouts),
        ),
      )
      .limit(1)

    return handout ?? null
  }

  if (pointer.kind === 'character') {
    const [character] = await getDb()
      .select({ image: characters.portrait })
      .from(characters)
      .innerJoin(characterCampaigns, eq(characterCampaigns.characterId, characters.id))
      .where(and(eq(characters.id, pointer.id), eq(characterCampaigns.campaignId, campaign.id)))
      .limit(1)

    return character ?? null
  }

  // A place carries no picture of its own — a picture of somewhere *is* a
  // handout (`locations-handouts`), so there is nothing to serve.
  return null
}

// ---------------------------------------------------------------------------
// The DM's side: the link, and the remote
// ---------------------------------------------------------------------------

/**
 * Mint or replace the campaign's table screen link.
 *
 * One function for both, like `regenerateShareToken`: the DM's control says
 * "Create link" when there is none and "New link" when there is, and both are
 * this write. The old link dies the moment it returns — that is the whole
 * reason the button exists, and the only way to shut a screen someone walked
 * away from.
 */
export async function regenerateTableToken(
  dmUserId: string,
  campaignId: string,
): Promise<Campaign | null> {
  if (!isRowId(campaignId)) return null

  const [updated] = await getDb()
    .update(campaigns)
    .set({ tableToken: generateTableToken(), updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return updated ?? null
}

/**
 * True when this campaign really holds the thing the DM is casting.
 *
 * Existence, checked separately from the write, because `neon-http` has no
 * transactions and the write is one statement: a pointer at a row in someone
 * else's campaign must never be *stored*, even for the moment before a read
 * would refuse to resolve it. Every statement here folds in `runByDm` (or, for
 * a character, the roster join), so a foreign id is indistinguishable from a
 * fictional one and both answer false.
 */
async function targetExists(
  dmUserId: string,
  campaignId: string,
  target: SpotlightTarget,
): Promise<boolean> {
  if (!('id' in target)) return true
  if (!isRowId(target.id)) return false

  if (target.kind === 'character') {
    const [row] = await getDb()
      .select({ id: characters.id })
      .from(characters)
      .innerJoin(characterCampaigns, eq(characterCampaigns.characterId, characters.id))
      .innerJoin(campaigns, eq(campaigns.id, characterCampaigns.campaignId))
      .where(
        and(
          eq(characters.id, target.id),
          eq(characterCampaigns.campaignId, campaignId),
          eq(campaigns.dmUserId, dmUserId),
        ),
      )
      .limit(1)

    return row !== undefined
  }

  const table =
    target.kind === 'npc'
      ? campaignNpcs
      : target.kind === 'location'
        ? campaignLocations
        : campaignHandouts

  const [row] = await getDb()
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, target.id), eq(table.campaignId, campaignId), runByDm(table, dmUserId)))
    .limit(1)

  return row !== undefined
}

/**
 * Casting reveals. Prep the DM puts on the wall is prep the party has met.
 *
 * The alternative — a screen that can show something the players' own phones
 * would deny knowing — was the wrong half of a fork: it would put content the
 * app calls hidden on a public token, and it would make the session log's
 * "when did they learn this" answer wrong about the moment it was actually
 * learned. So the cast stamps `revealed_at` where it is null, and un-revealing
 * afterwards still works and still takes it off this screen.
 *
 * Written as its own statement before the pointer, and *not* rolled back if
 * the pointer write then fails: a revealed thing that is not on the screen is
 * a DM tapping again, while a screen showing an unrevealed thing is the leak
 * this whole file is arranged against. On a driver with no transactions, the
 * order is the guarantee.
 */
async function revealForCast(
  dmUserId: string,
  campaignId: string,
  target: SpotlightTarget,
): Promise<void> {
  if (!('id' in target) || target.kind === 'character') return

  const table =
    target.kind === 'npc'
      ? campaignNpcs
      : target.kind === 'location'
        ? campaignLocations
        : campaignHandouts

  await getDb()
    .update(table)
    .set({ revealedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(table.id, target.id),
        eq(table.campaignId, campaignId),
        runByDm(table, dmUserId),
        // Only where it is not already revealed: re-casting an NPC introduced
        // last week must not restamp it as met tonight, or the recap would say
        // the party learned it twice.
        isNull(table.revealedAt),
      ),
    )
}

/**
 * Put something on the table screen, or clear it (`null`).
 *
 * Returns the campaign as it now stands, or `null` for a campaign this DM does
 * not run and for a target this campaign does not hold — the two are the same
 * answer on purpose, so the route says "no such thing" to both and confirms
 * neither.
 */
export async function setCampaignSpotlight(
  dmUserId: string,
  campaignId: string,
  target: SpotlightTarget | null,
): Promise<Campaign | null> {
  if (!isRowId(campaignId)) return null

  if (target) {
    if (!(await targetExists(dmUserId, campaignId, target))) return null
    await revealForCast(dmUserId, campaignId, target)
  }

  const [updated] = await getDb()
    .update(campaigns)
    .set({
      tableSpotlight: target ? stampSpotlight(target) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .returning()

  return updated ?? null
}

/** What the DM's remote highlights as live, straight off the campaign row. */
export function spotlightOf(campaign: Pick<Campaign, 'tableSpotlight'>): TableSpotlight | null {
  return parseSpotlight(campaign.tableSpotlight)
}
