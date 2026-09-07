import { GET } from './route'

// The public table feed (D24, `dm-run-suite/table-screen-cast`). Deliberately
// no auth mock and no session: the route must answer without one — the token
// is the whole credential — and every answer carries `Cache-Control:
// no-store`, because a cached round counter on a live screen is worse than
// none.
//
// Two token kinds answer here, and which one is tried first is a property
// under test: the campaign's always-on screen, and the encounter share links
// handed out before it existed, which are on somebody's laptop and must not
// stop working mid-session.
jest.mock('@/lib/db/encounters', () => ({
  getEncounterByShareToken: jest.fn(),
}))

jest.mock('@/lib/db/table', () => ({
  getTableView: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { isDatabaseConfigured } from '@/lib/db/client'
import { getEncounterByShareToken, type TableScreenView } from '@/lib/db/encounters'
import { getTableView, type TableView } from '@/lib/db/table'

const mockGetEncounterByShareToken = getEncounterByShareToken as jest.MockedFunction<
  typeof getEncounterByShareToken
>
const mockGetTableView = getTableView as jest.MockedFunction<typeof getTableView>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const ENCOUNTER_VIEW: TableScreenView = {
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

const CAMPAIGN_VIEW: TableView = {
  campaignName: 'The Rime of the Frostmaiden',
  spotlight: {
    kind: 'location',
    at: '2026-09-07T19:00:00.000Z',
    name: 'Kelp Harbour',
    summary: 'A fishing village with no fishermen left',
    description: 'Nets rot on the jetty.',
  },
  encounter: null,
}

const params = Promise.resolve({ token: TOKEN })
const request = {} as unknown as Request

beforeEach(() => {
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockGetTableView.mockResolvedValue(null)
  mockGetEncounterByShareToken.mockResolvedValue(ENCOUNTER_VIEW)
})

describe('GET /api/table/[token]', () => {
  it('answers a campaign token with what the DM cast, with no session at all', async () => {
    mockGetTableView.mockResolvedValue(CAMPAIGN_VIEW)

    const response = await GET(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mockGetTableView).toHaveBeenCalledWith(TOKEN)
    expect(body).toEqual(CAMPAIGN_VIEW)

    // The campaign screen is tried first and answers on its own: an encounter
    // lookup for the same token would be a second round trip every five
    // seconds, on the route every table screen polls.
    expect(mockGetEncounterByShareToken).not.toHaveBeenCalled()
  })

  it('still answers an encounter share token, in the same shape', async () => {
    const response = await GET(request, { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockGetEncounterByShareToken).toHaveBeenCalledWith(TOKEN)

    // Mapped, not passed through: one response type means the screen has one
    // thing to render. An old link buys no spotlight, because an encounter has
    // nothing to cast onto.
    expect(body).toEqual({
      campaignName: 'The Rime of the Frostmaiden',
      spotlight: null,
      encounter: {
        name: 'Ambush at the bridge',
        round: 2,
        activeTurn: 1,
        combatants: ENCOUNTER_VIEW.combatants,
      },
    })

    // The monster row carries no HP and no identity beyond its label.
    expect(body.encounter.combatants[0]).not.toHaveProperty('characterHp')
    expect(body.encounter.combatants[0]).not.toHaveProperty('monsterIndex')
  })

  it('hands on the featured reveal exactly as the data layer built it', async () => {
    // The whole disclosure this token buys of the DM's prep: a kind, a name, a
    // one-line summary and when it happened. If a DM-only field ever appeared
    // on `TableReveal`, it would arrive here — on a route with no session at
    // all — so the shape is asserted key by key.
    mockGetEncounterByShareToken.mockResolvedValue({
      ...ENCOUNTER_VIEW,
      reveal: {
        kind: 'npc',
        name: 'Harbourmaster Vane',
        summary: 'Runs the docks, and is bought',
        revealedAt: '2026-09-03T19:00:00.000Z',
      },
    })

    const body = await (await GET(request, { params })).json()

    expect(Object.keys(body.reveal).sort()).toEqual(['kind', 'name', 'revealedAt', 'summary'])
    expect(body.reveal.name).toBe('Harbourmaster Vane')
  })

  it('answers 404, still no-store, when neither kind of token is live', async () => {
    mockGetEncounterByShareToken.mockResolvedValue(null)

    const response = await GET(request, { params })

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('answers 503 when the database is not configured', async () => {
    mockIsDatabaseConfigured.mockReturnValue(false)

    const response = await GET(request, { params })

    expect(response.status).toBe(503)
    expect(mockGetTableView).not.toHaveBeenCalled()
    expect(mockGetEncounterByShareToken).not.toHaveBeenCalled()
  })
})
