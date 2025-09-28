'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { LinearClient } from '@linear/sdk'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error }: ErrorProps) {
  const [ticketCreated, setTicketCreated] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)
  const hasAttemptedCreation = useRef(false)

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'

  useEffect(() => {
    if (isDevelopment) {
      // In development, just log the error details to console
      console.error('🚨 Development Error:', {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString()
      })
    } else {
      // Only create ticket once per error instance and only in production
      if (!hasAttemptedCreation.current && !ticketCreated && !isCreatingTicket) {
        hasAttemptedCreation.current = true
        createLinearTicket()
      }
    }
  }, [isDevelopment, ticketCreated, isCreatingTicket, error.digest, error.message, error.stack, createLinearTicket])

  const createLinearTicket = useCallback(async () => {
    setIsCreatingTicket(true)
    
    try {
      // Initialize Linear client with API key from environment
      const linear = new LinearClient({
        apiKey: process.env.NEXT_PUBLIC_LINEAR_API_KEY
      })

      // Use digest for precise duplicate detection
      // Generate a unique digest for test errors if none exists
      const digest = error.digest || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Check for existing tickets with the same digest
      const existingTickets = await linear.issues({
        filter: {
          team: { id: { eq: process.env.NEXT_PUBLIC_LINEAR_TEAM_ID } },
          description: { contains: `Digest: ${digest}` }
        }
      })

      // If ticket with same digest exists, don't create duplicate
      if (existingTickets.nodes.length > 0) {
        console.log('Ticket with same digest already exists:', existingTickets.nodes[0].identifier)
        setTicketId(existingTickets.nodes[0].identifier)
        setTicketCreated(true)
        return
      }

      // Gather comprehensive error context
      const errorContext = {
        message: error.message,
        stack: error.stack,
        digest: digest,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer,
        performance: {
          navigationStart: performance.timing?.navigationStart,
          loadEventEnd: performance.timing?.loadEventEnd,
          domContentLoadedEventEnd: performance.timing?.domContentLoadedEventEnd
        }
      }

      // Create comprehensive error description
      const description = `
## 🚨 Error Details
**Message:** \`${error.message}\`
**Digest:** \`${digest}\`
**Timestamp:** ${errorContext.timestamp}

## 📍 Location & Context
**URL:** ${errorContext.url}
**Path:** ${errorContext.pathname}
**Search:** ${errorContext.search || 'None'}
**Hash:** ${errorContext.hash || 'None'}
**Referrer:** ${errorContext.referrer || 'Direct access'}

## 🖥️ Browser & Environment
**User Agent:** ${errorContext.userAgent}
**Language:** ${errorContext.language}
**Platform:** ${errorContext.platform}
**Timezone:** ${errorContext.timezone}
**Online:** ${errorContext.onLine ? 'Yes' : 'No'}
**Cookies:** ${errorContext.cookieEnabled ? 'Enabled' : 'Disabled'}

## 📱 Display & Performance
**Screen:** ${errorContext.screenResolution} @ ${errorContext.colorDepth}bit
**Navigation Start:** ${errorContext.performance.navigationStart ? new Date(errorContext.performance.navigationStart).toISOString() : 'N/A'}
**DOM Ready:** ${errorContext.performance.domContentLoadedEventEnd ? new Date(errorContext.performance.domContentLoadedEventEnd).toISOString() : 'N/A'}
**Page Load:** ${errorContext.performance.loadEventEnd ? new Date(errorContext.performance.loadEventEnd).toISOString() : 'N/A'}

## 🔍 Stack Trace
\`\`\`javascript
${error.stack || 'No stack trace available'}
\`\`\`

## 📊 Additional Context
- **Error Boundary:** Next.js App Router Error Boundary
- **Component:** ${error.name || 'Unknown Error Type'}
- **Auto-Reported:** Yes
- **Duplicate Check:** Based on digest \`${digest}\`

---
*This error was automatically captured and reported by the Next.js error boundary.*
      `

      // Create new ticket
      const ticket = await linear.createIssue({
        teamId: process.env.NEXT_PUBLIC_LINEAR_TEAM_ID,
        title: `🚨 ${error.name || 'Error'}: ${error.message}`,
        description: description,
        priority: 2 // High priority
      })

      // The Linear SDK returns the issue as a Promise, so we need to await it
      const issue = await ticket.issue
      
      if (issue) {
        // Try different properties for the identifier
        const ticketIdentifier = issue.identifier || issue.id || issue.number || 'Unknown'
        setTicketId(ticketIdentifier)
        setTicketCreated(true)
      } else {
        console.error('Failed to create ticket - no issue returned')
        setTicketCreated(true) // Mark as completed even if failed to prevent retries
      }
    } catch (ticketError) {
      console.error('Failed to create Linear ticket:', ticketError)
      setTicketCreated(true) // Mark as completed even if failed to prevent retries
    } finally {
      setIsCreatingTicket(false)
    }
  }, [error.digest, error.message, error.stack, error.name])

  // Show the same beautiful error page design in both environments
  // Only difference: Linear ticket creation happens only in production
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center px-4 overflow-hidden">
      <div className="text-center max-w-2xl mx-auto">
        {/* Error Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
          <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Oops! Something went wrong
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
          We&apos;ve encountered an unexpected error, but don&apos;t worry - our team has been automatically notified and is working to fix it.
        </p>

        {/* Single Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-gray-700 mb-6">
          {isDevelopment ? (
            // Development mode: Show error details instead of ticket creation
            <div className="text-center">
              <div className="flex items-center justify-center text-orange-600 dark:text-orange-400 mb-2">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Development Mode</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Error details logged to console (no ticket created)
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-left">
                <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                  {error.message}
                </p>
              </div>
            </div>
          ) : isCreatingTicket ? (
            <div className="flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Reporting error to our development team...</span>
            </div>
          ) : ticketId ? (
            <div className="text-center">
              <div className="flex items-center justify-center text-green-600 dark:text-green-400 mb-2">
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Error Successfully Reported</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Issue #{ticketId} has been created and assigned to our team.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Preparing to report this error...</span>
            </div>
          )}
        </div>

        {/* Single Action Button */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Go Back
        </button>
      </div>
    </div>
  )
}
