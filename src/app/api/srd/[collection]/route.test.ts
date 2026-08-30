import type { NextRequest } from 'next/server'

import { GET } from './route'

/** The handler reads only `nextUrl.searchParams`, so that is all this builds. */
function request(url: string): NextRequest {
  return { nextUrl: new URL(url, 'https://example.test') } as NextRequest
}

function params(collection: string) {
  return { params: Promise.resolve({ collection }) }
}

describe('GET /api/srd/[collection]', () => {
  it('lists a collection with the columns its callers sort by', async () => {
    const response = await GET(request('/api/srd/spells'), params('spells'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(body.results.length)
    expect(body.count).toBeGreaterThan(300)

    const fireball = body.results.find((row: { index: string }) => row.index === 'fireball')
    expect(fireball).toEqual({
      index: 'fireball',
      name: 'Fireball',
      level: 3,
      school: 'evocation',
      concentration: false,
      ritual: false,
    })
  })

  it('keeps list rows lean — the whole spell is one request away', async () => {
    const response = await GET(request('/api/srd/spells'), params('spells'))
    const body = await response.json()

    expect(body.results[0]).not.toHaveProperty('description')
  })

  it('narrows the spell list to one class, replacing the 2014 class-spells route', async () => {
    const response = await GET(request('/api/srd/spells?class=wizard'), params('spells'))
    const body = await response.json()

    expect(body.count).toBeGreaterThan(0)
    expect(body.count).toBeLessThan(339)

    const all = await (await GET(request('/api/srd/spells'), params('spells'))).json()
    expect(body.count).toBeLessThan(all.count)
    // Cure Wounds is a cleric spell; a wizard's list must not carry it.
    expect(body.results.some((row: { index: string }) => row.index === 'cure-wounds')).toBe(false)
  })

  it('carries the XP a monster is worth on the list row itself (DND-055)', async () => {
    const response = await GET(request('/api/srd/monsters'), params('monsters'))
    const body = await response.json()

    const goblin = body.results.find((row: { index: string }) => row.index === 'goblin-warrior')
    expect(goblin).toMatchObject({
      name: 'Goblin Warrior',
      challengeRatingText: '1/4',
      experiencePoints: 50,
      // 2024 reclassified goblins as Fey.
      type: 'Fey',
    })
  })

  it('lets the CDN serve repeat lookups (D34)', async () => {
    const response = await GET(request('/api/srd/equipment'), params('equipment'))

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, stale-while-revalidate=604800',
    )
  })

  it('404s an unknown collection without caching the miss', async () => {
    const response = await GET(request('/api/srd/potions'), params('potions'))

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  // The 2014 namespace is retired, not repointed (D31), and the creation sets
  // are bundled rather than served — neither is reachable here.
  it.each(['classes', 'species', 'races', 'conditions'])('does not serve %s', async (name) => {
    const response = await GET(request(`/api/srd/${name}`), params(name))

    expect(response.status).toBe(404)
  })
})
