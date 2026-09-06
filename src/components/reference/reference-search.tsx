'use client'

import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'

import {
  REFERENCE_TYPE_LABELS,
  type ReferenceType,
} from '@/components/reference/reference-detail-body'
import { Badge } from '@/components/ui/badge'
import { CLASSES } from '@/lib/srd/classes'
import { useEquipment, useMagicItems, useMonsters, useSpells } from '@/lib/srd/hooks'
import { SPECIES } from '@/lib/srd/species'

// One matcher for the two surfaces that search the reference: the Library
// (`/library`, search-first since first-table/library-search-first) and the
// lookup overlay the bar opens from every other page (DND-029). They present
// the answer differently — grouped by type on the page, one flat ranked list
// in the overlay — but the question is the same, so the ranking and the six
// lists live here rather than twice.
//
// Only the four list hooks are imported from `@/lib/srd/hooks`: some suites
// mock that module with nothing else in it, and this module is under them.

/** One hit: enough to open a `ReferenceDetailSheet`, nothing more. */
export interface LookupResult {
  type: ReferenceType
  index: string
  name: string
}

/** A hit with where in the ranking it landed — `0` prefix, `1` substring. */
export interface RankedResult extends LookupResult {
  rank: number
}

/** The results of one type, under the plural label a heading prints. */
export interface ReferenceGroup {
  type: ReferenceType
  label: string
  results: RankedResult[]
}

/** One list's state, before any query is applied. */
export interface ReferenceListState {
  items: readonly NameOnly[]
  isLoading: boolean
  error: unknown
}

interface NameOnly {
  index: string
  name: string
}

/** The plural labels — a group heading or a browse chip, not a row badge. */
export const REFERENCE_GROUP_LABELS: Record<ReferenceType, string> = {
  spell: 'Spells',
  class: 'Classes',
  species: 'Species',
  equipment: 'Equipment',
  'magic-item': 'Magic Items',
  monster: 'Monsters',
}

/**
 * Types in the order a table asks for them: what am I casting, what am I
 * fighting, what am I holding — then who I am.
 */
export const REFERENCE_SEARCH_ORDER: readonly ReferenceType[] = [
  'spell',
  'monster',
  'equipment',
  'magic-item',
  'class',
  'species',
]

/**
 * A prefix match beats a substring match, and a miss is out: a mid-session
 * lookup wants "Goblin" above "Hobgoblin" when you typed `gob`. `query` is
 * already trimmed and lower-cased by the caller.
 */
export function rank(name: string, query: string): number {
  const candidate = name.toLowerCase()

  if (candidate.startsWith(query)) return 0
  if (candidate.includes(query)) return 1
  return -1
}

const byRank = (a: RankedResult, b: RankedResult) => a.rank - b.rank

/**
 * Every hit in one list, prefix matches first and source order within a rank
 * (the sort is stable). Rows without an index or a name are skipped rather
 * than rendered as blanks.
 */
export function collect(
  items: readonly NameOnly[],
  type: ReferenceType,
  query: string,
): RankedResult[] {
  return items
    .filter((item) => item?.index && item?.name)
    .map((item) => ({ type, index: item.index, name: item.name, rank: rank(item.name, query) }))
    .filter((item) => item.rank >= 0)
    .sort(byRank)
}

/**
 * The six lists and the query run over them.
 *
 * The long tail is fetched from `/api/srd/*` — a megabyte of spells and stat
 * blocks does not belong in a phone's bundle — while classes and species are
 * read straight from the local SRD data, already here for the character
 * sheet, so those two never load or fail. `lists` is exposed for a surface
 * that browses one whole type instead of searching; `groups` is empty for a
 * blank query rather than everything at once.
 */
export function useReferenceSearch(query: string): {
  loading: boolean
  groups: ReferenceGroup[]
  total: number
  lists: Record<ReferenceType, ReferenceListState>
} {
  const { spells, isLoading: spellsLoading, error: spellsError } = useSpells()
  const { monsters, isLoading: monstersLoading, error: monstersError } = useMonsters()
  const { equipment, isLoading: equipmentLoading, error: equipmentError } = useEquipment()
  const { magicItems, isLoading: magicItemsLoading, error: magicItemsError } = useMagicItems()

  const lists = useMemo<Record<ReferenceType, ReferenceListState>>(
    () => ({
      spell: { items: spells, isLoading: spellsLoading, error: spellsError },
      monster: { items: monsters, isLoading: monstersLoading, error: monstersError },
      equipment: { items: equipment, isLoading: equipmentLoading, error: equipmentError },
      'magic-item': { items: magicItems, isLoading: magicItemsLoading, error: magicItemsError },
      class: { items: CLASSES.all, isLoading: false, error: undefined },
      species: { items: SPECIES.all, isLoading: false, error: undefined },
    }),
    [
      spells,
      spellsLoading,
      spellsError,
      monsters,
      monstersLoading,
      monstersError,
      equipment,
      equipmentLoading,
      equipmentError,
      magicItems,
      magicItemsLoading,
      magicItemsError,
    ],
  )

  const trimmed = query.trim().toLowerCase()

  const groups = useMemo(() => {
    if (!trimmed) return []

    return REFERENCE_SEARCH_ORDER.map((type) => ({
      type,
      label: REFERENCE_GROUP_LABELS[type],
      results: collect(lists[type].items, type, trimmed),
    })).filter((group) => group.results.length > 0)
  }, [trimmed, lists])

  const total = groups.reduce((sum, group) => sum + group.results.length, 0)
  const loading = spellsLoading || monstersLoading || equipmentLoading || magicItemsLoading

  return { loading, groups, total, lists }
}

/**
 * One tappable result. The badge is for a list that mixes types (the
 * overlay); a list already under a type heading leaves it off.
 */
export function ReferenceResultRow({
  result,
  badge = false,
  onSelect,
}: {
  result: LookupResult
  badge?: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{result.name}</span>
        {badge ? (
          <Badge variant="outline" className="shrink-0">
            {REFERENCE_TYPE_LABELS[result.type]}
          </Badge>
        ) : null}
        <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </button>
    </li>
  )
}
