import { useState, useCallback, useEffect } from 'react'
import { dndApiClient, SpellDetail, EquipmentDetail, handleDndApiError } from './client'

// Custom hook for spells
export const useSpells = () => {
  const [spells, setSpells] = useState<SpellDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSpells = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await dndApiClient.getSpells()
      const spellDetails = await Promise.all(
        response.results.map(result => dndApiClient.getSpellByIndex(result.index))
      )
      setSpells(spellDetails)
    } catch (err) {
      const apiError = handleDndApiError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getSpellById = useCallback((id: string) => {
    return spells.find(spell => spell.index === id)
  }, [spells])

  const searchSpells = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase()
    return spells.filter(spell => 
      spell.name.toLowerCase().includes(lowercaseQuery) ||
      spell.desc.some(desc => desc.toLowerCase().includes(lowercaseQuery)) ||
      spell.school.name.toLowerCase().includes(lowercaseQuery)
    )
  }, [spells])

  return {
    spells,
    loading,
    error,
    loadSpells,
    getSpellById,
    searchSpells
  }
}

// Custom hook for equipment
export const useEquipment = () => {
  const [equipment, setEquipment] = useState<EquipmentDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEquipment = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await dndApiClient.getEquipment()
      const equipmentDetails = await Promise.all(
        response.results.map(result => dndApiClient.getEquipmentByIndex(result.index))
      )
      setEquipment(equipmentDetails)
    } catch (err) {
      const apiError = handleDndApiError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getEquipmentById = useCallback((id: string) => {
    return equipment.find(item => item.index === id)
  }, [equipment])

  const searchEquipment = useCallback((query: string) => {
    const lowercaseQuery = query.toLowerCase()
    return equipment.filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.equipment_category.name.toLowerCase().includes(lowercaseQuery)
    )
  }, [equipment])

  return {
    equipment,
    loading,
    error,
    loadEquipment,
    getEquipmentById,
    searchEquipment
  }
}

// Custom hook for classes
export const useClasses = () => {
  const [classes, setClasses] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await dndApiClient.getClasses()
      const classDetails = await Promise.all(
        response.results.map(result => dndApiClient.getClassByIndex(result.index))
      )
      setClasses(classDetails)
    } catch (err) {
      const apiError = handleDndApiError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getClassById = useCallback((id: string) => {
    return classes.find(cls => cls.index === id)
  }, [classes])

  return {
    classes,
    loading,
    error,
    loadClasses,
    getClassById
  }
}

// Custom hook for races
export const useRaces = () => {
  const [races, setRaces] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await dndApiClient.getRaces()
      const raceDetails = await Promise.all(
        response.results.map(result => dndApiClient.getRaceByIndex(result.index))
      )
      setRaces(raceDetails)
    } catch (err) {
      const apiError = handleDndApiError(err)
      setError(apiError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getRaceById = useCallback((id: string) => {
    return races.find(race => race.index === id)
  }, [races])

  return {
    races,
    loading,
    error,
    loadRaces,
    getRaceById
  }
}

// Utility hook for offline detection
export const useOfflineDetection = () => {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    // Set initial state
    setIsOffline(!navigator.onLine)

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOffline
}
