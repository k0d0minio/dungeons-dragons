'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/navigation/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReferenceTabPanel, type OtherTabMatch } from '@/components/reference/reference-tab-panel'
import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-sheet'
import {
  useSpells,
  useClasses,
  useRaces,
  useEquipment,
  useMonsters,
  useMagicItems,
  searchByName,
} from '@/lib/dnd-api/swr-hooks'
import { Sword, Users, Search, Scroll, Crown, Skull, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypeFilter {
  value: string
  label: string
  icon: typeof Scroll
}

// The six content types, demoted to filter chips — the search box is the
// Library's primary control, not a tab bar (home-and-library).
const TYPE_FILTERS: TypeFilter[] = [
  { value: 'spells', label: 'Spells', icon: Scroll },
  { value: 'classes', label: 'Classes', icon: Crown },
  { value: 'races', label: 'Species', icon: Users },
  { value: 'equipment', label: 'Equipment', icon: Sword },
  { value: 'magic-items', label: 'Magic Items', icon: Sparkles },
  { value: 'monsters', label: 'Monsters', icon: Skull },
]

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('spells')
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)

  // Fetch data using SWR hooks
  const { spells, isLoading: spellsLoading, error: spellsError } = useSpells()
  const { classes, isLoading: classesLoading, error: classesError } = useClasses()
  const { races, isLoading: racesLoading, error: racesError } = useRaces()
  const { equipment, isLoading: equipmentLoading, error: equipmentError } = useEquipment()
  const { monsters, isLoading: monstersLoading, error: monstersError } = useMonsters()
  const { magicItems, isLoading: magicItemsLoading, error: magicItemsError } = useMagicItems()

  // Search runs over every type at once, not just the chip that is lit.
  const filteredSpells = searchByName(spells, searchQuery)
  const filteredClasses = searchByName(classes, searchQuery)
  const filteredRaces = searchByName(races, searchQuery)
  const filteredEquipment = searchByName(equipment, searchQuery)
  const filteredMonsters = searchByName(monsters, searchQuery)
  const filteredMagicItems = searchByName(magicItems, searchQuery)

  // A query that misses the lit type often hits another one. Rather than
  // leaving the player to try all six, a dead end names the chips that matched.
  const tabMatches = [
    { value: 'spells', label: 'Spells', count: filteredSpells.length },
    { value: 'classes', label: 'Classes', count: filteredClasses.length },
    { value: 'races', label: 'Species', count: filteredRaces.length },
    { value: 'equipment', label: 'Equipment', count: filteredEquipment.length },
    { value: 'magic-items', label: 'Magic Items', count: filteredMagicItems.length },
    { value: 'monsters', label: 'Monsters', count: filteredMonsters.length },
  ]

  const otherMatchesFor = (value: string): OtherTabMatch[] =>
    searchQuery.trim() ? tabMatches.filter((tab) => tab.value !== value && tab.count > 0) : []

  const jumpToType = (value: string) => setActiveType(value)

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <PageHeader title="Library" subtitle="Reference lookup for the table" />

        {/*
          The Library answers a rules lookup in under ten seconds, and search
          is that fast path — so the search box is the first thing after the
          header, and the six content types are filter chips beneath it, not a
          competing row of tabs (home-and-library).
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
        </div>

        {/*
          The six content types as filter chips. The lit chip is the type whose
          list the panel shows; a query still sweeps all six, so the lit chip
          can name where the match really is rather than hiding it.
        */}
        <div
          role="group"
          aria-label="Content type"
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          {TYPE_FILTERS.map(({ value, label, icon: Icon }) => {
            const active = activeType === value
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => jumpToType(value)}
                className={cn(
                  'focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground hover:bg-accent border-border',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
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

        {/* The lit type's list. Only the active chip is rendered; the search
            still sweeps every type and the cross-tab hints name the others. */}
        {activeType === 'spells' && (
          <ReferenceTabPanel
            title="Spells"
            pluralNoun="spells"
            icon={<Scroll className="w-5 h-5 text-gold" />}
            description="Magical incantations and abilities for spellcasters"
            badge="Spell"
            items={filteredSpells}
            totalCount={spells.length}
            isLoading={spellsLoading}
            error={spellsError}
            query={searchQuery}
            spinnerClassName="border-gold"
            onSelect={(item) => setSelection({ type: 'spell', ...item })}
            otherMatches={otherMatchesFor('spells')}
            onJumpToTab={jumpToType}
          />
        )}

        {activeType === 'classes' && (
          <ReferenceTabPanel
            title="Classes"
            pluralNoun="classes"
            icon={<Crown className="w-5 h-5 text-gold" />}
            description="Character classes defining your character's abilities and role"
            badge="Class"
            items={filteredClasses}
            totalCount={classes.length}
            isLoading={classesLoading}
            error={classesError}
            query={searchQuery}
            spinnerClassName="border-gold"
            onSelect={(item) => setSelection({ type: 'class', ...item })}
            otherMatches={otherMatchesFor('classes')}
            onJumpToTab={jumpToType}
          />
        )}

        {activeType === 'races' && (
          <ReferenceTabPanel
            title="Species"
            pluralNoun="species"
            icon={<Users className="w-5 h-5 text-gold" />}
            description="Different species and cultures that shape your character"
            badge="Species"
            items={filteredRaces}
            totalCount={races.length}
            isLoading={racesLoading}
            error={racesError}
            query={searchQuery}
            spinnerClassName="border-gold"
            onSelect={(item) => setSelection({ type: 'race', ...item })}
            otherMatches={otherMatchesFor('races')}
            onJumpToTab={jumpToType}
          />
        )}

        {activeType === 'equipment' && (
          <ReferenceTabPanel
            title="Equipment"
            pluralNoun="equipment items"
            icon={<Sword className="w-5 h-5 text-gold" />}
            description="Weapons, armor, and tools for your adventures"
            badge="Equipment"
            items={filteredEquipment}
            totalCount={equipment.length}
            isLoading={equipmentLoading}
            error={equipmentError}
            query={searchQuery}
            spinnerClassName="border-gold"
            onSelect={(item) => setSelection({ type: 'equipment', ...item })}
            otherMatches={otherMatchesFor('equipment')}
            onJumpToTab={jumpToType}
          />
        )}

        {activeType === 'magic-items' && (
          <ReferenceTabPanel
            title="Magic Items"
            pluralNoun="magic items"
            icon={<Sparkles className="w-5 h-5 text-gold" />}
            description="Enchanted items, from healing potions to legendary blades"
            badge="Magic Item"
            items={filteredMagicItems}
            totalCount={magicItems.length}
            isLoading={magicItemsLoading}
            error={magicItemsError}
            query={searchQuery}
            spinnerClassName="border-gold"
            onSelect={(item) => setSelection({ type: 'magic-item', ...item })}
            otherMatches={otherMatchesFor('magic-items')}
            onJumpToTab={jumpToType}
          />
        )}

        {activeType === 'monsters' && (
          <ReferenceTabPanel
            title="Monsters"
            pluralNoun="monsters"
            icon={<Skull className="w-5 h-5 text-primary" />}
            description="Creatures and enemies for your encounters"
            badge="Monster"
            items={filteredMonsters}
            totalCount={monsters.length}
            isLoading={monstersLoading}
            error={monstersError}
            query={searchQuery}
            spinnerClassName="border-primary"
            onSelect={(item) => setSelection({ type: 'monster', ...item })}
            otherMatches={otherMatchesFor('monsters')}
            onJumpToTab={jumpToType}
          />
        )}

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
