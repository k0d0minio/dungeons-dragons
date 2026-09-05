import { render, screen, within } from '@testing-library/react'

import DmHomePage from './page'

// The DM's home (`first-table/one-night-campaign`): a closed campaign is
// badged and listed last, and the create form is handed the list to carry
// forward from. The components are their own tests' — this pins the wiring.
let databaseReady = true

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'jamie' })),
}))

// The create form refreshes the page after a creation, so it needs a router.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

const base = {
  dmUserId: 'jamie',
  joinCode: null,
  gates: null,
  milestoneLevel: null,
  sessionZero: null,
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  updatedAt: new Date('2026-08-14T12:00:00.000Z'),
  memberCount: 8,
  characterCount: 7,
}

jest.mock('@/lib/db/campaigns', () => ({
  // Newest first, as the data layer lists them — which puts the closed
  // tutorial *first* here, so the page's reordering is what is on trial.
  listCampaignsForDm: jest.fn(async () => [
    {
      ...base,
      id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
      name: 'The Tutorial',
      closedAt: new Date('2026-09-10T22:30:00.000Z'),
    },
    {
      ...base,
      id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
      name: 'The Rime of the Frostmaiden',
      closedAt: null,
    },
  ]),
}))

beforeEach(() => {
  databaseReady = true
})

describe('the DM home page', () => {
  it('badges a closed campaign and lists it last', async () => {
    render(await DmHomePage())

    const links = screen.getAllByRole('link', { name: /Tutorial|Frostmaiden/ })
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining('The Rime of the Frostmaiden'),
      expect.stringContaining('The Tutorial'),
    ])

    expect(within(links[1]).getByText('Closed')).toBeInTheDocument()
    expect(within(links[0]).queryByText('Closed')).not.toBeInTheDocument()
  })

  it('hands the create form every campaign to carry forward from, closed ones included', async () => {
    render(await DmHomePage())

    const select = screen.getByRole('combobox', { name: 'Campaign to carry forward from' })
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['The Rime of the Frostmaiden', 'The Tutorial'])
  })

  it('explains the missing database instead of querying', async () => {
    databaseReady = false

    render(await DmHomePage())

    expect(screen.getByText('Not connected to a database yet')).toBeInTheDocument()
    expect(screen.queryByText('The Tutorial')).not.toBeInTheDocument()
  })
})
