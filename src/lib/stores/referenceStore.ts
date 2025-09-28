import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string[]
  duration: string
  description: string
  higherLevel?: string
  classes: string[]
  ritual: boolean
  concentration: boolean
}

export interface Equipment {
  id: string
  name: string
  type: string
  cost: string
  weight: number
  description: string
  properties?: string[]
  damage?: {
    dice: string
    type: string
  }
  armorClass?: number
  stealthDisadvantage?: boolean
}

interface ReferenceStore {
  spells: Spell[]
  equipment: Equipment[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  
  // Actions
  loadSpells: () => Promise<void>
  loadEquipment: () => Promise<void>
  searchSpells: (query: string) => Spell[]
  searchEquipment: (query: string) => Equipment[]
  getSpellById: (id: string) => Spell | undefined
  getEquipmentById: (id: string) => Equipment | undefined
  clearError: () => void
}

export const useReferenceStore = create<ReferenceStore>()(
  devtools(
    persist(
      (set, get) => ({
        spells: [],
        equipment: [],
        isLoading: false,
        error: null,
        lastUpdated: null,

        loadSpells: async () => {
          set({ isLoading: true, error: null })
          try {
            // In a real app, this would fetch from D&D 5e API
            // For now, we'll use mock data
            const mockSpells: Spell[] = [
              {
                id: 'fireball',
                name: 'Fireball',
                level: 3,
                school: 'Evocation',
                castingTime: '1 action',
                range: '150 feet',
                components: ['V', 'S', 'M'],
                duration: 'Instantaneous',
                description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.',
                classes: ['Wizard', 'Sorcerer'],
                ritual: false,
                concentration: false,
              },
            ]
            
            set({ 
              spells: mockSpells,
              isLoading: false,
              lastUpdated: new Date()
            })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load spells',
              isLoading: false 
            })
          }
        },

        loadEquipment: async () => {
          set({ isLoading: true, error: null })
          try {
            // In a real app, this would fetch from D&D 5e API
            // For now, we'll use mock data
            const mockEquipment: Equipment[] = [
              {
                id: 'longsword',
                name: 'Longsword',
                type: 'Weapon',
                cost: '15 gp',
                weight: 3,
                description: 'A versatile melee weapon.',
                properties: ['Versatile'],
                damage: {
                  dice: '1d8',
                  type: 'slashing',
                },
              },
            ]
            
            set({ 
              equipment: mockEquipment,
              isLoading: false,
              lastUpdated: new Date()
            })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load equipment',
              isLoading: false 
            })
          }
        },

        searchSpells: (query) => {
          const { spells } = get()
          const lowercaseQuery = query.toLowerCase()
          return spells.filter(spell => 
            spell.name.toLowerCase().includes(lowercaseQuery) ||
            spell.description.toLowerCase().includes(lowercaseQuery) ||
            spell.school.toLowerCase().includes(lowercaseQuery)
          )
        },

        searchEquipment: (query) => {
          const { equipment } = get()
          const lowercaseQuery = query.toLowerCase()
          return equipment.filter(item => 
            item.name.toLowerCase().includes(lowercaseQuery) ||
            item.description.toLowerCase().includes(lowercaseQuery) ||
            item.type.toLowerCase().includes(lowercaseQuery)
          )
        },

        getSpellById: (id) => {
          const { spells } = get()
          return spells.find(spell => spell.id === id)
        },

        getEquipmentById: (id) => {
          const { equipment } = get()
          return equipment.find(item => item.id === id)
        },

        clearError: () => {
          set({ error: null })
        },
      }),
      {
        name: 'reference-store',
        partialize: (state) => ({ 
          spells: state.spells,
          equipment: state.equipment,
          lastUpdated: state.lastUpdated
        }),
      }
    ),
    {
      name: 'reference-store',
    }
  )
)
