import { DELETE, PATCH } from './route'

// One combatant (DND-031). PC HP protection lives in the data layer (the
// route cannot tell a PC row from a monster row without a read); what these
// tests pin is the strict patch shape and the status matrix.
jest.mock('@/lib/auth/server', () => ({
  getSessionUser: jest.fn(),
}))

jest.mock('@/lib/db/encounters', () => ({
  removeCombatant: jest.fn(),
  updateCombatant: jest.fn(),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(),
}))

import { getSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import { removeCombatant, updateCombatant } from '@/lib/db/encounters'

const mockGetSessionUser = getSessionUser as jest.MockedFunction<typeof getSessionUser>
const mockUpdateCombatant = updateCombatant as jest.MockedFunction<typeof updateCombatant>
const mockRemoveCombatant = removeCombatant as jest.MockedFunction<typeof removeCombatant>
const mockIsDatabaseConfigured = isDatabaseConfigured as jest.MockedFunction<
  typeof isDatabaseConfigured
>

const DM = 'user_2mFq8xKpLd'
const ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const COMBATANT_ID = '9d0e1f2a-3b4c-4d5e-8f9a-0b1c2d3e4f5a'

const params = Promise.resolve({ id: ID, combatantId: COMBATANT_ID })

function jsonRequest(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

function signedIn() {
  mockGetSessionUser.mockResolvedValue({ id: DM } as unknown as Awaited<
    ReturnType<typeof getSessionUser>
  >)
}

beforeEach(() => {
  mockGetSessionUser.mockResolvedValue(null)
  mockIsDatabaseConfigured.mockReturnValue(true)
  mockUpdateCombatant.mockResolvedValue({ id: COMBATANT_ID } as unknown as Awaited<
    ReturnType<typeof updateCombatant>
  >)
  mockRemoveCombatant.mockResolvedValue(true)
})

describe('PATCH /api/encounters/[id]/combatants/[combatantId]', () => {
  it('answers 401 when signed out', async () => {
    const response = await PATCH(jsonRequest({ initiative: 17 }), { params })

    expect(response.status).toBe(401)
    expect(mockUpdateCombatant).not.toHaveBeenCalled()
  })

  it('passes a damage patch through, scoped to the session user', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ currentHitPoints: 2, temporaryHitPoints: 0 }), {
      params,
    })

    expect(response.status).toBe(200)
    expect(mockUpdateCombatant).toHaveBeenCalledWith(DM, ID, COMBATANT_ID, {
      currentHitPoints: 2,
      temporaryHitPoints: 0,
    })
  })

  it('accepts clearing initiative back to unset', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ initiative: null }), { params })

    expect(response.status).toBe(200)
    expect(mockUpdateCombatant).toHaveBeenCalledWith(DM, ID, COMBATANT_ID, { initiative: null })
  })

  it('refuses a field this route does not track', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({ monsterIndex: 'tarrasque' }), { params })

    expect(response.status).toBe(400)
    expect(mockUpdateCombatant).not.toHaveBeenCalled()
  })

  it('refuses an empty patch', async () => {
    signedIn()

    const response = await PATCH(jsonRequest({}), { params })

    expect(response.status).toBe(400)
  })

  it('answers 404 for a combatant in someone else’s encounter', async () => {
    signedIn()
    mockUpdateCombatant.mockResolvedValue(null)

    const response = await PATCH(jsonRequest({ initiative: 17 }), { params })

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/encounters/[id]/combatants/[combatantId]', () => {
  it('removes scoped to the session user', async () => {
    signedIn()

    const response = await DELETE({} as Request, { params })

    expect(response.status).toBe(200)
    expect(mockRemoveCombatant).toHaveBeenCalledWith(DM, ID, COMBATANT_ID)
  })

  it('answers 404 when there was nothing this user could remove', async () => {
    signedIn()
    mockRemoveCombatant.mockResolvedValue(false)

    const response = await DELETE({} as Request, { params })

    expect(response.status).toBe(404)
  })
})
