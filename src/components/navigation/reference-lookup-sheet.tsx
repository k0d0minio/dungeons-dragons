'use client'

import { ChevronLeft, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  REFERENCE_TYPE_LABELS,
  ReferenceDetailBody,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-body'
import { ReferenceResultRow, useReferenceSearch } from '@/components/reference/reference-search'
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

/** Enough to scroll a little, few enough that the answer is near the top. */
const RESULT_LIMIT = 24

/**
 * The search half of the overlay. Split out so its four list fetches only
 * start when the sheet is actually open — mounting them with the tab bar would
 * pull the whole reference index on every page in the app. The matcher itself
 * is `useReferenceSearch`, shared with the Library page.
 */
function LookupResults({
  query,
  onSelect,
  onNavigate,
}: {
  query: string
  onSelect: (selection: ReferenceSelection) => void
  /** Called when a link inside the sheet leaves the page — closes the sheet. */
  onNavigate: () => void
}) {
  const { loading, groups } = useReferenceSearch(query)

  const trimmed = query.trim()

  // The shared matcher groups by type; the overlay flattens that into one
  // ranked list, because a thumb mid-session wants the answer near the top,
  // not under the right heading. Groups come in table order, so a stable
  // sort by rank keeps "Goodberry" above "Goblin" above "Hobgoblin" for `go`.
  const results = useMemo(
    () =>
      groups
        .flatMap((group) => group.results)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, RESULT_LIMIT),
    [groups],
  )

  if (!trimmed) {
    return (
      <div className="space-y-4 px-3 py-6">
        <p className="text-muted-foreground text-sm">
          Search spells, monsters, equipment, magic items, classes and species. What you were
          reading stays open behind this.
        </p>
        {/* The two DND-037 rules chapters: no search needed for "what does
            restrained do", so they are one tap from the empty field. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Rules:</span>
          <Link
            href="/rules/conditions"
            onClick={onNavigate}
            className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Conditions
          </Link>
          <Link
            href="/rules/quick-reference"
            onClick={onNavigate}
            className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Quick reference
          </Link>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-6 text-sm">
        {loading ? 'Loading the reference lists…' : `Nothing matching “${trimmed}”.`}
      </p>
    )
  }

  return (
    <ul className="space-y-1">
      {results.map((result) => (
        <ReferenceResultRow
          key={`${result.type}:${result.index}`}
          result={result}
          badge
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

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)

    // A closed overlay is a finished lookup: reopening starts on an empty
    // field rather than on last round's answer.
    if (!next) {
      setQuery('')
      setSelection(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
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
              {open ? (
                <LookupResults
                  query={query}
                  onSelect={setSelection}
                  onNavigate={() => handleOpenChange(false)}
                />
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
