'use client'

import { useEffect } from 'react'

/**
 * Registers the offline-fallback service worker (DND-048, D28). Production
 * only: a service worker between the dev server and the browser makes hot
 * reload lie. Renders nothing; failures are silent because the app without a
 * service worker is exactly the app everyone used yesterday.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // See above — nothing to say to a player about this.
    })
  }, [])

  return null
}
