'use client'

import { useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export function useSupabase() {
  const client = useMemo(() => getSupabaseClient(), [])
  return client
}

