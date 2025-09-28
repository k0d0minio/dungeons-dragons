// Service Worker for PWA offline functionality
const CACHE_NAME = 'dnd-companion-v3' // Updated to force SW update
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html'
]

// Essential D&D content to cache aggressively
const API_CACHE_PATTERNS = [
  /\/api\/dnd5e\/(classes|races|spells|equipment)/,
  /\/api\/characters/,
  /\/api\/user\/profile/
]

// Cache strategies
// const CACHE_STRATEGIES = {
//   CACHE_FIRST: 'cache-first',
//   NETWORK_FIRST: 'network-first',
//   STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
// }

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log('Service worker installed')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Clean up any corrupted Clerk chunks from cache
      return cleanupClerkCache()
    }).then(() => {
      console.log('Service worker activated')
      return self.clients.claim()
    })
  )
})

// Clean up any corrupted Clerk chunks from cache
async function cleanupClerkCache() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const requests = await cache.keys()
    
    for (const request of requests) {
      const url = new URL(request.url)
      // Remove any cached Clerk-related requests
      if (url.hostname.includes('clerk.accounts.dev') || 
          url.hostname.includes('clerk.com') ||
          url.pathname.includes('clerk')) {
        console.log('Removing corrupted Clerk cache:', request.url)
        await cache.delete(request)
      }
    }
  } catch {
    console.log('Error cleaning up Clerk cache:', error)
  }
}

// Fetch event - implement comprehensive offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // CRITICAL: Skip external CDN requests to prevent chunk loading errors
  if (url.hostname.includes('clerk.accounts.dev') || 
      url.hostname.includes('clerk.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.pathname.includes('clerk') ||
      url.searchParams.has('clerk') ||
      url.searchParams.has('v=') && url.hostname !== location.hostname) {
    console.log('Skipping external CDN request:', request.url)
    return // Let browser handle external requests natively
  }

  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - use different strategies based on content type
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      // D&D reference content - cache first with background refresh
      event.respondWith(handleDndApiRequest(request))
    } else {
      // User data - network first with cache fallback
      event.respondWith(handleApiRequest(request))
    }
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(handleStaticRequest(request))
  } else {
    // Page requests - network first, cache fallback
    event.respondWith(handlePageRequest(request))
  }
})

// Handle D&D reference API requests with cache-first strategy
async function handleDndApiRequest(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    // Return cached version immediately
    console.log('Serving D&D API from cache:', request.url)
    
    // Update cache in background
    fetch(request)
      .then((freshResponse) => {
        if (freshResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, freshResponse.clone())
            console.log('Updated D&D API cache:', request.url)
          })
        }
      })
      .catch(() => {}) // Ignore fetch errors in background
    
    return cachedResponse
  }
  
  try {
    // No cache, try network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
      console.log('Cached new D&D API response:', request.url)
    }
    
    return networkResponse
  } catch {
    console.log('Network failed for D&D API:', request.url)
    
    // Return offline response for D&D reference data
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'D&D reference data not available offline',
        suggestion: 'Please connect to the internet to load reference data'
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch {
    console.log('Network failed, trying cache:', request.url)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This data is not available offline' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch {
    console.log('Failed to fetch static asset:', request.url)
    return new Response('Asset not available offline', { status: 404 })
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch {
    console.log('Network failed, trying cache:', request.url)
    
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    return caches.match('/offline.html')
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  } else if (event.tag === 'character-sync') {
    event.waitUntil(syncCharacters())
  } else if (event.tag === 'reference-sync') {
    event.waitUntil(syncReferenceData())
  }
})

async function doBackgroundSync() {
  try {
    console.log('Starting background sync...')
    
    // Sync characters and pending actions
    await Promise.all([
      syncCharacters(),
      syncPendingActions(),
      cleanupExpiredCache()
    ])
    
    console.log('Background sync completed')
  } catch {
    console.error('Background sync failed:', error)
  }
}

async function syncCharacters() {
  try {
    // This would interact with the IndexedDB to get unsynced characters
    // For now, we'll simulate the sync process
    console.log('Syncing characters...')
    
    // In a real implementation, this would:
    // 1. Get unsynced characters from IndexedDB
    // 2. Send them to the server
    // 3. Mark them as synced
    // 4. Handle any errors
    
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('Character sync completed')
  } catch {
    console.error('Character sync failed:', error)
  }
}

async function syncPendingActions() {
  try {
    console.log('Syncing pending actions...')
    
    // This would sync pending actions from IndexedDB
    // For now, we'll simulate the sync process
    
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('Pending actions sync completed')
  } catch {
    console.error('Pending actions sync failed:', error)
  }
}

async function syncReferenceData() {
  try {
    console.log('Syncing reference data...')
    
    // This would update D&D reference data in IndexedDB
    // For now, we'll simulate the sync process
    
    await new Promise(resolve => setTimeout(resolve, 100))
    console.log('Reference data sync completed')
  } catch {
    console.error('Reference data sync failed:', error)
  }
}

async function cleanupExpiredCache() {
  try {
    console.log('Cleaning up expired cache...')
    
    const cache = await caches.open(CACHE_NAME)
    const requests = await cache.keys()
    
    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const cacheDate = response.headers.get('date')
        if (cacheDate) {
          const age = Date.now() - new Date(cacheDate).getTime()
          // Remove cache entries older than 7 days
          if (age > 7 * 24 * 60 * 60 * 1000) {
            await cache.delete(request)
            console.log('Removed expired cache entry:', request.url)
          }
        }
      }
    }
    
    console.log('Cache cleanup completed')
  } catch {
    console.error('Cache cleanup failed:', error)
  }
}
