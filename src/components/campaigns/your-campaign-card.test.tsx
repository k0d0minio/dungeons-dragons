import { render, screen } from '@testing-library/react'

import type { Campaign } from '@/lib/db/schema'

import { YourCampaignCard } from './your-campaign-card'

const CAMPAIGN: Campaign = {
  id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  dmUserId: 'user_2mFq8xKpLd',
  name: 'The Rime of the Frostmaiden',
  joinCode: 'abc',
  gates: null,
  milestoneLevel: null,
  closedAt: null,
  sessionZero: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
}

const SECOND: Campaign = {
  ...CAMPAIGN,
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  name: 'Storm of the Thursday Table',
}

describe('YourCampaignCard', () => {
  it('renders nothing for a character on no campaign', () => {
    // Most characters, most of the time. A permanent empty card at the foot of
    // the sheet would be worse than silence.
    const { container } = render(<YourCampaignCard campaigns={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('is the way to the campaign page', () => {
    render(<YourCampaignCard campaigns={[CAMPAIGN]} />)

    expect(screen.getByRole('link', { name: 'The Rime of the Frostmaiden' })).toHaveAttribute(
      'href',
      `/campaigns/${CAMPAIGN.id}`,
    )
  })

  // The announced night (`first-table/announce-the-night`): one line, under
  // the campaign it belongs to, and only where one was announced.
  it('says when the next night is, under the campaign it belongs to', () => {
    render(
      <YourCampaignCard
        campaigns={[CAMPAIGN, SECOND]}
        nextNights={{
          [CAMPAIGN.id]: {
            id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
            campaignId: CAMPAIGN.id,
            title: 'Session 1 - Intro',
            sessionDate: '2026-09-10',
            revealedAt: new Date('2026-09-05T19:00:00.000Z'),
          },
        }}
      />,
    )

    const rime = screen.getByRole('link', { name: /The Rime of the Frostmaiden/ })
    expect(rime).toHaveTextContent('Next: Thursday 10 September — Session 1 - Intro')

    const storm = screen.getByRole('link', { name: /Storm of the Thursday Table/ })
    expect(storm).not.toHaveTextContent('Next:')
  })

  it('says "your campaign" for one table and pluralises for two', () => {
    const { rerender } = render(<YourCampaignCard campaigns={[CAMPAIGN]} />)
    expect(screen.getByText('Your campaign')).toBeInTheDocument()

    rerender(<YourCampaignCard campaigns={[CAMPAIGN, SECOND]} />)
    expect(screen.getByText('Your campaigns')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('gives each link a thumb-sized tap target', () => {
    // The sheet is used on a phone at a table; a link a person misses is a
    // link that is not there.
    render(<YourCampaignCard campaigns={[CAMPAIGN]} />)

    expect(screen.getByRole('link')).toHaveClass('min-h-11')
  })
})
