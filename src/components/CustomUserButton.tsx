'use client'

import React, { useState, useEffect } from 'react'
import { UserButton as ClerkUserButton } from '@clerk/nextjs'

interface CustomUserButtonProps {
  afterSignOutUrl?: string
  appearance?: Record<string, unknown>
}

export function CustomUserButton({ afterSignOutUrl = '/', appearance }: CustomUserButtonProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Check if Clerk is loaded
    const checkClerkLoaded = () => {
      if (typeof window !== 'undefined' && window.Clerk) {
        setIsLoaded(true)
        setHasError(false)
      } else {
        // Retry up to 3 times
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            checkClerkLoaded()
          }, 1000 * (retryCount + 1)) // Exponential backoff
        } else {
          setHasError(true)
        }
      }
    }

    checkClerkLoaded()
  }, [retryCount])

  // Show loading state
  if (!isLoaded && !hasError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    )
  }

  // Show error state with retry
  if (hasError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm text-red-800">Auth Error</span>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // Render the actual UserButton
  return (
    <ClerkUserButton 
      afterSignOutUrl={afterSignOutUrl}
      appearance={appearance}
    />
  )
}
