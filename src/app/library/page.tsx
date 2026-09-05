'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/navigation/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReferenceTabPanel } from '@/components/reference/reference-tab-panel'
import {
  ReferenceDetailSheet,
  type ReferenceSelection,
  type ReferenceType,
} from '@/components/reference/reference-detail-sheet'
import { REFERENCE_TYPE_LABELS } from '@/components/reference/reference-detail-body'
import {
  REFERENCE_GROUP_LABELS,
  REFERENCE_SEARCH_ORDER,
  ReferenceResultRow,
  useReferenceSearch,
  type ReferenceGroup,
} from '@/components/reference/reference-search'
import { Sword, Users, Search, Scroll, Crown, Skull, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypeChip {
  type: ReferenceType
  icon: typeof Scroll
  /** The lower-case noun the browse panel counts: "Loading spells...". */
  pluralNoun: string
  description: string
  spinnerClassName: string
}

// The six content types as chips beneath the search box. With an empty box a
// chip browses that type's whole list; with a query it narrows the grouped
// results to one type. Chip order is the browse order, not the search order.
const TYPE_CHIPS: TypeChip[] = [
  {
    type: 'spell',
    icon: Scroll,
    pluralNoun: 'spells',
    description: 'Magical incantations and abilities for spellcasters',
    spinnerClassName: 'border-gold',
  },
  {
    type: 'class',
    icon: Crown,
    pluralNoun: 'classes',
    description: 'Character classes defining your character’s abilities and role',
    spinnerClassName: 'border-gold',
  },
  {
    type: 'species',
    icon: Users,
    pluralNoun: 'species',
    description: 'Different species and cultures that shape your character',
    spinnerClassName: 'border-gold',
  },
  {
    type: 'equipment',
    icon: Sword,
    pluralNoun: 'equipment items',
    description: 'Weapons, armor, and tools for your adventures',
    spinnerClassName: 'border-gold',
  },
  {
    type: 'magic-item',
    icon: Sparkles,
    pluralNoun: 'magic items',
    description: 'Enchanted items, from healing potions to legendary blades',
    spinnerClassName: 'border-gold',
  },
  {
    type: 'monster',
    icon: Skull,
    pluralNoun: 'monsters',
    description: 'Creatures and enemies for your encounters',
    spinnerClassName: 'border-primary',
  },
]

/** How many rows a group lists before it asks you to tap for the rest. */
const GROUP_PAGE_SIZE = 12

/**
 * One type's results under its heading, capped so that `a` does not paint
 * eleven hundred rows. Each group pages on its own: opening the rest of the
 * monsters must not push the spells you were reading off the screen.
 */
function ResultGroup({
  group,
  query,
  onSelect,
}: {
  group: ReferenceGroup
  query: string
  onSelect: (selection: ReferenceSelection) => void
}) {
  const [visibleCount, setVisibleCount] = useState(GROUP_PAGE_SIZE)

  // A new query is a new list — start it from the top rather than partway
  // through the previous search's "show more" chain. Adjusted during render
  // rather than in an effect, so the reset happens before the old slice is
  // ever painted (react.dev/learn/you-might-not-need-an-effect).
  const [lastQuery, setLastQuery] = useState(query)

  if (lastQuery !== query) {
    setLastQuery(query)
    setVisibleCount(GROUP_PAGE_SIZE)
  }

  const visible = group.results.slice(0, visibleCount)
  const remaining = group.results.length - visible.length
  const headingId = `library-group-${group.type}`

  return (
    <section aria-labelledby={headingId} className="space-y-1">
      <h2 id={headingId} className="px-3 pt-2 text-sm font-semibold text-muted-foreground">
        {group.label} ({group.results.length})
      </h2>
      <ul className="space-y-1">
        {visible.map((result) => (
          <ReferenceResultRow
            key={result.index}
            result={result}
            onSelect={() => onSelect({ type: result.type, index: result.index, name: result.name })}
          />
        ))}
      </ul>
      {remaining > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="mx-3 h-11 w-[calc(100%-1.5rem)] sm:w-auto"
          onClick={() => setVisibleCount((count) => count + GROUP_PAGE_SIZE)}
        >
          Show {Math.min(remaining, GROUP_PAGE_SIZE)} more
        </Button>
      ) : null}
    </section>
  )
}

/**
 * The Library opens on a question (first-table/library-search-first).
 *
 * A beginner opening this mid-session has one thing to ask — "what does Prone
 * do", "what is a Bugbear" — so the page is a search box and nothing else
 * until something is typed. Typing searches all six types at once and lists
 * the hits grouped by type; the chips narrow to one type. An empty box keeps
 * the chips as the way to browse, for the player who wants the alphabet.
 */
