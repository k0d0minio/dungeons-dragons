const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you based on your tsconfig.json paths)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.(js|jsx|ts|tsx)', '**/*.(test|spec).(js|jsx|ts|tsx)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    // Vendored shadcn/Radix wrappers — generated code we don't unit-test (DND-042).
    '!src/components/ui/**',
  ],
  // Thresholds set from the first green CI baseline (DND-042, run 31913562500:
  // statements 75.51, branches 75.24, functions 79.86, lines 76.23), rounded
  // down and given two points of headroom so a feature PR that adds server
  // pages does not have to game the number — the old 85/95/90/90 were
  // aspiration nothing enforced. Ratchet: when a PR meaningfully raises
  // coverage, raise these to just under the new measurement; never lower them
  // to make a PR pass.
  coverageThreshold: {
    global: {
      branches: 73,
      functions: 77,
      lines: 74,
      statements: 73,
    },
  },
  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks after each test
  restoreMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
