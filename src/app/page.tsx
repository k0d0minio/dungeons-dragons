'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('spells')
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)

  // Fetch data using SWR hooks
  const { spells, isLoading: spellsLoading, error: spellsError } = useSpells()
  const { classes, isLoading: classesLoading, error: classesError } = useClasses()
  const { races, isLoading: racesLoading, error: racesError } = useRaces()
  const { equipment, isLoading: equipmentLoading, error: equipmentError } = useEquipment()
  const { monsters, isLoading: monstersLoading, error: monstersError } = useMonsters()
  const { magicItems, isLoading: magicItemsLoading, error: magicItemsError } = useMagicItems()

  // Search runs over every tab, not just the three it used to reach.
  const filteredSpells = searchByName(spells, searchQuery)
  const filteredClasses = searchByName(classes, searchQuery)
  const filteredRaces = searchByName(races, searchQuery)
  const filteredEquipment = searchByName(equipment, searchQuery)
  const filteredMonsters = searchByName(monsters, searchQuery)
  const filteredMagicItems = searchByName(magicItems, searchQuery)

  // A query that misses the open tab often hits another one. Rather than
  // leaving the player to try all six, a dead end names the tabs that matched.
  const tabMatches = [
    { value: 'spells', label: 'Spells', count: filteredSpells.length },
    { value: 'classes', label: 'Classes', count: filteredClasses.length },
    { value: 'races', label: 'Races', count: filteredRaces.length },
    { value: 'equipment', label: 'Equipment', count: filteredEquipment.length },
    { value: 'magic-items', label: 'Magic Items', count: filteredMagicItems.length },
    { value: 'monsters', label: 'Monsters', count: filteredMonsters.length },
  ]

  const otherMatchesFor = (value: string): OtherTabMatch[] =>
    searchQuery.trim() ? tabMatches.filter((tab) => tab.value !== value && tab.count > 0) : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8">
        {/*
          No hero. The app is used one-handed at a table, and the job of this
          screen is to answer a lookup in ten seconds — so the search box is
          the first thing under the site header, not 650px below it (DND-022).
          The h1 stays for document structure but not for the eye: the header
          in `layout.tsx` already names the app on every route.
        */}
        <h1 className="sr-only">D&D 5e reference</h1>

        <div className="mb-4 sm:max-w-md">
          <Label htmlFor="search" className="sr-only">
            Search D&D Content
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              type="search"
              placeholder="Search spells, classes, races, equipment, magic items, monsters"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
        </div>

        {/*
          The rules chapters, one tap from the reference home. A single
          44px-high row of link chips: it sits *below* the search field, so the
          ten-second lookup path is untouched and nothing moves at 320px.

          DND-053 shipped all eleven chapters, which is far too many for this
          row — so the index takes the first chip and the two chapters that get
          opened mid-turn keep their direct link.
        */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Rules:</span>
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

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/*
            Six categories, two rows of three on a phone (DND-045 extended
            DND-022's three-over-two). At 320px each cell is ~91px, which
            holds "Equipment" and "Magic Items" only as bare text — so the
            icons sit out until `md`, where a single row of six has room for
            them. Every trigger keeps the 44px minimum from `ui/tabs.tsx`,
            all six stay on screen, no horizontal swipe, nothing hidden.
          */}
          <TabsList className="grid w-full grid-cols-3 gap-1 mb-4 sm:mb-8 sm:grid-cols-6">
            <TabsTrigger value="spells" className="px-1 md:px-2">
              <Scroll className="hidden w-4 h-4 md:block" />
              Spells
            </TabsTrigger>
            <TabsTrigger value="classes" className="px-1 md:px-2">
              <Crown className="hidden w-4 h-4 md:block" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="races" className="px-1 md:px-2">
              <Users className="hidden w-4 h-4 md:block" />
              Races
            </TabsTrigger>
            <TabsTrigger value="equipment" className="px-1 md:px-2">
              <Sword className="hidden w-4 h-4 md:block" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="magic-items" className="px-1 md:px-2">
              <Sparkles className="hidden w-4 h-4 md:block" />
              Magic Items
            </TabsTrigger>
            <TabsTrigger value="monsters" className="px-1 md:px-2">
              <Skull className="hidden w-4 h-4 md:block" />
              Monsters
            </TabsTrigger>
          </TabsList>

          {/* Spells Tab */}
          <TabsContent value="spells" className="space-y-6">
            <ReferenceTabPanel
              title="Spells"
              pluralNoun="spells"
              icon={<Scroll className="w-5 h-5 text-blue-600" />}
              description="Magical incantations and abilities for spellcasters"
              badge="Spell"
              items={filteredSpells}
              totalCount={spells.length}
              isLoading={spellsLoading}
              error={spellsError}
              query={searchQuery}
              spinnerClassName="border-blue-600"
              onSelect={(item) => setSelection({ type: 'spell', ...item })}
              otherMatches={otherMatchesFor('spells')}
              onJumpToTab={setActiveTab}
            />
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <ReferenceTabPanel
              title="Classes"
              pluralNoun="classes"
              icon={<Crown className="w-5 h-5 text-purple-600" />}
              description="Character classes defining your character's abilities and role"
              badge="Class"
              items={filteredClasses}
              totalCount={classes.length}
              isLoading={classesLoading}
              error={classesError}
              query={searchQuery}
              spinnerClassName="border-purple-600"
              onSelect={(item) => setSelection({ type: 'class', ...item })}
              otherMatches={otherMatchesFor('classes')}
              onJumpToTab={setActiveTab}
            />
          </TabsContent>

          {/* Races Tab */}
          <TabsContent value="races" className="space-y-6">
            <ReferenceTabPanel
              title="Races"
              pluralNoun="races"
              icon={<Users className="w-5 h-5 text-green-600" />}
              description="Different races and cultures that shape your character"
              badge="Race"
              items={filteredRaces}
              totalCount={races.length}
              isLoading={racesLoading}
              error={racesError}
              query={searchQuery}
              spinnerClassName="border-green-600"
              onSelect={(item) => setSelection({ type: 'race', ...item })}
              otherMatches={otherMatchesFor('races')}
              onJumpToTab={setActiveTab}
            />
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6">
            <ReferenceTabPanel
              title="Equipment"
              pluralNoun="equipment items"
              icon={<Sword className="w-5 h-5 text-orange-600" />}
              description="Weapons, armor, and tools for your adventures"
              badge="Equipment"
              items={filteredEquipment}
              totalCount={equipment.length}
              isLoading={equipmentLoading}
              error={equipmentError}
              query={searchQuery}
              spinnerClassName="border-orange-600"
              onSelect={(item) => setSelection({ type: 'equipment', ...item })}
              otherMatches={otherMatchesFor('equipment')}
              onJumpToTab={setActiveTab}
            />
          </TabsContent>

          {/* Magic Items Tab */}
          <TabsContent value="magic-items" className="space-y-6">
            <ReferenceTabPanel
              title="Magic Items"
              pluralNoun="magic items"
              icon={<Sparkles className="w-5 h-5 text-amber-600" />}
              description="Enchanted items, from healing potions to legendary blades"
              badge="Magic Item"
              items={filteredMagicItems}
              totalCount={magicItems.length}
              isLoading={magicItemsLoading}
              error={magicItemsError}
              query={searchQuery}
              spinnerClassName="border-amber-600"
              onSelect={(item) => setSelection({ type: 'magic-item', ...item })}
              otherMatches={otherMatchesFor('magic-items')}
              onJumpToTab={setActiveTab}
            />
          </TabsContent>

          {/* Monsters Tab */}
          <TabsContent value="monsters" className="space-y-6">
            <ReferenceTabPanel
              title="Monsters"
              pluralNoun="monsters"
              icon={<Skull className="w-5 h-5 text-red-600" />}
              description="Creatures and enemies for your encounters"
              badge="Monster"
              items={filteredMonsters}
              totalCount={monsters.length}
              isLoading={monstersLoading}
              error={monstersError}
              query={searchQuery}
              spinnerClassName="border-red-600"
              onSelect={(item) => setSelection({ type: 'monster', ...item })}
              otherMatches={otherMatchesFor('monsters')}
              onJumpToTab={setActiveTab}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 text-center sm:mt-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by D&D 5e API • Built with Next.js, SWR, and shadcn/ui
          </p>
        </div>
      </main>

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
