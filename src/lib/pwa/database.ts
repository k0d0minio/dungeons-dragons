// PWA Utilities for offline-first functionality
import { openDB, DBSchema, IDBPDatabase } from 'idb'

// IndexedDB Schema
interface DndCompanionDB extends DBSchema {
  characters: {
    key: string
    value: Character
  }
  spells: {
    key: string
    value: Spell
  }
  equipment: {
    key: string
    value: Equipment
  }
  pendingActions: {
    key: string
    value: PendingAction
  }
  cache: {
    key: string
    value: CacheEntry
  }
}

interface Character {
  id: string
  name: string
  class: string
  level: number
  race: string
  stats: Record<string, number>
  hitPoints: Record<string, number>
  armorClass: number
  speed: number
  spells: string[]
  equipment: string[]
  createdAt: Date
  updatedAt: Date
  synced: boolean
}

interface Spell {
  id: string
  name: string
  level: number
  school: string
  castingTime: string
  range: string
  components: string[]
  duration: string
  description: string
  classes: string[]
  ritual: boolean
  concentration: boolean
  cachedAt: Date
}

interface Equipment {
  id: string
  name: string
  type: string
  cost: string
  weight: number
  description: string
  properties?: string[]
  cachedAt: Date
}

interface PendingAction {
  id: string
  type: 'create' | 'update' | 'delete'
  table: string
  data: Record<string, unknown>
  timestamp: Date
  retries: number
}

interface CacheEntry {
  key: string
  data: unknown
  timestamp: Date
  expiresAt: Date
}

// Database instance
let db: IDBPDatabase<DndCompanionDB> | null = null

// Initialize IndexedDB
export const initDB = async (): Promise<IDBPDatabase<DndCompanionDB>> => {
  if (db) return db

  db = await openDB<DndCompanionDB>('dnd-companion', 1, {
    upgrade(db) {
      // Characters store
      if (!db.objectStoreNames.contains('characters')) {
        const characterStore = db.createObjectStore('characters', { keyPath: 'id' })
        characterStore.createIndex('synced', 'synced')
        characterStore.createIndex('updatedAt', 'updatedAt')
      }

      // Spells store
      if (!db.objectStoreNames.contains('spells')) {
        const spellStore = db.createObjectStore('spells', { keyPath: 'id' })
        spellStore.createIndex('name', 'name')
        spellStore.createIndex('level', 'level')
        spellStore.createIndex('school', 'school')
      }

      // Equipment store
      if (!db.objectStoreNames.contains('equipment')) {
        const equipmentStore = db.createObjectStore('equipment', { keyPath: 'id' })
        equipmentStore.createIndex('name', 'name')
        equipmentStore.createIndex('type', 'type')
      }

      // Pending actions store
      if (!db.objectStoreNames.contains('pendingActions')) {
        const pendingStore = db.createObjectStore('pendingActions', { keyPath: 'id' })
        pendingStore.createIndex('timestamp', 'timestamp')
        pendingStore.createIndex('type', 'type')
      }

      // Cache store
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
        cacheStore.createIndex('expiresAt', 'expiresAt')
      }
    },
  })

  return db
}

// Character operations
export const characterDB = {
  async save(character: Character): Promise<void> {
    const database = await initDB()
    await database.put('characters', character)
  },

  async get(id: string): Promise<Character | undefined> {
    const database = await initDB()
    return database.get('characters', id)
  },

  async getAll(): Promise<Character[]> {
    const database = await initDB()
    return database.getAll('characters')
  },

  async getUnsynced(): Promise<Character[]> {
    const database = await initDB()
    return database.getAllFromIndex('characters', 'synced', false)
  },

  async delete(id: string): Promise<void> {
    const database = await initDB()
    await database.delete('characters', id)
  },

  async markSynced(id: string): Promise<void> {
    const database = await initDB()
    const character = await database.get('characters', id)
    if (character) {
      character.synced = true
      await database.put('characters', character)
    }
  }
}

// Spell operations
export const spellDB = {
  async save(spell: Spell): Promise<void> {
    const database = await initDB()
    await database.put('spells', spell)
  },

  async get(id: string): Promise<Spell | undefined> {
    const database = await initDB()
    return database.get('spells', id)
  },

  async getAll(): Promise<Spell[]> {
    const database = await initDB()
    return database.getAll('spells')
  },

  async search(query: string): Promise<Spell[]> {
    const database = await initDB()
    const spells = await database.getAll('spells')
    const lowercaseQuery = query.toLowerCase()
    
    return spells.filter(spell => 
      spell.name.toLowerCase().includes(lowercaseQuery) ||
      spell.description.toLowerCase().includes(lowercaseQuery) ||
      spell.school.toLowerCase().includes(lowercaseQuery)
    )
  },

  async getByLevel(level: number): Promise<Spell[]> {
    const database = await initDB()
    return database.getAllFromIndex('spells', 'level', level)
  },

  async getBySchool(school: string): Promise<Spell[]> {
    const database = await initDB()
    return database.getAllFromIndex('spells', 'school', school)
  }
}

