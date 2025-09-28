// D&D 5e API Library with SWR Integration
// This library mirrors the actual D&D 5e API structure to handle URL parameters efficiently

import useSWR from 'swr'

// Base configuration
export const DND_API_BASE_URL = '/api/dnd5e'

// Generic fetcher function for SWR
export const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// Base API response type
export interface ApiResponse {
  count: number
  results: Array<{
    index: string
    name: string
    url: string
  }>
}

// Reference type for nested URL parameters
export interface ApiReference {
  index: string
  name: string
  url: string
}

// ============================================================================
// SPELLS API
// ============================================================================

// List item types (what we get from /api/{category})
export interface SpellListItem {
  index: string
  name: string
  url: string
}

export interface ClassListItem {
  index: string
  name: string
  url: string
}

export interface RaceListItem {
  index: string
  name: string
  url: string
}

export interface EquipmentListItem {
  index: string
  name: string
  url: string
}

export interface MonsterListItem {
  index: string
  name: string
  url: string
}

// Full spell type (what we get from /api/spells/{index})
export interface Spell {
  index: string
  name: string
  desc: string[]
  higher_level?: string[]
  range: string
  components: string[]
  material?: string
  ritual: boolean
  duration: string
  concentration: boolean
  casting_time: string
  level: number
  attack_type?: string
  damage?: {
    damage_type: ApiReference
    damage_at_slot_level?: Record<string, string>
  }
  school: ApiReference
  classes: ApiReference[]
  subclasses?: ApiReference[]
}

