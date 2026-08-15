'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
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
  Dice1,
  Scroll,
  Crown,
  Skull
} from 'lucide-react'

/**
 * A stat card cannot honestly show `0` while its fetch is still in flight, and
 * an errored fetch has no number at all — both read as an em dash (DND-021).
 */
function statValue(isLoading: boolean, error: unknown, items: unknown[]) {
  return isLoading || error ? '—' : items.length
}

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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
              <Dice1 className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Dungeons & Dragons
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Your comprehensive D&D 5e companion. Explore spells, classes, races, equipment, and monsters
            with detailed information and powerful search capabilities.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto">
            <Label htmlFor="search" className="sr-only">Search D&D Content</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="search"
                type="search"
                placeholder="Search spells, classes, races, equipment, monsters"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <Card className="text-center">
            <CardContent className="p-4">
              <Scroll className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statValue(spellsLoading, spellsError, spells)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Spells</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Crown className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statValue(classesLoading, classesError, classes)}
                </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Classes</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statValue(racesLoading, racesError, races)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Races</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Sword className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statValue(equipmentLoading, equipmentError, equipment)}
                </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Equipment</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Skull className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statValue(monstersLoading, monstersError, monsters)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Monsters</div>
            </CardContent>
          </Card>
          </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="spells" className="flex items-center gap-2">
              <Scroll className="w-4 h-4" />
              Spells
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="races" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Races
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Sword className="w-4 h-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="monsters" className="flex items-center gap-2">
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
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by D&D 5e API • Built with Next.js 15, SWR, and shadcn/ui
          </p>
        </div>
      </main>

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
