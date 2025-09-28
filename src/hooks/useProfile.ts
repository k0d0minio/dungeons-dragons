import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Profile } from '@/lib/supabase/profile'

export function useProfile() {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/profile')
        
        if (response.ok) {
          const profileData = await response.json()
          setProfile(profileData)
        } else if (response.status === 404) {
          // Profile doesn't exist, create it
          const createResponse = await fetch('/api/profile', {
            method: 'POST',
          })
          
          if (createResponse.ok) {
            const newProfile = await createResponse.json()
            setProfile(newProfile)
          } else {
            throw new Error('Failed to create profile')
          }
        } else {
          throw new Error('Failed to fetch profile')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [isLoaded, user])

  const refreshProfile = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/profile', {
        method: 'POST',
      })
      
      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
      } else {
        throw new Error('Failed to refresh profile')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    loading,
    error,
    refreshProfile,
    isLoaded,
    user,
  }
}
