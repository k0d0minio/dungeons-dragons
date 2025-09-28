import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface Character {
  id: string
  name: string
  class: string
  level: number
  race: string
  stats: {
    strength: number
    dexterity: number
    constitution: number
    intelligence: number
    wisdom: number
    charisma: number
  }
  hitPoints: {
    current: number
    maximum: number
    temporary: number
  }
  armorClass: number
  speed: number
  spells: string[]
  equipment: string[]
  createdAt: Date
  updatedAt: Date
}

interface CharacterStore {
  characters: Character[]
  activeCharacter: Character | null
  isLoading: boolean
  error: string | null
  
  // Actions
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateCharacter: (id: string, updates: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  setActiveCharacter: (character: Character | null) => void
  loadCharacters: () => Promise<void>
  saveCharacters: () => Promise<void>
  clearError: () => void
}

export const useCharacterStore = create<CharacterStore>()(
  devtools(
    persist(
      (set) => ({
        characters: [],
        activeCharacter: null,
        isLoading: false,
        error: null,

        addCharacter: (characterData) => {
          const newCharacter: Character = {
            ...characterData,
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          set((state) => ({
            characters: [...state.characters, newCharacter],
            activeCharacter: newCharacter,
          }))
        },

        updateCharacter: (id, updates) => {
          set((state) => ({
            characters: state.characters.map((char) =>
              char.id === id
                ? { ...char, ...updates, updatedAt: new Date() }
                : char
            ),
            activeCharacter: state.activeCharacter?.id === id
              ? { ...state.activeCharacter, ...updates, updatedAt: new Date() }
              : state.activeCharacter,
          }))
        },

        deleteCharacter: (id) => {
          set((state) => ({
            characters: state.characters.filter((char) => char.id !== id),
            activeCharacter: state.activeCharacter?.id === id ? null : state.activeCharacter,
          }))
        },

        setActiveCharacter: (character) => {
          set({ activeCharacter: character })
        },

        loadCharacters: async () => {
          set({ isLoading: true, error: null })
          try {
            // In a real app, this would load from Supabase
            // For now, we'll use localStorage via persist middleware
            set({ isLoading: false })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to load characters',
              isLoading: false 
            })
          }
        },

        saveCharacters: async () => {
          set({ isLoading: true, error: null })
          try {
            // In a real app, this would save to Supabase
            // For now, we'll rely on persist middleware
            set({ isLoading: false })
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to save characters',
              isLoading: false 
            })
          }
        },

        clearError: () => {
          set({ error: null })
        },
      }),
      {
        name: 'character-store',
        partialize: (state) => ({ 
          characters: state.characters,
          activeCharacter: state.activeCharacter 
        }),
      }
    ),
    {
      name: 'character-store',
    }
  )
)
