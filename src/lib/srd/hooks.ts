'use client'

// The client's view of the SRD 5.2.1 reference data
// (`srd-2024-migration/long-tail-reference-data`).
//
// Replaces `src/lib/dnd-api/swr-hooks.ts`. Two things changed with it:
//
//  1. The data is local. `/api/srd/*` reads a JSON module compiled into the
//     deployment, so these hooks are still HTTP — a phone should not download
//     a megabyte of stat blocks to draw a search box — but nothing behind them
//     can be slow or down the way dnd5eapi.co could.
//  2. The shapes are the app's, not upstream's. Detail types come from
//     `@/lib/srd/types`, which is the same module the server serves from, so a
//     field the generator stops emitting is a type error rather than an
//     `undefined` that reaches a character sheet.
//
// Lists carry only what a list view sorts, groups or filters by; everything
// else is one request away under `/api/srd/{collection}/{index}`.
//
// Only the long tail is here. Classes, species and the rest of the creation
// sets are imported straight from `@/lib/srd/*` by the components that need
// them — they are already in the bundle for the character sheet, so a hook that
// fetched them over HTTP would ship the same JSON twice.
import useSWR from 'swr'

import type { SrdCost, SrdEquipment, SrdMagicItem, SrdMonster, SrdSpell } from './types'

export const SRD_API_BASE_URL = '/api/srd'

export const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

/** Every list endpoint answers `{ count, results }`; `T` names the row type. */
export interface SrdListResponse<T> {
  count: number
  results: T[]
}

/** The row every list returns, before its collection's own columns. */
export interface SrdRow {
  index: string
  name: string
}

export interface SpellRow extends SrdRow {
  level: number
  school: string
  concentration: boolean
  ritual: boolean
}

export interface MonsterRow extends SrdRow {
  challengeRating: number
  challengeRatingText: string
  experiencePoints: number
  type: string
}

export interface MagicItemRow extends SrdRow {
  category: string
  rarity: string
}

export interface EquipmentRow extends SrdRow {
  categories: string[]
  cost: SrdCost | null
  weight: number | null
}

// Reference data never changes between deploys, so revalidating on focus or
// reconnect only costs a request. The deduping windows match what the proxy's
// hooks used: a minute for lists, five for a single entry.
const LIST_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
} as const

const ENTRY_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 300000,
} as const

function useList<T>(path: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SrdListResponse<T>>(
    path ? `${SRD_API_BASE_URL}${path}` : null,
    fetcher,
    LIST_OPTIONS,
  )
  return { results: data?.results ?? [], count: data?.count ?? 0, isLoading, error, mutate }
}

function useEntry<T>(collection: string, index: string | null) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    index ? `${SRD_API_BASE_URL}/${collection}/${index}` : null,
    fetcher,
    ENTRY_OPTIONS,
  )
  return { entry: data, isLoading, error, mutate }
}

/**
 * Several entries of one collection at once, keyed by index — what the sheet's
 * attack rows and the encounter's XP award read to join what is equipped or in
 * the fight. One SWR entry per *set* rather than a hook per item, because the
 * set is dynamic (hooks cannot run in a loop) and every consumer of the same
 * set shares one join.
 *
 * An index whose fetch fails is simply absent from the map, so one broken row
 * costs its own row and nothing else.
 */
function useEntries<T>(collection: string, indexes: readonly string[]) {
  const sorted = [...new Set(indexes)].sort()
  const key = sorted.length > 0 ? `${collection}-details:${sorted.join(',')}` : null

  const { data, error, isLoading, mutate } = useSWR<Record<string, T>>(
    key,
    async () => {
      const settled = await Promise.allSettled(
        sorted.map((index) => fetcher(`${SRD_API_BASE_URL}/${collection}/${index}`)),
      )
      const details: Record<string, T> = {}
      settled.forEach((result, position) => {
        if (result.status === 'fulfilled') details[sorted[position]] = result.value as T
      })
      return details
    },
    ENTRY_OPTIONS,
  )

  return { details: data ?? {}, isLoading, error, mutate }
}

// --- spells ------------------------------------------------------------------

export const useSpells = () => {
  const { results, count, isLoading, error, mutate } = useList<SpellRow>('/spells')
  return { spells: results, count, isLoading, error, mutate }
}

/**
 * The spells on one class's list. This is a filter on the spell list rather
 * than its own endpoint — the 2014 proxy had a separate
 * `/classes/{index}/spells` route because upstream did; the local data just
 * knows which classes each spell belongs to.
 */
export const useClassSpells = (classIndex: string | null) => {
  const { results, count, isLoading, error, mutate } = useList<SpellRow>(
    classIndex ? `/spells?class=${encodeURIComponent(classIndex)}` : null,
  )
  return { spells: results, count, isLoading, error, mutate }
}

export const useSpell = (index: string | null) => {
  const { entry, isLoading, error, mutate } = useEntry<SrdSpell>('spells', index)
  return { spell: entry, isLoading, error, mutate }
}

// --- monsters ----------------------------------------------------------------

export const useMonsters = () => {
  const { results, count, isLoading, error, mutate } = useList<MonsterRow>('/monsters')
  return { monsters: results, count, isLoading, error, mutate }
}

export const useMonster = (index: string | null) => {
  const { entry, isLoading, error, mutate } = useEntry<SrdMonster>('monsters', index)
  return { monster: entry, isLoading, error, mutate }
}

export const useMonsterDetails = (indexes: readonly string[]) =>
  useEntries<SrdMonster>('monsters', indexes)

// --- magic items -------------------------------------------------------------

export const useMagicItems = () => {
  const { results, count, isLoading, error, mutate } = useList<MagicItemRow>('/magic-items')
  return { magicItems: results, count, isLoading, error, mutate }
}

export const useMagicItem = (index: string | null) => {
  const { entry, isLoading, error, mutate } = useEntry<SrdMagicItem>('magic-items', index)
  return { magicItem: entry, isLoading, error, mutate }
}

// --- equipment ---------------------------------------------------------------

export const useEquipment = () => {
  const { results, count, isLoading, error, mutate } = useList<EquipmentRow>('/equipment')
  return { equipment: results, count, isLoading, error, mutate }
}

export const useEquipmentItem = (index: string | null) => {
  const { entry, isLoading, error, mutate } = useEntry<SrdEquipment>('equipment', index)
  return { equipment: entry, isLoading, error, mutate }
}

export const useEquipmentDetails = (indexes: readonly string[]) =>
  useEntries<SrdEquipment>('equipment', indexes)

// --- search ------------------------------------------------------------------

/**
 * Case-insensitive substring match on `name`. Every list row carries one, so
 * one predicate serves all six reference types (DND-021). An empty or
 * whitespace-only query matches everything.
 */
export const searchByName = <T extends { name?: string }>(items: T[], query: string): T[] => {
  const lowercaseQuery = query.trim().toLowerCase()
  if (!lowercaseQuery) return items
  return items.filter((item) => item?.name?.toLowerCase().includes(lowercaseQuery))
}
