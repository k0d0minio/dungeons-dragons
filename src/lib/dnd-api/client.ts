// D&D 5e API Integration
// Base URL for the D&D 5e API
export const DND_API_BASE_URL = 'https://www.dnd5eapi.co/api'

// API Response Types
export interface DndApiResponse {
  count: number
  results: Array<{
    index: string
    name: string
    url: string
  }>
}

export interface SpellDetail {
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
    damage_type: {
      index: string
      name: string
      url: string
    }
    damage_at_slot_level?: Record<string, string>
  }
  school: {
    index: string
    name: string
    url: string
  }
  classes: Array<{
    index: string
    name: string
    url: string
  }>
  subclasses?: Array<{
    index: string
    name: string
    url: string
  }>
}

export interface EquipmentDetail {
  index: string
  name: string
  equipment_category: {
    index: string
    name: string
    url: string
  }
  weapon_category?: string
  weapon_range?: string
  category_range?: string
  cost: {
    quantity: number
    unit: string
  }
  damage?: {
    damage_dice: string
    damage_type: {
      index: string
      name: string
      url: string
    }
  }
  range?: {
    normal: number
    long?: number
  }
  weight: number
  properties?: Array<{
    index: string
    name: string
    url: string
  }>
  armor_category?: string
  armor_class?: {
    base: number
    dex_bonus: boolean
    max_bonus?: number
  }
  stealth_disadvantage?: boolean
  contents?: Array<{
    item: {
      index: string
      name: string
      url: string
    }
    quantity: number
  }>
  properties?: Array<{
    index: string
    name: string
    url: string
  }>
}

// API Client Class
export class DndApiClient {
  private baseUrl: string
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map()
  private cacheTimeout = 24 * 60 * 60 * 1000 // 24 hours

  constructor(baseUrl: string = DND_API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async fetchWithCache<T>(url: string): Promise<T> {
    const cacheKey = url
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }

    try {
      const response = await fetch(`${this.baseUrl}${url}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
      
      return data
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error)
      throw error
    }
  }

  // Spell methods
  async getSpells(): Promise<DndApiResponse<SpellDetail>> {
    return this.fetchWithCache('/spells')
  }

  async getSpellByIndex(index: string): Promise<SpellDetail> {
    return this.fetchWithCache(`/spells/${index}`)
  }

  async getSpellsByClass(className: string): Promise<DndApiResponse<SpellDetail>> {
    return this.fetchWithCache(`/classes/${className}/spells`)
  }

  // Equipment methods
  async getEquipment(): Promise<DndApiResponse<EquipmentDetail>> {
    return this.fetchWithCache('/equipment')
  }

  async getEquipmentByIndex(index: string): Promise<EquipmentDetail> {
    return this.fetchWithCache(`/equipment/${index}`)
  }

  async getWeapons(): Promise<DndApiResponse<EquipmentDetail>> {
    return this.fetchWithCache('/equipment-categories/weapon')
  }

  async getArmor(): Promise<DndApiResponse<EquipmentDetail>> {
    return this.fetchWithCache('/equipment-categories/armor')
  }

  // Class methods
  async getClasses(): Promise<DndApiResponse> {
    return this.fetchWithCache('/classes')
  }

  async getClassByIndex(index: string): Promise<Record<string, unknown>> {
    return this.fetchWithCache(`/classes/${index}`)
  }

  // Race methods
  async getRaces(): Promise<DndApiResponse> {
    return this.fetchWithCache('/races')
  }

  async getRaceByIndex(index: string): Promise<Record<string, unknown>> {
    return this.fetchWithCache(`/races/${index}`)
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Create singleton instance
export const dndApiClient = new DndApiClient()

// Utility functions for offline support
export const createOfflineSpell = (spell: SpellDetail): SpellDetail & { offline: boolean; cachedAt: string } => ({
  ...spell,
  offline: true,
  cachedAt: new Date().toISOString()
})

export const createOfflineEquipment = (equipment: EquipmentDetail): EquipmentDetail & { offline: boolean; cachedAt: string } => ({
  ...equipment,
  offline: true,
  cachedAt: new Date().toISOString()
})

// Error handling utilities
export class DndApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public url?: string
  ) {
    super(message)
    this.name = 'DndApiError'
  }
}

export const handleDndApiError = (error: unknown): DndApiError => {
  if (error instanceof DndApiError) {
    return error
  }
  
  if (error instanceof Error) {
    return new DndApiError(error.message)
  }
  
  return new DndApiError('Unknown error occurred')
}
