// Typed data access for encounters and their combatants (DND-031, D17, D24).
//
// Authority model, same as `campaigns.ts`: an encounter belongs to a campaign,
// and `campaigns.dm_user_id` is the only thing that says who may touch it.
// Every statement folds that into the WHERE clause via a join or EXISTS, so a
// foreign encounter id is indistinguishable from a fictional one — 404, not
// 403, exactly like characters and campaigns.
//
// Two kinds of combatant, two sources of truth (D13/D17):
//
// - **Monster rows own their hit points per instance** — "Goblin 3" has its
//   own `current_hit_points`, independent of every other goblin.
// - **PC rows carry no hit points here.** Their HP columns stay null; the
//   character row is the single source of truth, and the tracker reads and
//   writes it through `characters.ts` with the version guard. This file
//   *strips* HP fields from a patch aimed at a PC row rather than storing a
//   second copy that would drift.
//
// The share token (D24) is the campaign join code pattern applied to a read:
// knowing it grants the sanitized, player-visible table view — never monster
// HP, never a monster's identity beyond its label — and nothing else.
//
// `dm-run-suite/reveal-controls` adds one thing to that view and deliberately
// adds it *here*, in the same function, rather than in `discovered.ts`: what a
// token buys stays reviewable by reading `getEncounterByShareToken` top to
// bottom. The screen behind the token hangs on a wall with no session behind
// it, so the featured reveal is the narrowest projection in the app — a name
// and, for an NPC or a place, the DM's one-line summary. Never a description,
// never a handout's body, never a picture, and never an unrevealed row.
//
// `neon-http` cannot do transactions, so multi-statement writes are ordered
// to fail benignly: the scoped read settles authority first, and a failed
// insert after it costs a retry, not an authority bug.
import { and, desc, eq, exists, gt, inArray, sql } from 'drizzle-orm'

import { isKnownCondition } from '@/lib/characters/rules'

import { generateJoinCode } from './campaigns'
import { getDb } from './client'
import { revealedOnly, type RevealableTable } from './revealable'
import {
  campaignHandouts,
  campaignLocations,
  campaignNpcs,
  campaigns,
  characterCampaigns,
  characters,
  encounterCombatants,
  encounters,
  type Character,
  type Encounter,
  type EncounterCombatant,
} from './schema'

export type { Encounter, EncounterCombatant } from './schema'

/** A combatant with the live character row behind it, when it is a PC. */
export interface CombatantWithCharacter {
  combatant: EncounterCombatant
  /** The character behind a PC row — HP, AC, conditions, version. Null for monsters. */
  character: Character | null
}

/** An encounter as the tracker renders it. */
export interface EncounterDetail {
  encounter: Encounter
  /** Ordered by initiative descending, unset initiative sinking to the bottom. */
  combatants: CombatantWithCharacter[]
}

/** The fields the tracker may change on one combatant. */
export interface CombatantPatch {
  initiative?: number | null
  currentHitPoints?: number
  temporaryHitPoints?: number
  conditions?: string[]
  label?: string
  sortOrder?: number
}

/** The fields the tracker may change on the encounter itself. */
export interface EncounterPatch {
  name?: string
  round?: number
  activeTurn?: number
}

/** One row of the public table screen (D24). Note what is *not* here. */
export interface TableCombatant {
  id: string
  label: string
  isCharacter: boolean
  initiative: number | null
  conditions: string[]
  /** Present for PCs only — the players can see each other's HP anyway. */
  characterHp?: { current: number; max: number; temp: number }
}

/**
 * The newest thing the DM has revealed, as the shared screen features it
 * (`dm-run-suite/reveal-controls`).
 *
 * Two strings and a timestamp, and that is the whole disclosure. `summary` is
 * the DM's one-line public summary where there is one; a handout's is always
 * null, because a handout's public layer is a body of text and a picture, and
 * neither belongs in six-inch type on a screen the whole room can read — the
 * party has both on their phones a poll later.
 */
