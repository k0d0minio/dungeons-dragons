'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Dice1,
  Scroll,
  Crown,
  Skull
} from 'lucide-react'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

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
                placeholder="Search spells, equipment, monsters..." 
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
                {spells.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Spells</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Crown className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {classes.length}
                </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Classes</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {races.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Races</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Sword className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {equipment.length}
                </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Equipment</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Skull className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {monsters.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Monsters</div>
            </CardContent>
          </Card>
          </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="spells" className="w-full">
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
                    {filteredSpells.map((spell) => (
                      <Card key={spell.index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {spell.name}
                            </h3>
                            <Badge variant="outline">
                              Spell
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Click to view details
                            </p>
                          </div>
                        </CardContent>
                      </Card>
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
                    {classes.slice(0, 12).map((cls) => (
                      <Card key={cls.index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {cls.name}
                            </h3>
                            <Badge variant="outline">
                              Class
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Click to view details
                            </p>
                          </div>
                        </CardContent>
                      </Card>
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
                    {races.slice(0, 12).map((race) => (
                      <Card key={race.index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {race.name}
                            </h3>
                            <Badge variant="outline">
                              Race
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Click to view details
                            </p>
                          </div>
                        </CardContent>
                      </Card>
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
                    {filteredEquipment?.filter(item => item && item.index).map((item) => (
                      <Card key={item.index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {item?.name || 'Unknown Item'}
                            </h3>
                            <Badge variant="outline">
                              Equipment
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Click to view details
                            </p>
                          </div>
                        </CardContent>
                      </Card>
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
                    {filteredMonsters?.filter(monster => monster && monster.index).map((monster) => (
                      <Card key={monster.index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {monster?.name || 'Unknown Monster'}
            </h3>
                            <Badge variant="outline">
                              Monster
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Click to view details
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by D&D 5e API • Built with Next.js 15, SWR, and shadcn/ui
          </p>
        </div>
      </main>
    </div>
  )
}