// Spell API hooks
export const useSpells = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<SpellListItem>>(
    `${DND_API_BASE_URL}/spells`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  )

  return {
    spells: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useSpell = (index: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<Spell>(
    index ? `${DND_API_BASE_URL}/spells/${index}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes deduplication
    }
  )

  return {
    spell: data,
    isLoading,
    error,
    mutate
  }
}

// ============================================================================
// CLASSES API
// ============================================================================

export interface Class {
  index: string
  name: string
  hit_die: number
  proficiency_choices: Array<{
    choose: number
    type: string
    from: {
      option_set_type: string
      options: Array<{
        item: ApiReference
        option_type: string
      }>
    }
  }>
  proficiencies: ApiReference[]
  saving_throws: ApiReference[]
  starting_equipment: Array<{
    equipment: ApiReference
    quantity: number
  }>
  starting_equipment_options: Array<{
    choose: number
    type: string
    from: {
      option_set_type: string
      options: Array<{
        item: ApiReference
        option_type: string
      }>
    }
  }>
  class_levels: string
  multi_classing: {
    prerequisites?: Array<{
      ability_score: ApiReference
      minimum_score: number
    }>
    proficiencies_gained?: ApiReference[]
  }
  subclasses: ApiReference[]
  spellcasting?: {
    level: number
    spellcasting_ability: ApiReference
    info: Array<{
      name: string
      desc: string[]
    }>
  }
  spells?: string
  spellcasting_ability?: ApiReference
}

export const useClasses = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<ClassListItem>>(
    `${DND_API_BASE_URL}/classes`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    classes: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useClass = (index: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<Class>(
    index ? `${DND_API_BASE_URL}/classes/${index}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  )

  return {
    class: data,
    isLoading,
    error,
    mutate
  }
}

export const useClassSpells = (classIndex: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Spell>>(
    classIndex ? `${DND_API_BASE_URL}/classes/${classIndex}/spells` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  )

  return {
    spells: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

// ============================================================================
// RACES API
// ============================================================================

export interface Race {
  index: string
  name: string
  speed: number
  ability_bonuses: Array<{
    ability_score: ApiReference
    bonus: number
  }>
  alignment: string
  age: string
  size: string
  size_description: string
  starting_proficiencies: ApiReference[]
  starting_proficiency_options?: {
    choose: number
    type: string
    from: {
      option_set_type: string
      options: Array<{
        item: ApiReference
        option_type: string
      }>
    }
  }
  languages: ApiReference[]
  language_desc: string
  traits: ApiReference[]
  subraces: ApiReference[]
}

export const useRaces = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<RaceListItem>>(
    `${DND_API_BASE_URL}/races`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    races: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useRace = (index: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<Race>(
    index ? `${DND_API_BASE_URL}/races/${index}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  )

  return {
    race: data,
    isLoading,
    error,
    mutate
  }
}

// ============================================================================
// EQUIPMENT API
// ============================================================================

export interface Equipment {
  index: string
  name: string
  equipment_category: ApiReference
  weapon_category?: string
  weapon_range?: string
  category_range?: string
  cost: {
    quantity: number
    unit: string
  }
  damage?: {
    damage_dice: string
    damage_type: ApiReference
  }
  range?: {
    normal: number
    long?: number
  }
  weight: number
  properties?: ApiReference[]
  armor_category?: string
  armor_class?: {
    base: number
    dex_bonus: boolean
    max_bonus?: number
  }
  stealth_disadvantage?: boolean
  contents?: Array<{
    item: ApiReference
    quantity: number
  }>
  special?: string[]
  tool_category?: string
  vehicle_category?: string
  speed?: {
    quantity: number
    unit: string
  }
  capacity?: string
  quantity?: number
}

export const useEquipment = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<EquipmentListItem>>(
    `${DND_API_BASE_URL}/equipment`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    equipment: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useEquipmentItem = (index: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<Equipment>(
    index ? `${DND_API_BASE_URL}/equipment/${index}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  )

  return {
    equipment: data,
    isLoading,
    error,
    mutate
  }
}

export const useWeapons = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<EquipmentListItem>>(
    `${DND_API_BASE_URL}/equipment-categories/weapon`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    weapons: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useArmor = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<EquipmentListItem>>(
    `${DND_API_BASE_URL}/equipment-categories/armor`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    armor: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

// ============================================================================
// MONSTERS API
// ============================================================================

export interface Monster {
  index: string
  name: string
  size: string
  type: string
  subtype?: string
  alignment: string
  armor_class: Array<{
    type: string
    value: number
    condition?: string
  }>
  hit_points: number
  hit_dice: string
  hit_points_roll: string
  speed: {
    walk?: string
    fly?: string
    swim?: string
    burrow?: string
    climb?: string
  }
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  proficiencies: Array<{
    proficiency: ApiReference
    value: number
  }>
  damage_vulnerabilities: string[]
  damage_resistances: string[]
  damage_immunities: string[]
  condition_immunities: ApiReference[]
  senses: {
    blindsight?: string
    darkvision?: string
    passive_perception: number
    tremorsense?: string
    truesight?: string
  }
  languages: string
  challenge_rating: number
  xp: number
  special_abilities?: Array<{
    name: string
    desc: string
  }>
  actions?: Array<{
    name: string
    desc: string
    attack_bonus?: number
    damage?: Array<{
      damage_type: ApiReference
      damage_dice: string
    }>
  }>
  legendary_actions?: Array<{
    name: string
    desc: string
  }>
}

export const useMonsters = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<MonsterListItem>>(
    `${DND_API_BASE_URL}/monsters`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    monsters: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useMonster = (index: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<Monster>(
    index ? `${DND_API_BASE_URL}/monsters/${index}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  )

  return {
    monster: data,
    isLoading,
    error,
    mutate
  }
}

// ============================================================================
// FEATURES API
// ============================================================================

export interface Feature {
  index: string
  name: string
  desc: string[]
  level: number
  class: ApiReference
  subclass?: ApiReference
  prerequisites?: Array<{
    type: string
    level?: number
    feature?: ApiReference
    spell?: ApiReference
  }>
  feature_specific?: {
    subfeature_options?: {
      choose: number
      type: string
      from: {
        option_set_type: string
        options: Array<{
          item: ApiReference
          option_type: string
        }>
      }
    }
  }
}

export const useFeatures = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Feature>>(
    `${DND_API_BASE_URL}/features`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    features: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate
  }
}

export const useFeature = (index: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<Feature>(
    index ? `${DND_API_BASE_URL}/features/${index}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  )

  return {
    feature: data,
    isLoading,
    error,
    mutate
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Function to resolve URL references to actual data
export const resolveReference = async <T>(
  reference: ApiReference | null,
  fetcher: (url: string) => Promise<T>
): Promise<T | null> => {
  if (!reference?.url) return null
  
  try {
    return await fetcher(reference.url)
  } catch (error) {
    console.error(`Failed to resolve reference ${reference.url}:`, error)
    return null
  }
}

// Function to resolve multiple references
export const resolveReferences = async <T>(
  references: ApiReference[],
  fetcher: (url: string) => Promise<T>
): Promise<T[]> => {
  const promises = references.map(ref => resolveReference(ref, fetcher))
  const results = await Promise.allSettled(promises)
  
  return results
    .filter((result): result is PromiseFulfilledResult<T> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)
}

// Function to extract index from URL
export const extractIndexFromUrl = (url: string): string | null => {
  const match = url.match(/\/([^\/]+)$/)
  return match ? match[1] : null
}

// Function to build URL from index and endpoint
export const buildUrlFromIndex = (endpoint: string, index: string): string => {
  return `${DND_API_BASE_URL}/${endpoint}/${index}`
}

// ============================================================================
// SEARCH AND FILTER UTILITIES
// ============================================================================

export const searchSpells = (spells: SpellListItem[], query: string): SpellListItem[] => {
  const lowercaseQuery = query.toLowerCase()
  return spells.filter(spell => 
    spell?.name?.toLowerCase().includes(lowercaseQuery)
  )
}

export const searchEquipment = (equipment: EquipmentListItem[], query: string): EquipmentListItem[] => {
  const lowercaseQuery = query.toLowerCase()
  return equipment.filter(item => 
    item?.name?.toLowerCase().includes(lowercaseQuery)
  )
}

export const searchMonsters = (monsters: MonsterListItem[], query: string): MonsterListItem[] => {
  const lowercaseQuery = query.toLowerCase()
  return monsters.filter(monster => 
    monster?.name?.toLowerCase().includes(lowercaseQuery)
  )
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export const clearAllCache = () => {
  // This would need to be implemented with SWR's mutate function
  // For now, we rely on SWR's built-in cache management
  console.log('Cache clearing would be handled by SWR automatically')
}

// Export all hooks for easy importing
export const dndApiHooks = {
  // Spells
  useSpells,
  useSpell,
  
  // Classes
  useClasses,
  useClass,
  useClassSpells,
  
  // Races
  useRaces,
  useRace,
  
  // Equipment
  useEquipment,
  useEquipmentItem,
  useWeapons,
  useArmor,
  
  // Monsters
  useMonsters,
  useMonster,
  
  // Features
  useFeatures,
  useFeature,
}
