// What is on the table screen right now (`dm-run-suite/table-screen-cast`).
//
// The table screen used to show one thing — the fight — and it existed only
// while a fight did. This module is the other half of the change: a **pointer**
// the DM moves, stored on the campaign, naming the one thing the screen across
// the table is showing. Nothing else about it is state; clearing it is writing
// `NULL`.
//
// **A pointer, never a copy.** The alternative — writing the NPC's name and
// blurb into the column at cast time — would have the screen show yesterday's
// wording after an edit, and would put prep text in a second place where a
// player-facing query could reach it. What is stored is `{kind, id}` or
// `{kind, index}`, and every read re-resolves it through the same sanitized
// selection the players' own screens use.
//
// **Two families, because they are answered from different places.**
//
// - **Campaign kinds** (`npc`, `location`, `handout`, `character`) name a row
//   by uuid. They are resolved server-side, behind the table token, and only
//   ever through a public-column selection.
// - **Reference kinds** (`monster`, `spell`, `condition`) name an SRD 5.2.1
//   entry by index. They are *not* resolved server-side at all: the screen
//   fetches them from `/api/srd/*`, the same public, CDN-cached data the
//   Library reads (D34). So casting a stat block puts the **book's** page on
//   the wall — never this goblin's remaining hit points, which stay behind
//   D24's line exactly as before.
//
// `at` is stamped by the server on every cast, and it is what makes the screen
// able to tell "the DM cast this again" from "the poll returned the same
// thing" — an important difference on a screen nobody is touching.

/** Kinds that name a row in this campaign, by uuid. */
export const CAMPAIGN_SPOTLIGHT_KINDS = ['npc', 'location', 'handout', 'character'] as const

/** Kinds that name an SRD 5.2.1 entry, by index. Public reference data. */
export const REFERENCE_SPOTLIGHT_KINDS = ['monster', 'spell', 'condition'] as const

export type CampaignSpotlightKind = (typeof CAMPAIGN_SPOTLIGHT_KINDS)[number]
export type ReferenceSpotlightKind = (typeof REFERENCE_SPOTLIGHT_KINDS)[number]
export type SpotlightKind = CampaignSpotlightKind | ReferenceSpotlightKind

/** Something of the DM's, named by row id. */
export interface CampaignSpotlight {
  kind: CampaignSpotlightKind
  id: string
  /** ISO 8601, stamped server-side when the DM cast it. */
  at: string
}

/** Something out of the SRD, named by index. */
export interface ReferenceSpotlight {
  kind: ReferenceSpotlightKind
  index: string
  at: string
}

/** What `campaigns.table_spotlight` holds. `NULL` is a screen showing the fight. */
export type TableSpotlight = CampaignSpotlight | ReferenceSpotlight

/** The same thing without the stamp — what a cast request may name. */
export type SpotlightTarget =
  Pick<CampaignSpotlight, 'kind' | 'id'> | Pick<ReferenceSpotlight, 'kind' | 'index'>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** SRD indexes are lowercase slugs, the same shape `/api/srd/*` accepts. */
const INDEX_PATTERN = /^[a-z0-9-]{1,80}$/

const CAMPAIGN_KIND_SET = new Set<string>(CAMPAIGN_SPOTLIGHT_KINDS)
const REFERENCE_KIND_SET = new Set<string>(REFERENCE_SPOTLIGHT_KINDS)

export function isCampaignSpotlight(spotlight: TableSpotlight): spotlight is CampaignSpotlight {
  return CAMPAIGN_KIND_SET.has(spotlight.kind)
}

/**
 * Read a cast request's target, or `null` for anything that is not one.
 *
 * The gate on the write side, and deliberately strict about *shape* rather
 * than existence: whether the campaign actually holds that NPC is a question
 * only a statement with `dm_user_id` folded in can answer, and it is asked
 * one layer down. What this refuses is a body that could not name anything —
 * an unknown kind, an id that is not a uuid, an index carrying a slash.
 */
export function parseSpotlightTarget(value: unknown): SpotlightTarget | null {
  if (typeof value !== 'object' || value === null) return null

  const candidate = value as { kind?: unknown; id?: unknown; index?: unknown }
  if (typeof candidate.kind !== 'string') return null

  if (CAMPAIGN_KIND_SET.has(candidate.kind)) {
    if (typeof candidate.id !== 'string' || !UUID_PATTERN.test(candidate.id)) return null
    return { kind: candidate.kind as CampaignSpotlightKind, id: candidate.id }
  }

  if (REFERENCE_KIND_SET.has(candidate.kind)) {
    if (typeof candidate.index !== 'string' || !INDEX_PATTERN.test(candidate.index)) return null
    return { kind: candidate.kind as ReferenceSpotlightKind, index: candidate.index }
  }

  return null
}

/**
 * Read the stored column back, or `null` for anything that is not a spotlight.
 *
 * A `jsonb` column holds whatever was written into it, including by a build
 * that has since changed its mind about the shape. The public screen reads
 * this on every poll, so a value it cannot make sense of has to mean "nothing
 * is being shown" rather than a rendered `undefined` on a wall six people are
 * looking at.
 */
export function parseSpotlight(value: unknown): TableSpotlight | null {
  const target = parseSpotlightTarget(value)
  if (!target) return null

  const at = (value as { at?: unknown }).at
  if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) return null

  return { ...target, at } as TableSpotlight
}

/** Stamp a target as cast now — the one place `at` is written. */
export function stampSpotlight(target: SpotlightTarget, at: Date = new Date()): TableSpotlight {
  return { ...target, at: at.toISOString() } as TableSpotlight
}

/**
 * True when two targets name the same thing, stamp aside.
 *
 * The DM's remote uses it to mark the row that is live, so re-casting what is
 * already up is visibly a no-op rather than an invitation to tap again.
 */
export function isSameTarget(a: SpotlightTarget | null, b: SpotlightTarget | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false

  return 'id' in a && 'id' in b
    ? a.id === b.id
    : 'index' in a && 'index' in b && a.index === b.index
}

/** What each kind is called on a screen the whole room reads. */
export const SPOTLIGHT_KIND_LABEL: Record<SpotlightKind, string> = {
  npc: 'Someone you have met',
  location: 'A place',
  handout: 'Passed across the table',
  character: 'One of you',
  monster: 'From the monster manual',
  spell: 'A spell',
  condition: 'A condition',
}

/** What each kind is called on the DM's remote, where brevity wins. */
export const SPOTLIGHT_KIND_NOUN: Record<SpotlightKind, string> = {
  npc: 'NPC',
  location: 'Place',
  handout: 'Handout',
  character: 'Character',
  monster: 'Monster',
  spell: 'Spell',
  condition: 'Condition',
}
