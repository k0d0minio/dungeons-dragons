'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ReferenceTabPanel,
  type OtherTabMatch,
} from "@/components/reference/reference-tab-panel"
import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from "@/components/reference/reference-detail-sheet"
import {
  useSpells,
  useClasses,
  useRaces,
  useEquipment,
  useMonsters,
  searchByName
} from '@/lib/dnd-api/swr-hooks'
import {
  Sword,
  Users,
  Search,
  Scroll,
  Crown,
  Skull
} from 'lucide-react'

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

  // Search runs over every tab, not just the three it used to reach.
  const filteredSpells = searchByName(spells, searchQuery)
  const filteredClasses = searchByName(classes, searchQuery)
  const filteredRaces = searchByName(races, searchQuery)
  const filteredEquipment = searchByName(equipment, searchQuery)
  const filteredMonsters = searchByName(monsters, searchQuery)

  // A query that misses the open tab often hits another one. Rather than
  // leaving the player to try all five, a dead end names the tabs that matched.
  const tabMatches = [
    { value: 'spells', label: 'Spells', count: filteredSpells.length },
    { value: 'classes', label: 'Classes', count: filteredClasses.length },
    { value: 'races', label: 'Races', count: filteredRaces.length },
    { value: 'equipment', label: 'Equipment', count: filteredEquipment.length },
    { value: 'monsters', label: 'Monsters', count: filteredMonsters.length },
  ]

  const otherMatchesFor = (value: string): OtherTabMatch[] =>
    searchQuery.trim()
      ? tabMatches.filter(tab => tab.value !== value && tab.count > 0)
      : []

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
          <Label htmlFor="search" className="sr-only">Search D&D Content</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              type="search"
              placeholder="Search spells, classes, races, equipment, monsters"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/*
            Five categories, two rows on a phone. A single row at 320px gives
            each tab ~56px, and "Equipment" needs about 105px — it clipped.
            Six columns divide cleanly into three-over-two, and the order the
            page already had puts the three short labels on the narrower top
            row and the two long ones on the wider bottom row, so every label
            stays whole. All five stay on screen and reachable with a thumb:
            no horizontal swipe, and nothing hidden behind one. One row again
            from `sm`, where there is room for it.
          */}
          <TabsList className="grid w-full grid-cols-6 gap-1 mb-4 sm:mb-8 sm:grid-cols-5">
            <TabsTrigger value="spells" className="col-span-2 px-1 sm:col-span-1 sm:px-2">
              <Scroll className="w-4 h-4" />
              Spells
            </TabsTrigger>
            <TabsTrigger value="classes" className="col-span-2 px-1 sm:col-span-1 sm:px-2">
              <Crown className="w-4 h-4" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="races" className="col-span-2 px-1 sm:col-span-1 sm:px-2">
              <Users className="w-4 h-4" />
              Races
            </TabsTrigger>
            <TabsTrigger value="equipment" className="col-span-3 px-1 sm:col-span-1 sm:px-2">
              <Sword className="w-4 h-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="monsters" className="col-span-3 px-1 sm:col-span-1 sm:px-2">
              <Skull className="w-4 h-4" />
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
              description="Different species and cultures that shape your character"
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
            Powered by D&D 5e API • Built with Next.js 15, SWR, and shadcn/ui
          </p>
        </div>
      </main>

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
