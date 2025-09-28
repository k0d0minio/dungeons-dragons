/**
 * Tests for Offline Hooks and Functionality
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { 
  useOnlineStatus, 
  useOfflineCharacters,
  useSyncManager
} from './offline-hooks'

// Mock the database module
jest.mock('./database', () => ({
  characterDB: {
    getAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    getUnsynced: jest.fn(),
    markSynced: jest.fn()
  },
  spellDB: {
    getAll: jest.fn(),
    search: jest.fn(),
    getByLevel: jest.fn(),
    getBySchool: jest.fn()
  },
  equipmentDB: {
    getAll: jest.fn(),
    search: jest.fn(),
    getByType: jest.fn()
  },
  pendingActionsDB: {
    getAll: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    incrementRetries: jest.fn()
  },
  cacheDB: {
    clear: jest.fn(),
    cleanup: jest.fn()
  },
  syncManager: {
    fullSync: jest.fn().mockResolvedValue(undefined),
    syncCharacters: jest.fn().mockResolvedValue(undefined),
    syncPendingActions: jest.fn().mockResolvedValue(undefined)
  },
  offlineManager: {
    isOnline: jest.fn(() => true)
  }
}))

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
})

describe('useOnlineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return online status', () => {
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it('should update when online status changes', async () => {
    const { result } = renderHook(() => useOnlineStatus())
    
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    
    await waitFor(() => {
      expect(result.current).toBe(false)
    })
    
    // Simulate coming back online
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    
    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })
})

describe('useOfflineCharacters', () => {
  const mockCharacters = [
    { id: '1', name: 'Test Character', synced: true },
    { id: '2', name: 'Unsynced Character', synced: false }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    const { characterDB, pendingActionsDB } = jest.mocked(require('./database'))
    characterDB.getAll.mockResolvedValue(mockCharacters)
    characterDB.save.mockResolvedValue(undefined)
    characterDB.delete.mockResolvedValue(undefined)
    pendingActionsDB.add.mockResolvedValue(undefined)
  })

  it('should load characters on mount', async () => {
    const { result } = renderHook(() => useOfflineCharacters())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.characters).toEqual(mockCharacters)
    expect(result.current.hasUnsyncedChanges).toBe(true)
  })

  it('should save character when online', async () => {
    const { result } = renderHook(() => useOfflineCharacters())
    const newCharacter = { id: '3', name: 'New Character' }
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    await act(async () => {
      await result.current.saveCharacter(newCharacter)
    })
    
    const { characterDB } = jest.mocked(require('./database'))
    expect(characterDB.save).toHaveBeenCalledWith({
      ...newCharacter,
      synced: true,
      updatedAt: expect.any(Date)
    })
  })

  it('should save character offline and add to pending actions', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    const { result } = renderHook(() => useOfflineCharacters())
    const newCharacter = { id: '3', name: 'New Character' }
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    await act(async () => {
      await result.current.saveCharacter(newCharacter)
    })
    
    const { characterDB, pendingActionsDB } = jest.mocked(require('./database'))
    expect(characterDB.save).toHaveBeenCalledWith({
      ...newCharacter,
      synced: false,
      updatedAt: expect.any(Date)
    })
    expect(pendingActionsDB.add).toHaveBeenCalled()
  })

  it('should delete character', async () => {
    const { result } = renderHook(() => useOfflineCharacters())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    await act(async () => {
      await result.current.deleteCharacter('1')
    })
    
    const { characterDB } = jest.mocked(require('./database'))
    expect(characterDB.delete).toHaveBeenCalledWith('1')
  })

  it('should sync characters when online', async () => {
    // Ensure we're online for this test
    Object.defineProperty(navigator, 'onLine', { value: true })
    
    const { result } = renderHook(() => useOfflineCharacters())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    await act(async () => {
      await result.current.syncCharacters()
    })
    
    const { syncManager } = jest.mocked(require('./database'))
    expect(syncManager.syncCharacters).toHaveBeenCalled()
  })
})

describe('useSyncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Ensure we're online for sync tests
    Object.defineProperty(navigator, 'onLine', { value: true })
    const { syncManager } = jest.mocked(require('./database'))
    syncManager.fullSync.mockResolvedValue(undefined)
    syncManager.syncCharacters.mockResolvedValue(undefined)
    syncManager.syncPendingActions.mockResolvedValue(undefined)
  })

  it('should sync all data', async () => {
    const { result } = renderHook(() => useSyncManager())
    
    await act(async () => {
      await result.current.syncAll()
    })
    
    const { syncManager } = jest.mocked(require('./database'))
    expect(syncManager.fullSync).toHaveBeenCalled()
    expect(result.current.lastSyncTime).toBeInstanceOf(Date)
  })

  it('should handle sync errors', async () => {
    const { syncManager } = jest.mocked(require('./database'))
    syncManager.fullSync.mockRejectedValue(new Error('Sync failed'))
    
    const { result } = renderHook(() => useSyncManager())
    
    await act(async () => {
      try {
        await result.current.syncAll()
      } catch {
        // Expected error
      }
    })
    
    expect(result.current.syncError).toBeInstanceOf(Error)
    expect(result.current.isSyncing).toBe(false)
  })
})
