import '@testing-library/jest-dom'

// Polyfills for next-test-api-route-handler
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Suppress console.error during tests to reduce noise
console.error = () => {
  // Suppress all console.error during tests
  // This prevents API route error logs and React act warnings from cluttering test output
  return
}

// Mock Service Worker
const mockServiceWorker = {
  register: jest.fn(() => Promise.resolve({
    installing: null,
    waiting: null,
    active: { state: 'activated' },
    addEventListener: jest.fn(),
  })),
  getRegistration: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  controller: null,
}

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    result: {
      createObjectStore: jest.fn(),
      transaction: jest.fn(),
    },
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  })),
  deleteDatabase: jest.fn(),
}

// Mock Cache API
const mockCache = {
  open: jest.fn(() => Promise.resolve({
    put: jest.fn(),
    match: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn(() => Promise.resolve([])),
  })),
  keys: jest.fn(() => Promise.resolve([])),
  delete: jest.fn(() => Promise.resolve(true)),
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock Performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
  },
  writable: true,
})

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url'),
  writable: true,
})

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
})

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
  writable: true,
})

// Mock Geolocation API
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
})

// Mock Device Orientation API
Object.defineProperty(window, 'DeviceOrientationEvent', {
  value: jest.fn(),
  writable: true,
})

Object.defineProperty(window, 'DeviceMotionEvent', {
  value: jest.fn(),
  writable: true,
})

// Mock Web Share API
Object.defineProperty(navigator, 'share', {
  value: jest.fn(() => Promise.resolve()),
  writable: true,
})

// Mock Navigator
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
})

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
})

// Mock IndexedDB
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

// Mock Cache API
Object.defineProperty(window, 'caches', {
  value: mockCache,
  writable: true,
})

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  writable: true,
})

Object.defineProperty(Notification, 'permission', {
  value: 'default',
  writable: true,
})

Object.defineProperty(Notification, 'requestPermission', {
  value: jest.fn(() => Promise.resolve('granted')),
  writable: true,
})

// Mock Clerk authentication (client-side only)
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({ 
    user: { id: 'test-user-123', email: 'test@example.com' }, 
    isLoaded: true 
  }),
  SignedIn: ({ children }) => children,
  SignedOut: ({ children }) => children,
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-profile-123', email: 'test@example.com' }, 
            error: null 
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-profile-123', email: 'test@example.com' }, 
            error: null 
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ 
              data: { id: 'test-profile-123', email: 'test@example.com' }, 
              error: null 
            }))
          }))
        }))
      })),
    })),
  }),
}))

// Mock Supabase server functions
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-profile-123', email: 'test@example.com' }, 
            error: null 
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-profile-123', email: 'test@example.com' }, 
            error: null 
          }))
        }))
      })),
    })),
  })),
}))

// Mock Supabase admin functions
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: { id: 'test-profile-123', email: 'test@example.com' }, 
            error: null 
          }))
        }))
      })),
    })),
  })),
}))

// Mock Next.js server functions
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      statusText: init?.statusText || 'OK',
    })),
  },
}))

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ id: 'test-profile-123', email: 'test@example.com' }),
  })
)

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
})