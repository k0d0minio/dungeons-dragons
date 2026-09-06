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
  // Agent worktrees under .claude/ carry a full checkout of their own; running
  // their copies here double-counts every suite against two React instances.
  testPathIgnorePatterns: ['/node_modules/', '/\\.claude/'],
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
  //
  // Ratcheted by `srd-2024-migration/long-tail-reference-data`, which retired
  // the `/api/dnd5e/*` proxy and its eleven thinly-covered route handlers and
  // replaced them with two well-covered ones (measured: statements 85.31,
  // branches 83.61, functions 87.99, lines 87.94).
  //
  // Ratcheted again by `dm-prep-suite/locations-handouts`, which added two prep
  // entities, an image store and a CSP module, all covered (measured:
  // statements 87.43, branches 83.71, functions 90.26, lines 89.81). Branches
  // stays at 81 — it moved by a tenth of a point, which is noise, not a gain to
  // lock in.
  //
  // Branches ratcheted to 83 by `dm-run-suite/dm-rules-crib` (measured:
  // statements 87.96, branches 84.94, functions 91.19, lines 90.58): that one
  // moved by a point and a quarter, which is a gain worth holding. The other
  // three moved by well under a point and stay where they are.
  //
  // Functions ratcheted to 89 by `dm-prep-suite/campaign-feature-gates`, which
  // arrived at the same branch reading independently and landed after it. Only
  // functions had moved by more than a point since, and it keeps the same two
  // points of headroom below the measurement the others carry.
  //
  // All four ratcheted by `first-table/*` (2026-09-05), seventeen stubs in one
  // PR, every new page, route, card and rules module shipped with a test
  // (measured: statements 90.10, branches 86.70, functions 92.75, lines 93.05,
  // up from 88.10 / 85.36 / 91.26 / 90.86 on main). Every metric moved by more
  // than a point; each keeps its two points of headroom.
  coverageThreshold: {
    global: {
      branches: 84,
      functions: 90,
      lines: 91,
      statements: 88,
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
