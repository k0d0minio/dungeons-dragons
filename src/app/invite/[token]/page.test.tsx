import { render, screen } from '@testing-library/react'

import InvitePage from './page'

// The landing page of a tokenised invite (`user-management/invites-and-roles`).
// A live invite shows the card; every kind of dead link — and a deploy with
// no database — reads the same one way.
let databaseReady = true
let invite: {
  token: string
  role: string
  label: string | null
  campaignId?: string | null
  campaignName?: string | null
} | null = null

jest.mock('@/lib/db/client', () => ({
  isDatabaseConfigured: jest.fn(() => databaseReady),
}))

jest.mock('@/lib/db/invites', () => ({
  findClaimableInvite: jest.fn(async () => invite),
}))

jest.mock('@/components/auth/invite-landing', () => ({
  InviteLanding: ({
    token,
    role,
    label,
    campaign,
  }: {
    token: string
    role: string
    label: string | null
    campaign: { id: string; name: string } | null
  }) => (
    <div
      data-testid="landing"
      data-token={token}
      data-role={role}
      data-label={label ?? '(none)'}
      data-campaign={campaign ? `${campaign.id}:${campaign.name}` : '(none)'}
    />
  ),
}))

import { findClaimableInvite } from '@/lib/db/invites'

const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'
const CAMPAIGN_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

beforeEach(() => {
  databaseReady = true
  invite = null
})

async function renderPage(token = TOKEN) {
  render(await InvitePage({ params: Promise.resolve({ token }) }))
}

describe('the invite page', () => {
  it('shows the landing card for a live invite, with what the invite says', async () => {
    invite = { token: TOKEN, role: 'dm', label: 'Sam' }

    await renderPage()

    const landing = screen.getByTestId('landing')
    expect(landing).toHaveAttribute('data-token', TOKEN)
    expect(landing).toHaveAttribute('data-role', 'dm')
    expect(landing).toHaveAttribute('data-label', 'Sam')
    expect(landing).toHaveAttribute('data-campaign', '(none)')
    expect(findClaimableInvite).toHaveBeenCalledWith(TOKEN)
  })

  // One link, not two (`dm-chronology/one-link-invite`).
  it('hands the table over when the invite carries one', async () => {
    invite = {
      token: TOKEN,
      role: 'player',
      label: 'Sam',
      campaignId: CAMPAIGN_ID,
      campaignName: 'Heroes of the Borderlands',
    }

    await renderPage()

    expect(screen.getByTestId('landing')).toHaveAttribute(
      'data-campaign',
      `${CAMPAIGN_ID}:Heroes of the Borderlands`,
    )
  })

  // The FK sets the id null when a campaign is deleted, so half an answer is
  // no answer: the card must not name a table that is gone.
  it('names no table when the campaign has gone from under the invite', async () => {
    invite = { token: TOKEN, role: 'player', label: 'Sam', campaignId: null, campaignName: null }

    await renderPage()

    expect(screen.getByTestId('landing')).toHaveAttribute('data-campaign', '(none)')
  })

  it('says the link no longer works for anything else, and offers sign-in', async () => {
    await renderPage()

    expect(screen.queryByTestId('landing')).not.toBeInTheDocument()
    expect(screen.getByText('This invite link no longer works')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/sign-in')
  })

  it('reads the same without a database, and never queries', async () => {
    databaseReady = false

    await renderPage()

    expect(screen.getByText('This invite link no longer works')).toBeInTheDocument()
    expect(findClaimableInvite).not.toHaveBeenCalled()
  })
})
