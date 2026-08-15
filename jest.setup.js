import '@testing-library/jest-dom'

// Polyfills for next-test-api-route-handler
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Silence the two known noises, and nothing else (DND-025).
//
// This was `console.error = () => {}` — every error in the suite, gone. A React
// crash, a failed prop type, an unhandled rejection, all invisible, and a test
// could go green while the thing it rendered was on fire. What it was actually
// silencing was only ever two things: the app's own deliberate error paths
// (the reference-proxy tests exercise upstream failures on purpose), and
// React's act() warning. Both are matched below; anything else now reaches the
// terminal, which is the whole point of running the suite.
const passThroughToConsole = console.error

const EXPECTED_TEST_NOISE = [
  // `captureError` — keep in step with REPORTED_ERROR_PREFIX in
  // src/lib/observability/sentry.ts.
  '[error]',
  // "An update to X inside a test was not wrapped in act(...)"
  'was not wrapped in act',
]

console.error = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : ''

  if (EXPECTED_TEST_NOISE.some((noise) => message.includes(noise))) return

  passThroughToConsole(...args)
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

// Mock Neon Auth UI (client-side only)
jest.mock('@neondatabase/auth/react/ui', () => ({
  NeonAuthUIProvider: ({ children }) => children,
  SignedIn: ({ children }) => children,
  SignedOut: ({ children }) => children,
  UserButton: () => null,
  AuthView: () => null,
  AccountView: () => null,
}))

// Mock Sentry (DND-025). No test has a DSN, so every capture would be a no-op
// anyway — but the real SDK installs global error handlers in jsdom to reach
// that no-op, which is cost for nothing. Mocking it also means a test can
// assert that an error path reported, rather than only that it returned a 500.
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureRequestError: jest.fn(),
  withSentryConfig: jest.fn((config) => config),
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