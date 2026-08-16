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

// Base API response type. Every list endpoint answers `{count, results}` with
// reference-shaped rows; `T` names the row type so call sites read as what
// they fetch.
export interface ApiResponse<T extends ApiReference = ApiReference> {
  count: number
  results: T[]
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
    },
  )

  return {
    spells: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    spell: data,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    classes: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    class: data,
    isLoading,
    error,
    mutate,
  }
}

/**
 * A row of `/classes/{index}/spells`. Unlike the other list endpoints this one
 * carries the spell's `level`, which is what lets the DND-008 picker group a
 * wizard's two hundred spells without fetching each one.
 */
export interface ClassSpellListItem {
  index: string
  name: string
  url: string
  level?: number
}

export interface ClassSpellsResponse {
  count: number
  results: ClassSpellListItem[]
}

export const useClassSpells = (classIndex: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<ClassSpellsResponse>(
    classIndex ? `${DND_API_BASE_URL}/classes/${classIndex}/spells` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    },
  )

  return {
    spells: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
  }
}

/**
 * One row of `/classes/{index}/levels` — what a class gets at that level.
 *
 * The level-up planner (DND-032) reads `features` from it, because the features
 * a level grants are the one thing about levelling up that the static tables in
 * `src/lib/characters/rules.ts` cannot give you. The numbers it also carries
 * (`prof_bonus`, `spellcasting`) are deliberately *not* used for the mechanics:
 * those stay derived locally, so a level-up works with the reference API down.
 *
 * Rows for a subclass carry a `subclass` reference; a character's class level
 * is the row without one.
 */
export interface ClassLevel {
  level: number
  ability_score_bonuses?: number
  prof_bonus?: number
  features: ApiReference[]
  class: ApiReference
  subclass?: ApiReference | null
  index: string
  spellcasting?: {
    cantrips_known?: number
    spells_known?: number
    [slotLevel: string]: number | undefined
  }
}

export const useClassLevels = (classIndex: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<ClassLevel[]>(
    classIndex ? `${DND_API_BASE_URL}/classes/${classIndex}/levels` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    },
  )

  return {
    // The endpoint answers an array; anything else is an upstream shape change
    // rather than a class with no levels, and an empty list renders as "no
    // features listed" instead of throwing under a level-up.
    levels: Array.isArray(data) ? data : [],
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    races: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    race: data,
    isLoading,
    error,
    mutate,
  }
}

// ============================================================================
// EQUIPMENT API
// ============================================================================

export interface Equipment {
  index: string
  name: string
  desc?: string[]
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
    },
  )

  return {
    equipment: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    equipment: data,
    isLoading,
    error,
    mutate,
  }
}

/**
 * The reference details of several equipment indexes at once, keyed by index —
 * what the sheet's attack rows and derived AC read for whatever is equipped
 * (DND-034, DND-035). One SWR entry per *set* of indexes rather than one hook
 * per item, because the set is dynamic (hooks cannot run in a loop) and the
 * two consumers need the same join at the same moment. An index whose fetch
 * fails is simply absent from the map, so one broken item costs its own row
 * and nothing else.
 */
export const useEquipmentDetails = (indexes: readonly string[]) => {
  const sorted = [...indexes].sort()
  const key = sorted.length > 0 ? `equipment-details:${sorted.join(',')}` : null

  const { data, error, isLoading, mutate } = useSWR<Record<string, Equipment>>(
    key,
    async () => {
      const settled = await Promise.allSettled(
        sorted.map((index) => fetcher(`${DND_API_BASE_URL}/equipment/${index}`)),
      )

      const details: Record<string, Equipment> = {}

      settled.forEach((result, position) => {
        if (result.status === 'fulfilled') details[sorted[position]] = result.value as Equipment
      })

      return details
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    },
  )

  return {
    details: data ?? {},
    isLoading,
    error,
    mutate,
  }
}

// useWeapons / useArmor hit /api/dnd5e/equipment-categories/*, which does not
// exist yet. They survived the DND-039 prune because DND-035 (equipped weapons
// and armour) builds that route and consumes them; if DND-035 is ever dropped,
// delete both hooks with it.
export const useWeapons = () => {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<EquipmentListItem>>(
    `${DND_API_BASE_URL}/equipment-categories/weapon`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  )

  return {
    weapons: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    armor: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    monsters: data?.results || [],
    count: data?.count || 0,
    isLoading,
    error,
    mutate,
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
    },
  )

  return {
    monster: data,
    isLoading,
    error,
    mutate,
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Function to resolve URL references to actual data
export const resolveReference = async <T>(
  reference: ApiReference | null,
  fetcher: (url: string) => Promise<T>,
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
  fetcher: (url: string) => Promise<T>,
): Promise<T[]> => {
  const promises = references.map((ref) => resolveReference(ref, fetcher))
  const results = await Promise.allSettled(promises)

  return results
    .filter(
      (result): result is PromiseFulfilledResult<Awaited<T>> =>
        result.status === 'fulfilled' && result.value !== null,
    )
    .map((result) => result.value as T)
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

/**
 * Case-insensitive substring match on `name`. Every list endpoint returns the
 * same `{ index, name, url }` row, so one predicate serves all five reference
 * tabs — including Classes and Races, which the browser used to leave
 * unfiltered (DND-021). An empty or whitespace-only query matches everything.
 */
export const searchByName = <T extends { name?: string }>(items: T[], query: string): T[] => {
  const lowercaseQuery = query.trim().toLowerCase()
  if (!lowercaseQuery) return items

  return items.filter((item) => item?.name?.toLowerCase().includes(lowercaseQuery))
}

export const searchSpells = (spells: SpellListItem[], query: string): SpellListItem[] =>
  searchByName(spells, query)

export const searchClasses = (classes: ClassListItem[], query: string): ClassListItem[] =>
  searchByName(classes, query)

export const searchRaces = (races: RaceListItem[], query: string): RaceListItem[] =>
  searchByName(races, query)

export const searchEquipment = (
  equipment: EquipmentListItem[],
  query: string,
): EquipmentListItem[] => searchByName(equipment, query)

export const searchMonsters = (monsters: MonsterListItem[], query: string): MonsterListItem[] =>
  searchByName(monsters, query)

// Export all hooks for easy importing
export const dndApiHooks = {
  // Spells
  useSpells,
  useSpell,

  // Classes
  useClasses,
  useClass,
  useClassLevels,
  useClassSpells,

  // Races
  useRaces,
  useRace,

  // Equipment
  useEquipment,
  useEquipmentItem,
  useEquipmentDetails,
  useWeapons,
  useArmor,

  // Monsters
  useMonsters,
  useMonster,
}