export interface TableReveal {
  kind: 'npc' | 'location' | 'handout'
  /** The NPC's or place's name, or the handout's title. */
  name: string
  /** One line, when the DM wrote one. Null for every handout. */
  summary: string | null
  /** ISO 8601, so the shape crossing the wire is the shape this type claims. */
  revealedAt: string
}

/** What a share token buys: the player-visible view, and nothing else. */
export interface TableScreenView {
  encounterName: string
  campaignName: string
  round: number
  activeTurn: number
  combatants: TableCombatant[]
  /**
   * The reveal to feature, if one landed recently enough to still be news.
   * Absent, not null, when there is nothing to show — the screen renders
   * initiative alone.
   */
  reveal?: TableReveal
}

/**
 * How long a reveal stays featured on the shared screen.
 *
 * "Just revealed" is a moment, not a state. Long enough that the letter is
 * still up while the party argues about it, short enough that last session's
 * introduction is not still the headline when this one starts. The party's own
 * phones keep everything permanently; this card is only the moment it lands.
 */
export const REVEAL_FEATURE_WINDOW_MS = 15 * 60_000

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The most instances one add can create — a horde arrives in batches. */
export const MAX_MONSTER_BATCH = 20

/** 128 random bits, base64url — the same unguessable shape as a join code. */
export function generateShareToken(): string {
  return generateJoinCode()
}

/** Share tokens come off URLs; anything not token-shaped is a miss. */
function isShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{16,64}$/.test(token)
}

/** "The DM runs the campaign this encounter belongs to", as a WHERE fragment. */
function runBy(dmUserId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(campaigns)
      .where(and(eq(campaigns.id, encounters.campaignId), eq(campaigns.dmUserId, dmUserId))),
  )
}

/** The same authority, phrased for a statement on `encounter_combatants`. */
function combatantRunBy(dmUserId: string) {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(encounters)
      .innerJoin(campaigns, eq(encounters.campaignId, campaigns.id))
      .where(
        and(eq(encounters.id, encounterCombatants.encounterId), eq(campaigns.dmUserId, dmUserId)),
      ),
  )
}

/** One encounter `dmUserId` runs, or null — the scoped read every write leads with. */
async function getEncounterRow(dmUserId: string, id: string): Promise<Encounter | null> {
  if (!UUID_PATTERN.test(id)) return null

  const [row] = await getDb()
    .select()
    .from(encounters)
    .where(and(eq(encounters.id, id), runBy(dmUserId)))
    .limit(1)

  return row ?? null
}

/** Initiative descending, blanks to the bottom, insertion order as tiebreak. */
function combatantOrder() {
  return [sql`${encounterCombatants.initiative} desc nulls last`, encounterCombatants.sortOrder]
}

/**
 * Create an encounter in a campaign `dmUserId` runs, with a live share token
 * from birth (D24) — the table screen is a copy-the-link away, not a setup
 * step. Null when the campaign is not theirs to run encounters in.
 */
export async function createEncounter(
  dmUserId: string,
  campaignId: string,
  name: string,
): Promise<Encounter | null> {
  if (!UUID_PATTERN.test(campaignId)) return null

  const [campaign] = await getDb()
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .limit(1)

  if (!campaign) return null

  const [encounter] = await getDb()
    .insert(encounters)
    .values({ campaignId, name: name.trim(), shareToken: generateShareToken() })
    .returning()

  return encounter
}

/** Every encounter of a campaign `dmUserId` runs, newest first. */
export async function listEncounters(dmUserId: string, campaignId: string): Promise<Encounter[]> {
  if (!UUID_PATTERN.test(campaignId)) return []

  const rows = await getDb()
    .select({ encounter: encounters })
    .from(encounters)
    .innerJoin(campaigns, eq(encounters.campaignId, campaigns.id))
    .where(and(eq(encounters.campaignId, campaignId), eq(campaigns.dmUserId, dmUserId)))
    .orderBy(desc(encounters.createdAt))

  return rows.map((row) => row.encounter)
}

/**
 * One encounter `dmUserId` runs, with its combatants in initiative order and
 * the live character row behind each PC — HP, AC, conditions and the version
 * the tracker's character writes must carry (DND-028).
 */
