// `getDb` memoises, so each case re-imports the module to get a clean slate.
const CONNECTION_STRING = 'postgresql://user:pw@ep-example.eu-central-1.aws.neon.tech/neondb'

function loadClient(): typeof import('./client') {
  let loaded: typeof import('./client') | undefined
  jest.isolateModules(() => {
    loaded = require('./client')
  })
  if (!loaded) throw new Error('./client did not load')
  return loaded
}

describe('isDatabaseConfigured', () => {
  it('is false without DATABASE_URL', () => {
    delete process.env.DATABASE_URL
    const { isDatabaseConfigured } = loadClient()

    expect(isDatabaseConfigured()).toBe(false)
  })

  it('is true once DATABASE_URL lands', () => {
    process.env.DATABASE_URL = CONNECTION_STRING
    const { isDatabaseConfigured } = loadClient()

    expect(isDatabaseConfigured()).toBe(true)
  })
})

describe('getDb', () => {
  afterEach(() => {
    delete process.env.DATABASE_URL
  })

  it('throws a pointed error when the database is not provisioned yet', () => {
    delete process.env.DATABASE_URL
    const { getDb } = loadClient()

    expect(() => getDb()).toThrow(/DATABASE_URL is not set/)
  })

  it('builds the client lazily, so importing the module is free', () => {
    delete process.env.DATABASE_URL

    // No throw on import: the app has to build and serve the public reference
    // browser before Neon is provisioned.
    expect(() => loadClient()).not.toThrow()
  })

  it('reuses one connection across calls', () => {
    process.env.DATABASE_URL = CONNECTION_STRING
    const { getDb } = loadClient()

    expect(getDb()).toBe(getDb())
  })
})
