import type { NextRequest } from 'next/server'

import { GET } from './route'

const request = {} as NextRequest

function params(collection: string, index: string) {
  return { params: Promise.resolve({ collection, index }) }
}

describe('GET /api/srd/[collection]/[index]', () => {
  it('answers with the whole SRD entry', async () => {
    const response = await GET(request, params('spells', 'fireball'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      index: 'fireball',
      name: 'Fireball',
      level: 3,
      castingTime: 'Action',
      range: '150 feet',
      duration: 'Instantaneous',
      components: ['V', 'S', 'M'],
    })
    expect(body.description).toContain('20-foot-radius Sphere')
  })

  it('carries the damage-by-slot table from the spell’s own level up', async () => {
    const response = await GET(request, params('spells', 'fireball'))
    const body = await response.json()

    expect(body.higherLevelDamage[0]).toEqual({ label: 'Level 3', damage: '8d6' })
    expect(body.higherLevelDamage.at(-1)).toEqual({ label: 'Level 9', damage: '14d6' })
  })

  it('answers with a 2024 stat block', async () => {
    const response = await GET(request, params('monsters', 'goblin-warrior'))
    const body = await response.json()

    expect(body).toMatchObject({
      name: 'Goblin Warrior',
      type: 'Fey',
      armorClass: 15,
      hitPoints: 10,
      // Derived from CR, which upstream leaves null on every creature.
      proficiencyBonus: 2,
    })
    expect(body.bonusActions).toHaveLength(1)
  })

  it('carries attunement as a flag rather than prose the caller must parse', async () => {
    const response = await GET(request, params('magic-items', 'bag-of-holding'))
    const body = await response.json()

    expect(body).toMatchObject({
      name: 'Bag of Holding',
      rarity: 'Uncommon',
      categoryName: 'Wondrous Items',
      attunement: false,
    })
  })

  it('lets the CDN serve repeat lookups (D34)', async () => {
    const response = await GET(request, params('equipment', 'longsword'))

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=86400, stale-while-revalidate=604800',
    )
  })

  it('404s an index the SRD does not define, uncached', async () => {
    // Half-elf left the SRD with the 2024 revision.
    const response = await GET(request, params('monsters', 'flumph'))

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('404s an unknown collection', async () => {
    const response = await GET(request, params('vehicles', 'rowboat'))

    expect(response.status).toBe(404)
  })

  // Without the guard the cache key space is whatever anyone can type.
  it.each(['../secrets', 'Fireball', 'fire ball', ''])(
    'rejects %p as an index rather than looking it up',
    async (index) => {
      const response = await GET(request, params('spells', index))

      expect(response.status).toBe(400)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    },
  )
})
