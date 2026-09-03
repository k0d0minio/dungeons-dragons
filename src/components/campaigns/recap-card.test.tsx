import { render, screen } from '@testing-library/react'

import type { CampaignRecap } from '@/lib/db/notes'

import { RecapCard } from './recap-card'

// "Previously on…" (`dm-run-suite/session-log-recap`) — the player's half.

const LATEST: CampaignRecap = {
  id: 'n2',
  sessionDate: '2026-09-03',
  body: 'They burned the shrine.\nThe cultist walked away.',
}

const EARLIER: CampaignRecap = {
  id: 'n1',
  sessionDate: '2026-08-15',
  body: 'They bribed the harbourmaster.',
}

describe('RecapCard', () => {
  it('renders nothing at all before the first session closes', () => {
    const { container } = render(<RecapCard recaps={[]} />)

    // Not an empty card explaining itself: this sits above the party on a page
    // a player opens to see the party.
    expect(container).toBeEmptyDOMElement()
  })

  it('leads with the newest recap, under the date the DM closed it on', () => {
    render(<RecapCard recaps={[LATEST, EARLIER]} />)

    expect(screen.getByText('Previously on…')).toBeInTheDocument()
    expect(screen.getByText(/Thu, 3 Sept 2026/)).toBeInTheDocument()
    expect(screen.getByText(/They burned the shrine/)).toBeInTheDocument()
  })

  it('keeps the earlier ones on the page, under their own dates', () => {
    render(<RecapCard recaps={[LATEST, EARLIER]} />)

    expect(screen.getByText('Earlier sessions')).toBeInTheDocument()
    expect(screen.getByText('They bribed the harbourmaster.')).toBeInTheDocument()
  })

  it('has no earlier section when there is only one recap', () => {
    render(<RecapCard recaps={[LATEST]} />)

    expect(screen.queryByText('Earlier sessions')).not.toBeInTheDocument()
  })

  it('keeps the DM’s line breaks — a recap is written as lines', () => {
    render(<RecapCard recaps={[LATEST]} />)

    const body = screen.getByText(/They burned the shrine/)
    expect(body).toHaveClass('whitespace-pre-wrap')
  })
})
