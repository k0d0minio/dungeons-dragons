/**
 * Offline Hooks for D&D Companion PWA
 * Provides React hooks for offline functionality and sync management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  characterDB, 
  spellDB, 
  equipmentDB, 
  pendingActionsDB, 
  cacheDB, 
  syncManager
} from './database'

// Hook for online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true
    return navigator.onLine
  })

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync when coming back online
      syncManager.fullSync().catch(console.error)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Hook for offline characters management
export function useOfflineCharacters() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isOnline = useOnlineStatus()

  const loadCharacters = useCallback(async () => {
    try {
      setLoading(true)
      const offlineCharacters = await characterDB.getAll()
      setCharacters(offlineCharacters)
      setError(null)
    } catch (err) {
      setError(err)
      console.error('Failed to load offline characters:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveCharacter = useCallback(async (character) => {
    try {
      const characterToSave = {
        ...character,
        synced: isOnline,
        updatedAt: new Date()
      }

      await characterDB.save(characterToSave)
      
      if (!isOnline) {
        // Add to pending actions for sync when online
        await pendingActionsDB.add({
          type: 'update',
          table: 'characters',
          data: characterToSave,
          timestamp: new Date(),
          retries: 0
        })
      }

      // Reload characters to reflect changes
      await loadCharacters()
      
      return characterToSave
    } catch (err) {
      setError(err)
      console.error('Failed to save character:', err)
      throw err
    }
  }, [isOnline, loadCharacters])

  const deleteCharacter = useCallback(async (id) => {
    try {
      await characterDB.delete(id)
      
      if (!isOnline) {
        // Add to pending actions for sync when online
        await pendingActionsDB.add({
          type: 'delete',
          table: 'characters',
          data: { id },
          timestamp: new Date(),
          retries: 0
        })
      }

      // Reload characters to reflect changes
      await loadCharacters()
    } catch (err) {
      setError(err)
      console.error('Failed to delete character:', err)
      throw err
    }
  }, [isOnline, loadCharacters])

  const syncCharacters = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }

    try {
      await syncManager.syncCharacters()
      await loadCharacters()
    } catch (err) {
      setError(err)
      console.error('Failed to sync characters:', err)
      throw err
    }
  }, [isOnline, loadCharacters])

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  return {
    characters,
    loading,
    error,
    saveCharacter,
    deleteCharacter,
    syncCharacters,
    isOnline,
    hasUnsyncedChanges: characters.some(c => !c.synced)
  }
}

// Hook for offline spells management
export function useOfflineSpells() {
  const [spells, setSpells] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSpells = useCallback(async () => {
    try {
      setLoading(true)
      const offlineSpells = await spellDB.getAll()
      setSpells(offlineSpells)
      setError(null)
    } catch (err) {
      setError(err)
      console.error('Failed to load offline spells:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchSpells = useCallback(async (query) => {
    try {
      const results = await spellDB.search(query)
      return results
    } catch (err) {
      console.error('Failed to search spells:', err)
      return []
    }
  }, [])

  const getSpellsByLevel = useCallback(async (level) => {
    try {
      const results = await spellDB.getByLevel(level)
      return results
    } catch (err) {
      console.error('Failed to get spells by level:', err)
      return []
    }
  }, [])

  const getSpellsBySchool = useCallback(async (school) => {
    try {
      const results = await spellDB.getBySchool(school)
      return results
    } catch (err) {
      console.error('Failed to get spells by school:', err)
      return []
    }
  }, [])

  useEffect(() => {
    loadSpells()
  }, [loadSpells])

  return {
    spells,
    loading,
    error,
    searchSpells,
    getSpellsByLevel,
    getSpellsBySchool,
    reload: loadSpells
  }
}

// Hook for offline equipment management
export function useOfflineEquipment() {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadEquipment = useCallback(async () => {
    try {
      setLoading(true)
      const offlineEquipment = await equipmentDB.getAll()
      setEquipment(offlineEquipment)
      setError(null)
    } catch (err) {
      setError(err)
      console.error('Failed to load offline equipment:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const searchEquipment = useCallback(async (query) => {
    try {
      const results = await equipmentDB.search(query)
      return results
    } catch (err) {
      console.error('Failed to search equipment:', err)
      return []
    }
  }, [])

  const getEquipmentByType = useCallback(async (type) => {
    try {
      const results = await equipmentDB.getByType(type)
      return results
    } catch (err) {
      console.error('Failed to get equipment by type:', err)
      return []
    }
  }, [])

  useEffect(() => {
    loadEquipment()
  }, [loadEquipment])

  return {
    equipment,
    loading,
    error,
    searchEquipment,
    getEquipmentByType,
    reload: loadEquipment
  }
}

// Hook for sync management
export function useSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [syncError, setSyncError] = useState(null)
  const isOnline = useOnlineStatus()

  const syncAll = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }

    try {
      setIsSyncing(true)
      setSyncError(null)
      
      await syncManager.fullSync()
      setLastSyncTime(new Date())
    } catch (err) {
      setSyncError(err)
      console.error('Sync failed:', err)
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline])

  const syncCharacters = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }

    try {
      setIsSyncing(true)
      setSyncError(null)
      
      await syncManager.syncCharacters()
      setLastSyncTime(new Date())
    } catch (err) {
      setSyncError(err)
      console.error('Character sync failed:', err)
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline])

  const syncPendingActions = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline')
    }

    try {
      setIsSyncing(true)
      setSyncError(null)
      
      await syncManager.syncPendingActions()
      setLastSyncTime(new Date())
    } catch (err) {
      setSyncError(err)
      console.error('Pending actions sync failed:', err)
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline])

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    syncAll,
    syncCharacters,
    syncPendingActions,
    isOnline
  }
}

// Hook for cache management
export function useCacheManager() {
  const [cacheSize, setCacheSize] = useState(0)
  const [isCleaning, setIsCleaning] = useState(false)

  const getCacheSize = useCallback(async () => {
    try {
      // This would calculate actual cache size
      // For now, we'll simulate it
      const size = Math.floor(Math.random() * 10000000) // Random size in bytes
      setCacheSize(size)
      return size
    } catch (err) {
      console.error('Failed to get cache size:', err)
      return 0
    }
  }, [])

  const clearCache = useCallback(async () => {
    try {
      setIsCleaning(true)
      await cacheDB.clear()
      await getCacheSize()
    } catch (err) {
      console.error('Failed to clear cache:', err)
      throw err
    } finally {
      setIsCleaning(false)
    }
  }, [getCacheSize])

  const cleanupExpiredCache = useCallback(async () => {
    try {
      setIsCleaning(true)
      await cacheDB.cleanup()
      await getCacheSize()
    } catch (err) {
      console.error('Failed to cleanup expired cache:', err)
      throw err
    } finally {
      setIsCleaning(false)
    }
  }, [getCacheSize])

  useEffect(() => {
    getCacheSize()
  }, [getCacheSize])

  return {
    cacheSize,
    isCleaning,
    getCacheSize,
    clearCache,
    cleanupExpiredCache
  }
}

// Hook for pending actions
export function usePendingActions() {
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadPendingActions = useCallback(async () => {
    try {
      setLoading(true)
      const actions = await pendingActionsDB.getAll()
      setPendingActions(actions)
      setError(null)
    } catch (err) {
      setError(err)
      console.error('Failed to load pending actions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const retryAction = useCallback(async (actionId) => {
    try {
      await pendingActionsDB.incrementRetries(actionId)
      await loadPendingActions()
    } catch (err) {
      setError(err)
      console.error('Failed to retry action:', err)
      throw err
    }
  }, [loadPendingActions])

  const removeAction = useCallback(async (actionId) => {
    try {
      await pendingActionsDB.remove(actionId)
      await loadPendingActions()
    } catch (err) {
      setError(err)
      console.error('Failed to remove action:', err)
      throw err
    }
  }, [loadPendingActions])

  useEffect(() => {
    loadPendingActions()
  }, [loadPendingActions])

  return {
    pendingActions,
    loading,
    error,
    retryAction,
    removeAction,
    reload: loadPendingActions,
    hasPendingActions: pendingActions.length > 0
  }
}

// Hook for offline status with detailed information
export function useOfflineStatus() {
  const isOnline = useOnlineStatus()
  const [connectionType, setConnectionType] = useState('unknown')
  const [lastOnlineTime, setLastOnlineTime] = useState(null)
  const [offlineDuration, setOfflineDuration] = useState(0)
  const offlineStartTime = useRef(null)

  useEffect(() => {
    if (isOnline) {
      setLastOnlineTime(new Date())
      if (offlineStartTime.current) {
        const duration = Date.now() - offlineStartTime.current
        setOfflineDuration(duration)
        offlineStartTime.current = null
      }
    } else {
      if (!offlineStartTime.current) {
        offlineStartTime.current = Date.now()
      }
    }
  }, [isOnline])

  useEffect(() => {
    // Get connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
      setConnectionType(connection.effectiveType || 'unknown')
    }
  }, [])

  return {
    isOnline,
    connectionType,
    lastOnlineTime,
    offlineDuration,
    isOffline: !isOnline
  }
}

// Hook for automatic sync when online
export function useAutoSync() {
  const isOnline = useOnlineStatus()
  const { syncAll } = useSyncManager()
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)

  useEffect(() => {
    if (isOnline && autoSyncEnabled) {
      // Delay sync to allow page to load
      const timeoutId = setTimeout(() => {
        syncAll().catch(console.error)
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  }, [isOnline, autoSyncEnabled, syncAll])

  return {
    autoSyncEnabled,
    setAutoSyncEnabled
  }
}
