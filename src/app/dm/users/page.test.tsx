import { render, screen } from '@testing-library/react'

import DmUsersPage from './page'

// The DM's people page (`user-management/invites-and-roles`): every account,
// every invite, and the DM's own row marked as theirs. The gate is the
// layout's; the components are their own tests' — this pins the wiring.
let databaseReady = true

jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(async () => ({ id: 'jamie' })),
}))

// The roster refreshes the page after a deletion, so it needs a router here.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/users', () => ({
  listUsers: jest.fn(async () => [
    {
      id: 'jamie',
      name: 'Jamie',
      email: 'jamie@example.com',
      createdAt: new Date('2026-08-13T17:44:34.000Z'),
      role: 'dm',
      characterCount: 2,
      campaignCount: 1,
    },
    {
      id: 'sam',
      name: 'Sam',
      email: 'sam@example.com',
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      role: 'player',
      characterCount: 0,
      campaignCount: 0,
    },
  ]),
}))

jest.mock('@/lib/db/invites', () => ({
  ...jest.requireActual('@/lib/db/invites'),
  listInvites: jest.fn(async () => [
    {
      id: 'inv-1',
      token: 'kfEbCq3vX9pLm2Rt8sWz1A',
      role: 'player',
      label: 'Priya',
      email: null,
      createdBy: 'jamie',
      createdAt: new Date('2026-09-02T10:00:00.000Z'),
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      claimedAt: null,
      claimedByUserId: null,
    },
    {
      id: 'inv-2',
      token: 'AAAAAAAAAAAAAAAAAAAAAA',
      role: 'player',
      label: 'The one Sam used',
      email: null,
      createdBy: 'jamie',
      createdAt: new Date('2026-08-30T10:00:00.000Z'),
      expiresAt: new Date('2026-09-13T10:00:00.000Z'),
      revokedAt: null,
      claimedAt: new Date('2026-09-01T10:00:00.000Z'),
      claimedByUserId: 'sam',
    },
  ]),
}))

beforeEach(() => {
  databaseReady = true
})

describe('the DM users page', () => {
  it('renders the invites and every account, marking the DM’s own row', async () => {
    render(await DmUsersPage())

    expect(screen.getByRole('heading', { name: 'Players & invites' })).toBeInTheDocument()
    expect(screen.getByText('Jamie')).toBeInTheDocument()
    expect(screen.getByText('you')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Make DM' })).toBeInTheDocument()

    expect(screen.getByText('Priya')).toBeInTheDocument()
    expect(screen.getByText('/invite/kfEbCq3vX9pLm2Rt8sWz1A')).toBeInTheDocument()
    // A claimed invite names who came in on it, resolved from the user list.
    expect(screen.getByText('Used by Sam')).toBeInTheDocument()
  })

  it('explains the missing database instead of querying', async () => {
    databaseReady = false

    render(await DmUsersPage())

    expect(screen.getByText('Not connected to a database yet')).toBeInTheDocument()
    expect(screen.queryByText('Jamie')).not.toBeInTheDocument()
  })
})
