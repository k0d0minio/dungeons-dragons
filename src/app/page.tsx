'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReferenceCard } from "@/components/reference/reference-card"
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
  searchSpells,
  searchEquipment,
  searchMonsters
} from '@/lib/dnd-api/swr-hooks'
import { 
  Sword,
  Users,
  Search,
  Scroll,
  Crown,
  Skull
} from 'lucide-react'

interface DndItem {
  index: string
  name: string
  [key: string]: unknown
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)

  // Fetch data using SWR hooks
  const { spells, isLoading: spellsLoading, error: spellsError } = useSpells()
  const { classes, isLoading: classesLoading, error: classesError } = useClasses()
  const { races, isLoading: racesLoading, error: racesError } = useRaces()
  const { equipment, isLoading: equipmentLoading, error: equipmentError } = useEquipment()
  const { monsters, isLoading: monstersLoading, error: monstersError } = useMonsters()

  // Search functionality
  const filteredSpells = searchQuery ? searchSpells(spells, searchQuery) : spells.slice(0, 6)
  const filteredEquipment = searchQuery ? searchEquipment(equipment, searchQuery) : equipment.slice(0, 6)
  const filteredMonsters = searchQuery ? searchMonsters(monsters, searchQuery) : monsters.slice(0, 6)

  // const isLoading = spellsLoading || classesLoading || racesLoading || equipmentLoading || monstersLoading

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
              placeholder="Search spells, equipment, monsters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10"
            />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="spells" className="w-full">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scroll className="w-5 h-5 text-blue-600" />
                  Spells ({spells.length})
                </CardTitle>
                <CardDescription>
                  Magical incantations and abilities for spellcasters
                </CardDescription>
              </CardHeader>
              <CardContent>
                {spellsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading spells...</p>
                  </div>
                ) : spellsError ? (
                  <div className="text-center py-8">
                    <Badge variant="destructive">Error loading spells</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSpells.map((spell: DndItem) => (
                      <ReferenceCard
                        key={spell.index}
                        name={spell.name}
                        badge="Spell"
                        onSelect={() =>
                          setSelection({ type: 'spell', index: spell.index, name: spell.name })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  Classes ({classes.length})
                </CardTitle>
                <CardDescription>
                  Character classes defining your character&apos;s abilities and role
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading classes...</p>
                  </div>
                ) : classesError ? (
                  <div className="text-center py-8">
                    <Badge variant="destructive">Error loading classes</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.slice(0, 12).map((cls: DndItem) => (
                      <ReferenceCard
                        key={cls.index}
                        name={cls.name}
                        badge="Class"
                        onSelect={() =>
                          setSelection({ type: 'class', index: cls.index, name: cls.name })
                        }
                      />
                    ))}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Races Tab */}
          <TabsContent value="races" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Races ({races.length})
                </CardTitle>
                <CardDescription>
                  Different species and cultures that shape your character
                </CardDescription>
              </CardHeader>
              <CardContent>
                {racesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading races...</p>
                </div>
                ) : racesError ? (
                  <div className="text-center py-8">
                    <Badge variant="destructive">Error loading races</Badge>
                </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {races.slice(0, 12).map((race: DndItem) => (
                      <ReferenceCard
                        key={race.index}
                        name={race.name}
                        badge="Race"
                        onSelect={() =>
                          setSelection({ type: 'race', index: race.index, name: race.name })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sword className="w-5 h-5 text-orange-600" />
                  Equipment ({equipment.length})
                </CardTitle>
                <CardDescription>
                  Weapons, armor, and tools for your adventures
                </CardDescription>
              </CardHeader>
              <CardContent>
                {equipmentLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading equipment...</p>
                  </div>
                ) : equipmentError ? (
                  <div className="text-center py-8">
                    <Badge variant="destructive">Error loading equipment</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEquipment?.filter((item: DndItem) => item && item.index).map((item: DndItem) => (
                      <ReferenceCard
                        key={item.index}
                        name={item.name || 'Unknown Item'}
                        badge="Equipment"
                        onSelect={() =>
                          setSelection({
                            type: 'equipment',
                            index: item.index,
                            name: item.name || 'Unknown Item',
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monsters Tab */}
          <TabsContent value="monsters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Skull className="w-5 h-5 text-red-600" />
                  Monsters ({monsters.length})
                </CardTitle>
                <CardDescription>
                  Creatures and enemies for your encounters
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monstersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading monsters...</p>
                  </div>
                ) : monstersError ? (
                  <div className="text-center py-8">
                    <Badge variant="destructive">Error loading monsters</Badge>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMonsters?.filter((monster: DndItem) => monster && monster.index).map((monster: DndItem) => (
                      <ReferenceCard
                        key={monster.index}
                        name={monster.name || 'Unknown Monster'}
                        badge="Monster"
                        onSelect={() =>
                          setSelection({
                            type: 'monster',
                            index: monster.index,
                            name: monster.name || 'Unknown Monster',
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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