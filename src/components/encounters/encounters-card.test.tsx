import { render, screen } from '@testing-library/react'

import type { Encounter } from '@/lib/db/schema'

import { EncountersCard } from './encounters-card'

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const ENCOUNTER: Encounter = {
  id: ENCOUNTER_ID,
  campaignId: CAMPAIGN_ID,
  name: 'Ambush at the bridge',
  round: 3,
  activeTurn: 1,
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
  completedAt: null,
  createdAt: new Date('2026-08-15T12:00:00.000Z'),
  updatedAt: new Date('2026-08-15T12:00:00.000Z'),
}

describe('EncountersCard', () => {
  it('lists encounters linking into the tracker, with the round they stand at', () => {
    render(<EncountersCard campaignId={CAMPAIGN_ID} encounters={[ENCOUNTER]} />)

    const link = screen.getByRole('link', { name: /Ambush at the bridge/ })
    expect(link).toHaveAttribute('href', `/dm/encounters/${ENCOUNTER_ID}`)
    expect(screen.getByText('Round 3')).toBeInTheDocument()
  })

  it('says so plainly when there is nothing to run yet', () => {
    render(<EncountersCard campaignId={CAMPAIGN_ID} encounters={[]} />)

    expect(screen.getByText('No encounters yet.')).toBeInTheDocument()
  })

  // The one-field create form this card used to carry is gone: a new encounter
  // goes through the builder, so it is priced against the party before it is
  // saved (`dm-prep-suite/encounter-builder`).
  it('sends a new encounter to the builder rather than making one in a tap', () => {
    render(<EncountersCard campaignId={CAMPAIGN_ID} encounters={[]} />)

    expect(screen.getByRole('link', { name: 'Build an encounter' })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/encounters/new`,
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