export async function getEncounterForDm(
  dmUserId: string,
  id: string,
): Promise<EncounterDetail | null> {
  const encounter = await getEncounterRow(dmUserId, id)
  if (!encounter) return null

  const combatants = await getDb()
    .select({ combatant: encounterCombatants, character: characters })
    .from(encounterCombatants)
    .leftJoin(characters, eq(encounterCombatants.characterId, characters.id))
    .where(eq(encounterCombatants.encounterId, encounter.id))
    .orderBy(...combatantOrder())

  return { encounter, combatants }
}

/**
 * Add player characters to an encounter — only ones actually in the
 * encounter's campaign, because the roster is what the DM was granted (D13).
 * Anything else in the list is dropped, not an error: the only way to send a
 * foreign id is to have tampered with the request. Characters already in the
 * encounter are skipped, so adding the party twice is adding it once.
 *
 * Returns the inserted rows (possibly empty), or null for an encounter this
 * DM does not run.
 */
export async function addCharacterCombatants(
  dmUserId: string,
  encounterId: string,
  characterIds: string[],
): Promise<EncounterCombatant[] | null> {
  const encounter = await getEncounterRow(dmUserId, encounterId)
  if (!encounter) return null

  const wanted = characterIds.filter((id) => UUID_PATTERN.test(id))
  if (wanted.length === 0) return []

  const inCampaign = await getDb()
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .innerJoin(characterCampaigns, eq(characterCampaigns.characterId, characters.id))
    .where(
      and(eq(characterCampaigns.campaignId, encounter.campaignId), inArray(characters.id, wanted)),
    )

  if (inCampaign.length === 0) return []

  const existing = await getDb()
    .select({
      characterId: encounterCombatants.characterId,
      sortOrder: encounterCombatants.sortOrder,
    })
    .from(encounterCombatants)
    .where(eq(encounterCombatants.encounterId, encounter.id))

  const alreadyIn = new Set(existing.map((row) => row.characterId).filter(Boolean))
  const fresh = inCampaign.filter((character) => !alreadyIn.has(character.id))
  if (fresh.length === 0) return []

  let nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1

  return getDb()
    .insert(encounterCombatants)
    .values(
      fresh.map((character) => ({
        encounterId: encounter.id,
        characterId: character.id,
        label: character.name,
        sortOrder: nextOrder++,
      })),
    )
    .returning()
}

/** What one monster add asks for. */
export interface AddMonstersInput {
  /** dnd5eapi monster index, e.g. `'goblin'` — what the label taps through to. */
  monsterIndex: string
  /** The display name the labels are built from, e.g. `'Goblin'`. */
  name: string
  count: number
  /** Usually the monster's average HP from the reference data. Null = untracked. */
  maxHitPoints: number | null
}

/**
 * Add `count` instances of a monster, labelled "Name 1..N" and each seeded to
 * full HP — per-instance, per D17: three goblins are three rows. Numbering
 * continues past instances of the same monster already in the encounter, so a
 * second wave of goblins does not mint a second "Goblin 1".
 */
export async function addMonsterCombatants(
  dmUserId: string,
  encounterId: string,
  input: AddMonstersInput,
): Promise<EncounterCombatant[] | null> {
  const encounter = await getEncounterRow(dmUserId, encounterId)
  if (!encounter) return null

  const count = Math.min(MAX_MONSTER_BATCH, Math.max(1, Math.floor(input.count)))
  const name = input.name.trim()
  const maxHitPoints =
    input.maxHitPoints === null ? null : Math.max(1, Math.floor(input.maxHitPoints))

  const existing = await getDb()
    .select({
      monsterIndex: encounterCombatants.monsterIndex,
      sortOrder: encounterCombatants.sortOrder,
    })
    .from(encounterCombatants)
    .where(eq(encounterCombatants.encounterId, encounter.id))

  const sameMonster = existing.filter((row) => row.monsterIndex === input.monsterIndex).length
  let nextOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1

  return getDb()
    .insert(encounterCombatants)
    .values(
      Array.from({ length: count }, (_, i) => ({
        encounterId: encounter.id,
        monsterIndex: input.monsterIndex,
        label: `${name} ${sameMonster + i + 1}`,
        maxHitPoints,
        currentHitPoints: maxHitPoints,
        sortOrder: nextOrder++,
      })),
    )
    .returning()
}

