'use client'

import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  REFERENCE_TYPE_LABELS,
  ReferenceDetailBody,
  type ReferenceSelection,
  type ReferenceType,
} from '@/components/reference/reference-detail-body'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useClasses, useEquipment, useMonsters, useRaces, useSpells } from '@/lib/dnd-api/swr-hooks'

/** Enough to scroll a little, few enough that the answer is near the top. */
const RESULT_LIMIT = 24

interface LookupResult {
  type: ReferenceType
  index: string
  name: string
}

interface NameOnly {
  index: string
  name: string
}

/**
 * One matcher for all five lists rather than `searchSpells` / `searchEquipment`
 * / `searchMonsters` — those three cover only three of the types and none of
 * them rank, and a mid-session lookup wants "Goblin" above "Hobgoblin" when
 * you typed `gob`.
 */
function rank(name: string, query: string): number {
  const candidate = name.toLowerCase()

  if (candidate.startsWith(query)) return 0
  if (candidate.includes(query)) return 1
  return -1
}

function collect(
  items: NameOnly[],
  type: ReferenceType,
  query: string,
): Array<LookupResult & { rank: number }> {
  return items
    .filter((item) => item?.index && item?.name)
    .map((item) => ({ type, index: item.index, name: item.name, rank: rank(item.name, query) }))
    .filter((item) => item.rank >= 0)
}

function ResultRow({ result, onSelect }: { result: LookupResult; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{result.name}</span>
        <Badge variant="outline" className="shrink-0">
          {REFERENCE_TYPE_LABELS[result.type]}
        </Badge>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </button>
    </li>
  )
}

/**
 * The search half of the overlay. Split out so its five list fetches only
 * start when the sheet is actually open — mounting them with the tab bar would
 * pull the whole reference index on every page in the app.
 */
function LookupResults({
  query,
  onSelect,
}: {
  query: string
  onSelect: (selection: ReferenceSelection) => void
}) {
  const { spells, isLoading: spellsLoading } = useSpells()
  const { monsters, isLoading: monstersLoading } = useMonsters()
  const { equipment, isLoading: equipmentLoading } = useEquipment()
  const { classes, isLoading: classesLoading } = useClasses()
  const { races, isLoading: racesLoading } = useRaces()

  const loading =
    spellsLoading || monstersLoading || equipmentLoading || classesLoading || racesLoading

  const trimmed = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!trimmed) return []

    // Types in the order a table asks for them: what am I casting, what am I
    // fighting, what am I holding.
    return [
      ...collect(spells, 'spell', trimmed),
      ...collect(monsters, 'monster', trimmed),
      ...collect(equipment, 'equipment', trimmed),
      ...collect(classes, 'class', trimmed),
      ...collect(races, 'race', trimmed),
    ]
      .sort((a, b) => a.rank - b.rank)
      .slice(0, RESULT_LIMIT)
  }, [trimmed, spells, monsters, equipment, classes, races])

  if (!trimmed) {
    return (
      <p className="text-muted-foreground px-3 py-6 text-sm">
        Search spells, monsters, equipment, classes and races. What you were reading stays open
        behind this.
      </p>
    )
  }

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-6 text-sm">
        {loading ? 'Loading the reference lists…' : `Nothing matching “${query.trim()}”.`}
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {results.map((result) => (
        <ResultRow
          key={`${result.type}:${result.index}`}
          result={result}
          onSelect={() => onSelect({ type: result.type, index: result.index, name: result.name })}
        />
      ))}
    </ul>
  )
}

/**
 * Reference lookup as an overlay rather than a destination (DND-029).
 *
 * The problem this exists for is a sheet mid-session: looking a monster up used
 * to mean navigating away from the character sheet and coming back to the top
 * of it. An overlay cannot lose your place, because the page underneath is
 * never unmounted — the same reason the sheet's known spells already open in
 * place (`character-sheet.tsx`), extended to the whole reference half.
 *
 * Results and detail share one sheet rather than stacking two: a second
 * bottom sheet over the first would put two close controls in the same thumb
 * corner.
 */
export function ReferenceLookupSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)

        // A closed overlay is a finished lookup: reopening starts on an empty
        // field rather than on last round's answer.
        if (!next) {
          setQuery('')
          setSelection(null)
        }
      }}
    >
      <SheetContent
        side="bottom"
        // Same 44px close target as the DND-003 detail sheet.
        className="h-[90dvh] gap-0 rounded-t-xl p-0 sm:mx-auto sm:max-w-2xl [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:top-3 [&>button]:right-3"
      >
        {selection ? (
          <>
            <SheetHeader className="border-b pr-14">
              <SheetTitle className="text-lg">{selection.name}</SheetTitle>
              <SheetDescription>{REFERENCE_TYPE_LABELS[selection.type]}</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4">
              <ReferenceDetailBody selection={selection} />
            </div>
            {/* Back sits at the bottom, not beside the title: after reading a
                stat block your thumb is nowhere near the top of the screen. */}
            <div className="bg-background border-t p-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => setSelection(null)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Back to search
              </Button>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="border-b pr-14">
              <SheetTitle className="text-lg">Look something up</SheetTitle>
              <SheetDescription className="sr-only">
                Search the D&amp;D 5e reference without leaving this page.
              </SheetDescription>
              <div className="relative mt-1">
                <Label htmlFor="reference-lookup" className="sr-only">
                  Search the reference
                </Label>
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <Input
                  id="reference-lookup"
                  type="search"
                  autoFocus
                  autoComplete="off"
                  placeholder="Spell, monster, item…"
                  className="h-11 pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto overscroll-contain p-2">
              {/* Mounted only while the sheet is open — see `LookupResults`. */}
              {open ? <LookupResults query={query} onSelect={setSelection} /> : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
