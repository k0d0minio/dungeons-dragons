import { createClient, createClientWithJWT } from './client'
import { createAdminClient } from './admin'

export interface Profile {
  id: string
  clerk_user_id: string
  email?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function createProfile(clerkUser: {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
}) {
  const supabase = createAdminClient()
  
  const profileData = {
    clerk_user_id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    first_name: clerkUser.firstName || undefined,
    last_name: clerkUser.lastName || undefined,
    avatar_url: clerkUser.imageUrl || undefined,
    metadata: {
      clerk_created_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }

  return data
}

export async function getProfile(clerkUserId: string, jwtToken?: string): Promise<Profile | null> {
  // Use JWT client if token provided (for API routes), otherwise use regular client
  const supabase = jwtToken ? createClientWithJWT(jwtToken) : createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null
    }
    console.error('Error fetching profile:', error)
    throw error
  }

  return data
}

export async function updateProfile(clerkUserId: string, updates: Partial<Profile>, jwtToken?: string) {
  // Use JWT client if token provided (for API routes), otherwise use admin client
  const supabase = jwtToken ? createClientWithJWT(jwtToken) : createAdminClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('clerk_user_id', clerkUserId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }

  return data
}

export async function ensureProfile(clerkUser: {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
}, jwtToken?: string): Promise<Profile> {
  // Try to get existing profile
  let profile = await getProfile(clerkUser.id, jwtToken)
  
  if (!profile) {
    // Create new profile if it doesn't exist
    profile = await createProfile(clerkUser)
  } else {
    // Update existing profile with latest Clerk data
    profile = await updateProfile(clerkUser.id, {
      email: clerkUser.emailAddresses[0]?.emailAddress,
      first_name: clerkUser.firstName || undefined,
      last_name: clerkUser.lastName || undefined,
      avatar_url: clerkUser.imageUrl || undefined,
    }, jwtToken)
  }
  
  if (!profile) {
    throw new Error('Failed to create or update profile')
  }
  
  return profile
}