/**
 * Change one combatant. For a PC row the HP fields are stripped rather than
 * written — the character row is the single source of truth (D13), and the
 * tracker's PC damage goes through the characters data layer with its version
 * guard, never through this table.
 */
export async function updateCombatant(
  dmUserId: string,
  encounterId: string,
  combatantId: string,
  patch: CombatantPatch,
): Promise<EncounterCombatant | null> {
  if (!UUID_PATTERN.test(encounterId) || !UUID_PATTERN.test(combatantId)) return null

  const [row] = await getDb()
    .select()
    .from(encounterCombatants)
    .where(
      and(
        eq(encounterCombatants.id, combatantId),
        eq(encounterCombatants.encounterId, encounterId),
        combatantRunBy(dmUserId),
      ),
    )
    .limit(1)

  if (!row) return null

  const changes: Partial<EncounterCombatant> = {}

  if (patch.initiative !== undefined) {
    changes.initiative =
      patch.initiative === null ? null : Math.max(-99, Math.min(99, Math.floor(patch.initiative)))
  }

  if (patch.label !== undefined && patch.label.trim().length > 0) {
    changes.label = patch.label.trim()
  }

  if (patch.sortOrder !== undefined) {
    changes.sortOrder = Math.max(0, Math.floor(patch.sortOrder))
  }

  if (patch.conditions !== undefined) {
    changes.conditions = Array.from(new Set(patch.conditions)).filter(isKnownCondition)
  }

  // HP lands only on monster rows — a PC's hit points live on the character.
  if (row.characterId === null) {
    if (patch.currentHitPoints !== undefined) {
      const ceiling = row.maxHitPoints ?? 999
      changes.currentHitPoints = Math.max(0, Math.min(ceiling, Math.floor(patch.currentHitPoints)))
    }

    if (patch.temporaryHitPoints !== undefined) {
      changes.temporaryHitPoints = Math.max(0, Math.min(999, Math.floor(patch.temporaryHitPoints)))
    }
  }

  if (Object.keys(changes).length === 0) return row

  const [updated] = await getDb()
    .update(encounterCombatants)
    .set({ ...changes, updatedAt: new Date() })
    .where(
      and(
        eq(encounterCombatants.id, combatantId),
        eq(encounterCombatants.encounterId, encounterId),
        combatantRunBy(dmUserId),
      ),
    )
    .returning()

  return updated ?? null
}

/** Remove one combatant. False when there was nothing this DM could remove. */
export async function removeCombatant(
  dmUserId: string,
  encounterId: string,
  combatantId: string,
): Promise<boolean> {
  if (!UUID_PATTERN.test(encounterId) || !UUID_PATTERN.test(combatantId)) return false

  const deleted = await getDb()
    .delete(encounterCombatants)
    .where(
      and(
        eq(encounterCombatants.id, combatantId),
        eq(encounterCombatants.encounterId, encounterId),
        combatantRunBy(dmUserId),
      ),
    )
    .returning({ id: encounterCombatants.id })

  return deleted.length > 0
}

/** Rename, or step the round/turn counters. Absent fields are left alone. */
export async function patchEncounter(
  dmUserId: string,
  id: string,
  patch: EncounterPatch,
): Promise<Encounter | null> {
  if (!UUID_PATTERN.test(id)) return null

  const changes: Partial<Encounter> = {}

  if (patch.name !== undefined && patch.name.trim().length > 0) changes.name = patch.name.trim()
  if (patch.round !== undefined) changes.round = Math.max(1, Math.floor(patch.round))
  if (patch.activeTurn !== undefined) changes.activeTurn = Math.max(0, Math.floor(patch.activeTurn))

  if (Object.keys(changes).length === 0) return getEncounterRow(dmUserId, id)

  const [updated] = await getDb()
    .update(encounters)
    .set({ ...changes, updatedAt: new Date() })
    .where(and(eq(encounters.id, id), runBy(dmUserId)))
    .returning()

  return updated ?? null
}