// Equipment operations
export const equipmentDB = {
  async save(equipment: Equipment): Promise<void> {
    const database = await initDB()
    await database.put('equipment', equipment)
  },

  async get(id: string): Promise<Equipment | undefined> {
    const database = await initDB()
    return database.get('equipment', id)
  },

  async getAll(): Promise<Equipment[]> {
    const database = await initDB()
    return database.getAll('equipment')
  },

  async search(query: string): Promise<Equipment[]> {
    const database = await initDB()
    const equipment = await database.getAll('equipment')
    const lowercaseQuery = query.toLowerCase()
    
    return equipment.filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.description.toLowerCase().includes(lowercaseQuery) ||
      item.type.toLowerCase().includes(lowercaseQuery)
    )
  },

  async getByType(type: string): Promise<Equipment[]> {
    const database = await initDB()
    return database.getAllFromIndex('equipment', 'type', type)
  }
}

// Pending actions operations
export const pendingActionsDB = {
  async add(action: Omit<PendingAction, 'id'>): Promise<void> {
    const database = await initDB()
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    await database.put('pendingActions', { ...action, id })
  },

  async getAll(): Promise<PendingAction[]> {
    const database = await initDB()
    return database.getAll('pendingActions')
  },

  async remove(id: string): Promise<void> {
    const database = await initDB()
    await database.delete('pendingActions', id)
  },

  async incrementRetries(id: string): Promise<void> {
    const database = await initDB()
    const action = await database.get('pendingActions', id)
    if (action) {
      action.retries += 1
      await database.put('pendingActions', action)
    }
  }
}

// Cache operations
export const cacheDB = {
  async set(key: string, data: unknown, ttlMinutes: number = 60): Promise<void> {
    const database = await initDB()
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
    await database.put('cache', { key, data, timestamp: new Date(), expiresAt })
  },

  async get(key: string): Promise<unknown | undefined> {
    const database = await initDB()
    const entry = await database.get('cache', key)
    
    if (!entry) return undefined
    
    if (entry.expiresAt < new Date()) {
      await database.delete('cache', key)
      return undefined
    }
    
    return entry.data
  },

  async delete(key: string): Promise<void> {
    const database = await initDB()
    await database.delete('cache', key)
  },

  async clear(): Promise<void> {
    const database = await initDB()
    await database.clear('cache')
  },

  async cleanup(): Promise<void> {
    const database = await initDB()
    const expiredEntries = await database.getAllFromIndex('cache', 'expiresAt', IDBKeyRange.upperBound(new Date()))
    
    for (const entry of expiredEntries) {
      await database.delete('cache', entry.key)
    }
  }
}

// Sync utilities
export const syncManager = {
  async syncCharacters(): Promise<void> {
    const unsyncedCharacters = await characterDB.getUnsynced()
    
    for (const character of unsyncedCharacters) {
      try {
        // In a real app, this would sync with Supabase
        console.log('Syncing character:', character.id)
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100))
        
        await characterDB.markSynced(character.id)
      } catch (error) {
        console.error('Failed to sync character:', character.id, error)
        throw error
      }
    }
  },

  async syncPendingActions(): Promise<void> {
    const pendingActions = await pendingActionsDB.getAll()
    
    for (const action of pendingActions) {
      try {
        // In a real app, this would sync with Supabase
        console.log('Syncing action:', action.id)
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100))
        
        await pendingActionsDB.remove(action.id)
      } catch (error) {
        console.error('Failed to sync action:', action.id, error)
        
        // Increment retry count
        await pendingActionsDB.incrementRetries(action.id)
        
        // Remove if too many retries
        if (action.retries >= 3) {
          await pendingActionsDB.remove(action.id)
        }
      }
    }
  },

  async fullSync(): Promise<void> {
    await Promise.all([
      this.syncCharacters(),
      this.syncPendingActions(),
      cacheDB.cleanup()
    ])
  }
}

// Offline detection
export const offlineManager = {
  isOnline(): boolean {
    return navigator.onLine
  },

  async onOnline(callback: () => void): Promise<void> {
    window.addEventListener('online', callback)
  },

  async onOffline(callback: () => void): Promise<void> {
    window.addEventListener('offline', callback)
  },

  async waitForOnline(): Promise<void> {
    if (this.isOnline()) return
    
    return new Promise((resolve) => {
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline)
        resolve()
      }
      window.addEventListener('online', handleOnline)
    })
  }
}
