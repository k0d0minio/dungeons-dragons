// What `/api/srd/*` serves, and how it caches
// (`srd-2024-migration/long-tail-reference-data`).
//
// This replaces `src/lib/dnd-api/proxy.ts`, and the difference is the whole
// point of the ticket: nothing here makes a network call. Every collection is a
// JSON module compiled into the deployment, so a lookup is a Map hit and the
// only reason these are HTTP endpoints at all is bundle size — `spells.json`
// and `monsters.json` are a megabyte between them, which a phone should not
// download to render one search box (D34 keeps them public and CDN-cached;
// pages are what the sign-in wall protects, not reference data).
//
// The 2014 `/api/dnd5e/*` namespace is retired rather than repointed (D31): its
// responses sat behind an 8-day CDN window, so changing an endpoint's meaning in
// place could serve one player 2014 Fireball and the next 2024 Fireball inside
// the same session. A new path can never do that.

import { NextResponse } from 'next/server'

import { EQUIPMENT } from './equipment'
import type { SrdCollection } from './lookup'
import { MAGIC_ITEMS } from './magic-items'
import { MONSTERS } from './monsters'
import { SPELLS, spellsForClass } from './spells'
import type { SrdEquipment, SrdMagicItem, SrdMonster, SrdSpell } from './types'

// The data ships with the build and cannot change until the next deploy, so a
// day at the edge costs nothing and a week of stale-while-revalidate on top is
// pure insurance. Unlike the proxy this replaces, there is no upstream that can
// be slow or down — the function itself is the only thing that can fail.
const REVALIDATE_SECONDS = 60 * 60 * 24 // 24 hours
const STALE_WHILE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7 // 7 days

const REFERENCE_CACHE_CONTROL = `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`

// SRD indexes are lowercase slugs (`fireball`, `adult-red-dragon`). Anything
// else is not a reference lookup, and rejecting it before the Map hit keeps the
// CDN's key space bounded to what the data actually defines.
const INDEX_PATTERN = /^[a-z0-9-]+$/

export function isValidIndex(index: string): boolean {
  return INDEX_PATTERN.test(index)
}

/** A lean list row. Detail lives one request away, under `/api/srd/{c}/{index}`. */
export interface SrdListRow {
  index: string
  name: string
  /**
   * Collections add the one or two columns their callers sort, group or filter
   * by — a spell's level, a monster's CR and XP — so a list view never has to
   * fetch every entry to draw itself.
   */
  [column: string]: unknown
}

/**
 * One servable collection, with its projection already bound.
 *
 * `list` and `get` are closures rather than a `{ collection, summary }` pair so
 * the registry below is a *union-free* type: a caller that has narrowed a name
 * to "one of the four" can list it without TypeScript having to correlate a
 * generic parameter across the union.
 *
 * Lists stay lean deliberately — the Library's search sweeps all four at once
 * on a phone, and a browser that had to parse 331 whole stat blocks to draw a
 * list of names would be slower than the proxy this replaces.
 */
export interface ServedCollection {
  list(): SrdListRow[]
  get(index: string): object | null
}

function served<T extends { index: string; name: string }>(
  collection: SrdCollection<T>,
  summary: (entry: T) => SrdListRow,
): ServedCollection {
  return {
    list: () => collection.all.map(summary),
    get: (index) => collection.get(index),
  }
}

/** The spell list row, shared by the whole list and by a class's slice of it. */
function spellSummary(spell: SrdSpell): SrdListRow {
  return {
    index: spell.index,
    name: spell.name,
    // Level rides along on the row so a picker can group a wizard's two hundred
    // spells without fetching each one — the same reason the 2014
    // `/classes/{index}/spells` endpoint carried it.
    level: spell.level,
    school: spell.school,
    concentration: spell.concentration,
    ritual: spell.ritual,
  }
}

/** One class's spells, projected to list rows — what `?class=` answers with. */
export function spellListForClass(classIndex: string): SrdListRow[] {
  return spellsForClass(classIndex).map(spellSummary)
}

// The long tail, and only the long tail.
//
// Classes, subclasses, species, backgrounds, conditions, weapons and feats are
// deliberately absent: they are creation-critical, small, and already imported
// straight into client components through `src/lib/characters/rules.ts` — a
// saving throw bonus is not something to wait on a round trip for. Fetching
// them over HTTP as well would ship the same JSON twice. What is served here is
// what a phone should *not* download whole: a megabyte of spells and stat
// blocks, plus the magic items and equipment that only the Library and the
// inventory picker ever read.
export const SERVED_COLLECTIONS: Record<string, ServedCollection> = {
  spells: served<SrdSpell>(SPELLS, spellSummary),
  monsters: served<SrdMonster>(MONSTERS, (monster) => ({
    index: monster.index,
    name: monster.name,
    challengeRating: monster.challengeRating,
    challengeRatingText: monster.challengeRatingText,
    // The encounter's XP award prices a fight from the list alone (DND-055).
    experiencePoints: monster.experiencePoints,
    type: monster.type,
  })),
  'magic-items': served<SrdMagicItem>(MAGIC_ITEMS, (item) => ({
    index: item.index,
    name: item.name,
    category: item.category,
    rarity: item.rarity,
  })),
  equipment: served<SrdEquipment>(EQUIPMENT, (entry) => ({
    index: entry.index,
    name: entry.name,
    categories: entry.categories,
    cost: entry.cost,
    weight: entry.weight,
  })),
}

export function isServedCollection(name: string): boolean {
  return Object.hasOwn(SERVED_COLLECTIONS, name)
}

/** The `{ count, results }` body every list endpoint answers with. */
export function listBody(results: SrdListRow[]) {
  return { count: results.length, results }
}

/** A cacheable reference response. */
export function referenceJson(data: unknown) {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': REFERENCE_CACHE_CONTROL },
  })
}

// Errors are never cached — a 404 for a mistyped index must not stick to the
// edge for a day.
export function referenceError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}
