import { render, screen } from '@testing-library/react'

import { DmTab } from './dm-tab'

// The shell all three chronology tabs share (D48). The chip and the create
// form are their own tests'; this pins what the shell decides — the title, the
// chip when there is a campaign, and the one teaching empty state when there
// is not.
let databaseReady = true

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'jamie' })),
}))

// The chip and the create form both refresh after acting, so both need a router.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/dm/scope', () => ({
  resolveDmScope: jest.fn(),
}))

import { resolveDmScope } from '@/lib/dm/scope'

const OPEN = { id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b', name: 'The Rime of the Frostmaiden' }

beforeEach(() => {
  databaseReady = true
})

describe('the DM tab shell', () => {
  it('names the tab and the campaign it is scoped to, then draws the content', async () => {
    ;(resolveDmScope as jest.Mock).mockResolvedValue({
      campaign: OPEN,
      otherCampaigns: [],
      carryable: [],
    })

    render(await DmTab({ title: 'Play', children: <p>tonight</p> }))

    expect(screen.getByRole('heading', { name: 'Play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Campaign: ${OPEN.name}` })).toBeInTheDocument()
    expect(screen.getByText('tonight')).toBeInTheDocument()
  })

  it('hands the content the campaign in scope, so the tab never resolves it twice', async () => {
    // `dm-chronology/prep-tab` is the first caller: the scope is worked out
    // here, and a tab that needs the campaign gets it rather than asking again.
    ;(resolveDmScope as jest.Mock).mockResolvedValue({
      campaign: OPEN,
      otherCampaigns: [],
      carryable: [],
    })

    const content = jest.fn(({ campaign }: { campaign: { name: string } }) => (
      <p>{campaign.name} prep</p>
    ))

    render(await DmTab({ title: 'Prep', content }))

    expect(content).toHaveBeenCalledWith({ campaign: OPEN, dmUserId: 'jamie' })
    expect(screen.getByText(`${OPEN.name} prep`)).toBeInTheDocument()
  })

  it('teaches one thing with one control when no campaign is running', async () => {
    // The epic's rail: teach in the empty state, one call to action, never a
    // tour. The content the tab would draw is not drawn — there is nothing for
    // it to be about yet.
    ;(resolveDmScope as jest.Mock).mockResolvedValue({
      campaign: null,
      otherCampaigns: [],
      carryable: [{ id: 'closed-1', name: 'The Tutorial' }],
    })

    const content = jest.fn()

    render(await DmTab({ title: 'Prep', children: <p>the world</p>, content }))

    expect(screen.getByRole('heading', { name: 'Prep' })).toBeInTheDocument()
    expect(screen.getByText('Start with a campaign')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
    expect(screen.queryByText('the world')).not.toBeInTheDocument()
    // Nothing to be about means nothing is asked for: the content callback is
    // never run, so a tab's reads never fire on a screen that shows none of it.
    expect(content).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /^Campaign:/ })).not.toBeInTheDocument()
  })

  it('offers the closed tutorial to carry forward from the empty state', async () => {
    // D47: the table that ended last week is exactly the one worth carrying.
    ;(resolveDmScope as jest.Mock).mockResolvedValue({
      campaign: null,
      otherCampaigns: [],
      carryable: [{ id: 'closed-1', name: 'The Tutorial' }],
    })

    render(await DmTab({ title: 'Sessions' }))

    expect(screen.getByText(/Carry the table forward from/)).toBeInTheDocument()
    expect(screen.getByText('The Tutorial')).toBeInTheDocument()
  })

  it('explains the missing database instead of querying', async () => {
    databaseReady = false

    render(await DmTab({ title: 'Play' }))

    expect(screen.getByText('Not connected to a database yet')).toBeInTheDocument()
    expect(resolveDmScope).not.toHaveBeenCalled()
  })
})