export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<ReferenceType | null>(null)
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)

  // The same matcher as the bar's lookup overlay — one search, two surfaces.
  const { loading, groups, total, lists } = useReferenceSearch(searchQuery)

  const trimmedQuery = searchQuery.trim()
  const searching = trimmedQuery.length > 0
  const activeChip = TYPE_CHIPS.find((chip) => chip.type === activeType) ?? null
  const ActiveIcon = activeChip?.icon ?? Scroll

  const shownGroups = activeType ? groups.filter((group) => group.type === activeType) : groups
  const failed = REFERENCE_SEARCH_ORDER.filter((type) => lists[type].error).map((type) =>
    REFERENCE_GROUP_LABELS[type].toLowerCase(),
  )

  // Tapping the lit chip again clears it, in both modes: back to the grouped
  // results while searching, back to just the search box while not.
  const toggleType = (type: ReferenceType) =>
    setActiveType((current) => (current === type ? null : type))

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <PageHeader title="Library" subtitle="Reference lookup for the table" />

        {/*
          The Library answers a rules lookup in under ten seconds, and search
          is that fast path — so the search box is the first thing after the
          header and the only thing that does anything until it is used.
        */}
        <div className="sm:max-w-md">
          <Label htmlFor="search" className="sr-only">
            Search D&D Content
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="search"
              type="search"
              placeholder="Search spells, classes, species, equipment, magic items, monsters"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Type a name to search all six types at once. Tap a type to browse its whole list.
          </p>
        </div>

        {/* The six types. Lit, a chip narrows a search to one type or opens
            one type's list to browse; nothing is lit until you tap. */}
        <div
          role="group"
          aria-label="Content type"
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          {TYPE_CHIPS.map(({ type, icon: Icon }) => {
            const active = activeType === type
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(type)}
                className={cn(
                  'focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground hover:bg-accent border-border',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {REFERENCE_GROUP_LABELS[type]}
              </button>
            )
          })}
        </div>

        {/*
          The rules chapters, one tap from the Library. A single 44px-high row
          of link chips: it sits below the chips, so the ten-second lookup path
          is untouched and nothing moves at 320px.
        */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Rules:</span>
          <Link
            href="/rules"
            className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            All chapters
          </Link>
          <Link
            href="/rules/conditions"
            className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Conditions
          </Link>
          <Link
            href="/rules/quick-reference"
            className="bg-background hover:bg-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Quick reference
          </Link>
        </div>

        {searching ? (
          <div className="space-y-4">
            {loading ? (
              <p className="px-3 text-sm text-muted-foreground" aria-live="polite">
                Loading the reference lists…
              </p>
            ) : null}
            {failed.length > 0 ? (
              <p className="px-3 text-sm text-destructive" aria-live="polite">
                Could not load {failed.join(', ')}. Those are missing from these results.
              </p>
            ) : null}

            {shownGroups.map((group) => (
              <ResultGroup
                key={group.type}
                group={group}
                query={trimmedQuery}
                onSelect={setSelection}
              />
            ))}

            {!loading && total === 0 ? (
              <p className="px-3 text-sm text-muted-foreground" aria-live="polite">
                Nothing matching “{trimmedQuery}”.
              </p>
            ) : null}

            {/* The lit chip has no hits but other types do: say so, and make
                the way out one tap rather than a hunt for the lit chip. */}
            {activeChip && shownGroups.length === 0 && total > 0 ? (
              <div className="space-y-3 px-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  No {activeChip.pluralNoun} match “{trimmedQuery}”.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-auto"
                  onClick={() => setActiveType(null)}
                >
                  Show all {total} results
                </Button>
              </div>
            ) : null}
          </div>
        ) : activeChip ? (
          <ReferenceTabPanel
            // Keyed by type so a "Show more" chain does not carry from one
            // type's list to the next.
            key={activeChip.type}
            title={REFERENCE_GROUP_LABELS[activeChip.type]}
            pluralNoun={activeChip.pluralNoun}
            icon={
              <ActiveIcon
                className={cn(
                  'w-5 h-5',
                  activeChip.type === 'monster' ? 'text-primary' : 'text-gold',
                )}
              />
            }
            description={activeChip.description}
            badge={REFERENCE_TYPE_LABELS[activeChip.type]}
            items={lists[activeChip.type].items}
            isLoading={lists[activeChip.type].isLoading}
            error={lists[activeChip.type].error}
            spinnerClassName={activeChip.spinnerClassName}
            onSelect={(item) => setSelection({ type: activeChip.type, ...item })}
          />
        ) : null}

        {/* Footer */}
        <div className="mt-8 text-center sm:mt-16">
          <p className="text-sm text-muted-foreground">
            Powered by D&D 5e API • Built with Next.js, SWR, and shadcn/ui
          </p>
        </div>
      </main>

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