/**
 * End the fight, or put it back on the table
 * (`dm-run-suite/session-log-recap`).
 *
 * **The act that was missing.** Until now the only way to say a fight was over
 * was to delete it, which cascades the combatants away and takes with them the
 * fact that it happened at all — and "what did we fight" is most of what a
 * recap is. So ending one is a stamp: the encounter, its order and its monster
 * HP all stay exactly where they are, and the session log reads
 * `completed_at` rather than a written-down copy of it.
 *
 * `completed` names the state the DM wants rather than an increment, like the
 * reveal switch does and for the same reason: two taps that both mean "over"
 * leave one timestamp, and reopening a fight the DM ended a round early is the
 * same control, not a repair path.
 */
export async function setEncounterCompleted(
  dmUserId: string,
  id: string,
  completed: boolean,
): Promise<Encounter | null> {
  if (!UUID_PATTERN.test(id)) return null

  const [updated] = await getDb()
    .update(encounters)
    .set({ completedAt: completed ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(encounters.id, id), runBy(dmUserId)))
    .returning()

  return updated ?? null
}

/** Replace the share token. The old table-screen link dies with it (D24). */
export async function regenerateShareToken(
  dmUserId: string,
  id: string,
): Promise<Encounter | null> {
  if (!UUID_PATTERN.test(id)) return null

  const [updated] = await getDb()
    .update(encounters)
    .set({ shareToken: generateShareToken(), updatedAt: new Date() })
    .where(and(eq(encounters.id, id), runBy(dmUserId)))
    .returning()

  return updated ?? null
}

/** Delete an encounter and (by cascade) its combatants. */
export async function deleteEncounter(dmUserId: string, id: string): Promise<boolean> {
  if (!UUID_PATTERN.test(id)) return false

  const deleted = await getDb()
    .delete(encounters)
    .where(and(eq(encounters.id, id), runBy(dmUserId)))
    .returning({ id: encounters.id })

  return deleted.length > 0
}

/**
 * "Revealed to this campaign, and recently enough to still be news", as one
 * WHERE clause.
 *
 * {@link revealedOnly} is in here beside the window even though the window
 * alone would exclude a null `revealed_at`: the arm that says *null is hidden*
 * is the one this app is defending, and it is named on every player-facing
 * statement so that dropping it is a visible deletion rather than a silent
 * consequence of someone widening a comparison.
 */
function justRevealed(table: RevealableTable, campaignId: string, since: Date) {
  return and(eq(table.campaignId, campaignId), revealedOnly(table), gt(table.revealedAt, since))
}

/**
 * The newest reveal in a campaign, for the screen on the wall.
 *
 * Three statements rather than one UNION, run together. The union would save a
 * round trip and cost the thing that matters more here: each of these is a
 * plainly readable "public columns, this campaign, revealed, recent, newest
 * one", which is the property a reviewer has to be able to check at a glance on
 * the one query in this app that answers to no session at all.
 *
 * The selections are the point. An NPC and a place give up a name and the
 * one-line summary; a handout gives up its title and nothing else. No
 * `description`, no `body`, no `image`, no DM-only column is named on any of
 * the three, so there is no field on the way back that could be rendered by
 * mistake.
 */
