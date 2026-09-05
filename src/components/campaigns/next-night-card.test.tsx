import { render, screen } from '@testing-library/react'

import type { PublicSessionPlan } from '@/lib/db/discovered'

import { NextNightCard } from './next-night-card'

// The announced night (`first-table/announce-the-night`): the title and the
// date, or the title alone, or nothing.

const NIGHT: PublicSessionPlan = {
  id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
  campaignId: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  title: 'Session 1 - Intro',
  sessionDate: '2026-09-10',
  revealedAt: new Date('2026-09-05T19:00:00.000Z'),
}

describe('NextNightCard', () => {
  it('renders nothing when nothing is announced', () => {
    const { container } = render(<NextNightCard night={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('says the night in full — weekday, day, month — then the title', () => {
    render(<NextNightCard night={NIGHT} />)

    expect(screen.getByText('Next session')).toBeInTheDocument()
    expect(screen.getByText('Thursday 10 September — Session 1 - Intro')).toBeInTheDocument()
  })

  it('is the title alone for a night announced without a date', () => {
    render(<NextNightCard night={{ ...NIGHT, sessionDate: null }} />)

    expect(screen.getByText('Session 1 - Intro')).toBeInTheDocument()
    expect(screen.queryByText(/—/)).not.toBeInTheDocument()
  })
})
