// Service worker (DND-048, D28): the smallest one that is honest.
//
// Its only job is the offline fallback page. Every request goes to the
// network; nothing else is ever cached or intercepted, so the app cannot
// serve stale sheets, fight the optimistic-concurrency guard, or hide a
// deploy. D2's "no offline" stands — this is installability, not offline.

const CACHE = 'dnd-offline-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  // Navigations only. Data requests fail loudly to the app's own error
  // handling, which knows how to roll back an optimistic tap.
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
    ),
  )
})