async function latestReveal(campaignId: string): Promise<TableReveal | null> {
  const since = new Date(Date.now() - REVEAL_FEATURE_WINDOW_MS)

  const [npcs, locations, handouts] = await Promise.all([
    getDb()
      .select({
        name: campaignNpcs.name,
        summary: campaignNpcs.summary,
        revealedAt: campaignNpcs.revealedAt,
      })
      .from(campaignNpcs)
      .where(justRevealed(campaignNpcs, campaignId, since))
      .orderBy(desc(campaignNpcs.revealedAt))
      .limit(1),

    getDb()
      .select({
        name: campaignLocations.name,
        summary: campaignLocations.summary,
        revealedAt: campaignLocations.revealedAt,
      })
      .from(campaignLocations)
      .where(justRevealed(campaignLocations, campaignId, since))
      .orderBy(desc(campaignLocations.revealedAt))
      .limit(1),

    getDb()
      .select({ name: campaignHandouts.title, revealedAt: campaignHandouts.revealedAt })
      .from(campaignHandouts)
      .where(justRevealed(campaignHandouts, campaignId, since))
      .orderBy(desc(campaignHandouts.revealedAt))
      .limit(1),
  ])

  const candidates: TableReveal[] = []

  // `revealedAt` cannot be null — `revealedOnly` is in every one of the three
  // WHERE clauses — but the column is nullable and this is the one place the
  // value is read rather than compared, so a row without one is skipped rather
  // than rendered as "Invalid Date" on a screen the whole table is watching.
  const consider = (
    kind: TableReveal['kind'],
    row?: { name: string; summary?: string | null; revealedAt: Date | null },
  ) => {
    if (!row?.revealedAt) return
    candidates.push({
      kind,
      name: row.name,
      summary: row.summary ?? null,
      revealedAt: row.revealedAt.toISOString(),
    })
  }

  consider('npc', npcs[0])
  consider('location', locations[0])
  consider('handout', handouts[0])

  // Three already-newest rows; the last comparison is which table won.
  return candidates.sort((a, b) => b.revealedAt.localeCompare(a.revealedAt))[0] ?? null
}

/**
 * The public table screen behind a share token (D24) — no session, so what
 * leaves this function is the entire disclosure surface. Player-visible state
 * only: labels, initiative order, conditions, and HP **for PCs alone** (the
 * table can see each other's sheets anyway). Monster HP and a monster's
 * identity beyond its label never cross this boundary — a monster row here is
 * `{id, label, isCharacter: false, initiative, conditions}` and nothing else.
 *
 * `reveal-controls` adds one field: the campaign's newest reveal, if one landed
 * inside {@link REVEAL_FEATURE_WINDOW_MS}. It is built by {@link latestReveal},
 * which selects a name and at most a one-line summary from rows whose
 * `revealed_at` is set — so the widest thing this token can now buy is a
 * sentence the DM wrote for the party to read.
 */
export async function getEncounterByShareToken(token: string): Promise<TableScreenView | null> {
  if (!isShareToken(token)) return null

  const [found] = await getDb()
    .select({ encounter: encounters, campaignName: campaigns.name })
    .from(encounters)
    .innerJoin(campaigns, eq(encounters.campaignId, campaigns.id))
    .where(eq(encounters.shareToken, token))
    .limit(1)

  if (!found) return null

  const rows = await getDb()
    .select({
      id: encounterCombatants.id,
      label: encounterCombatants.label,
      characterId: encounterCombatants.characterId,
      initiative: encounterCombatants.initiative,
      conditions: encounterCombatants.conditions,
      characterCurrent: characters.currentHitPoints,
      characterMax: characters.maxHitPoints,
      characterTemp: characters.temporaryHitPoints,
      characterConditions: characters.conditions,
    })
    .from(encounterCombatants)
    .leftJoin(characters, eq(encounterCombatants.characterId, characters.id))
    .where(eq(encounterCombatants.encounterId, found.encounter.id))
    .orderBy(...combatantOrder())

  const reveal = await latestReveal(found.encounter.campaignId)

  return {
    encounterName: found.encounter.name,
    campaignName: found.campaignName,
    round: found.encounter.round,
    activeTurn: found.encounter.activeTurn,
    // Omitted rather than set to null when there is nothing recent: absent is
    // the shape the type promises, and the screen tests `view.reveal` for it.
    ...(reveal ? { reveal } : {}),
    combatants: rows.map((row) => {
      const isCharacter = row.characterId !== null

      const combatant: TableCombatant = {
        id: row.id,
        label: row.label,
        isCharacter,
        initiative: row.initiative,
        // A PC's live conditions come from the sheet, the source of truth.
        conditions: isCharacter ? (row.characterConditions ?? []) : row.conditions,
      }

      if (isCharacter && row.characterCurrent !== null && row.characterMax !== null) {
        combatant.characterHp = {
          current: row.characterCurrent,
          max: row.characterMax,
          temp: row.characterTemp ?? 0,
        }
      }

      return combatant
    }),
  }
}
