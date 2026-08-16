import { GET } from './route'

// The public table feed (D24). Deliberately no auth mock and no session:
// the route must answer without one — the token is the whole credential —
// and every answer carries `Cache-Control: no-store`, because a cached round
// counter on a live screen is worse than none.
jest.mock('@/lib/db/encounters', () => ({
  getEncounterByShareToken: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { isDatabaseConfigured } from '@/lib/db/client'
import { getEncounterByShareToken, type TableScreenView } from '@/lib/db/encounters'

const mockGetEncounterByShareToken = getEncounterByShareToken as jest.MockedFunction<
  typeof getEncounterByShareToken
>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const VIEW: TableScreenView = {
  encounterName: 'Ambush at the bridge',
  campaignName: 'The Rime of the Frostmaiden',
  round: 2,
  activeTurn: 1,
  combatants: [
    { id: 'combatant-1', label: 'Goblin 1', isCharacter: false, initiative: 17, conditions: [] },
    {
      id: 'combatant-2',
      label: 'Vex Ashbrand',
      isCharacter: true,
      initiative: 15,
      conditions: ['prone'],
      characterHp: { current: 21, max: 32, temp: 3 },
    },
  ],
}

const params = Promise.resolve({ token: TOKEN })
const request = {} as unknown as Request

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockGetEncounterByShareToken.mockResolvedValue(VIEW)
})

describe('GET /api/table/[token]', () => {
  it('answers the sanitized view with no session at all, marked no-store', async () => {
    const response = await GET(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mockGetEncounterByShareToken).toHaveBeenCalledWith(TOKEN)

    // The body is exactly the data layer's sanitized shape: the monster row
    // carries no HP and no identity beyond its label.
    expect(body).toEqual(VIEW)
    expect(body.combatants[0]).not.toHaveProperty('characterHp')
    expect(body.combatants[0]).not.toHaveProperty('monsterIndex')
  })

  it('answers 404, still no-store, on a dead token', async () => {
    mockGetEncounterByShareToken.mockResolvedValue(null)

    const response = await GET(request, { params })

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('answers 503 when the database is not configured', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await GET(request, { params })

    expect(response.status).toBe(503)
    expect(mockGetEncounterByShareToken).not.toHaveBeenCalled()
  })
})
