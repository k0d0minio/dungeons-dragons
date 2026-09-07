import { resolveDmScope } from './scope'
import { DM_CAMPAIGN_COOKIE } from './campaign-cookie'

// D48: the request-shaped half of "which campaign are these tabs about". The
// rule itself is `getActiveCampaignForDm`'s and `campaigns.test.ts` pins it;
// this pins the wiring — the cookie reaches the rule, and each screen is
// handed exactly the list it renders and no other query is made.
let cookieValue: string | undefined

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) =>
      name === 'dm_campaign' && cookieValue !== undefined ? { value: cookieValue } : undefined,
  })),
}))

jest.mock('@/lib/db/campaigns', () => ({
  getActiveCampaignForDm: jest.fn(),
  listCampaignsForDm: jest.fn(),
  listOpenCampaignsForDm: jest.fn(),
}))

import {
  getActiveCampaignForDm,
  listCampaignsForDm,
  listOpenCampaignsForDm,
} from '@/lib/db/campaigns'

const DM = 'user_2mFq8xKpLd'
const OPEN = { id: 'open-1', name: 'The Rime of the Frostmaiden' }
const OTHER = { id: 'open-2', name: 'Storm of the Thursday Table' }
const CLOSED = { id: 'closed-1', name: 'The Tutorial' }

beforeEach(() => {
  cookieValue = undefined
})

describe('resolveDmScope', () => {
  it('hands the chip the campaign and the other open tables, and no carry list', async () => {
    ;(getActiveCampaignForDm as jest.Mock).mockResolvedValue(OPEN)
    ;(listOpenCampaignsForDm as jest.Mock).mockResolvedValue([OPEN, OTHER])

    const scope = await resolveDmScope(DM)

    expect(scope.campaign).toEqual(OPEN)
    // The active one is named on the chip itself, so the menu offers the rest.
    expect(scope.otherCampaigns).toEqual([OTHER])
    // Carry-forward belongs to the empty state, and there is not one here —
    // so the three-statement list query is never fired.
    expect(scope.carryable).toEqual([])
    expect(listCampaignsForDm).not.toHaveBeenCalled()
  })

  it('passes the dm_campaign cookie through as the preference', async () => {
    cookieValue = OTHER.id
    ;(getActiveCampaignForDm as jest.Mock).mockResolvedValue(OTHER)
    ;(listOpenCampaignsForDm as jest.Mock).mockResolvedValue([OPEN, OTHER])

    const scope = await resolveDmScope(DM)

    expect(getActiveCampaignForDm).toHaveBeenCalledWith(DM, OTHER.id)
    expect(scope.campaign).toEqual(OTHER)
    expect(scope.otherCampaigns).toEqual([OPEN])
  })

  it('asks with null when the cookie is not set', async () => {
    ;(getActiveCampaignForDm as jest.Mock).mockResolvedValue(OPEN)
    ;(listOpenCampaignsForDm as jest.Mock).mockResolvedValue([OPEN])

    await resolveDmScope(DM)

    expect(getActiveCampaignForDm).toHaveBeenCalledWith(DM, null)
  })

  it('offers every campaign to carry forward when nothing is running, closed ones included', async () => {
    // D47: the campaign most worth carrying is usually the tutorial that just
    // closed, so the empty state's list is every campaign, not the open ones.
    ;(getActiveCampaignForDm as jest.Mock).mockResolvedValue(null)
    ;(listCampaignsForDm as jest.Mock).mockResolvedValue([
      { ...CLOSED, playerCount: 4, characterCount: 4 },
      { ...OPEN, playerCount: 0, characterCount: 0 },
    ])

    const scope = await resolveDmScope(DM)

    expect(scope.campaign).toBeNull()
    expect(scope.otherCampaigns).toEqual([])
    expect(scope.carryable).toEqual([
      { id: CLOSED.id, name: CLOSED.name },
      { id: OPEN.id, name: OPEN.name },
    ])
    expect(listOpenCampaignsForDm).not.toHaveBeenCalled()
  })
})

describe('the cookie name', () => {
  it('is the one both halves use', () => {
    // The chip writes it in the browser and this module reads it on the
    // server; the constant is the only thing keeping them in step.
    expect(DM_CAMPAIGN_COOKIE).toBe('dm_campaign')
  })
})
