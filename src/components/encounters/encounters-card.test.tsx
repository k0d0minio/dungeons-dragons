import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}))

import type { Encounter } from '@/lib/db/schema'

import { EncountersCard } from './encounters-card'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

const ENCOUNTER: Encounter = {
  id: ENCOUNTER_ID,
  campaignId: CAMPAIGN_ID,
  name: 'Ambush at the bridge',
  round: 3,
  activeTurn: 1,
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
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

  it('creates an encounter and drops the DM straight into the tracker', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ encounter: { id: ENCOUNTER_ID } }),
    } as Response)

    render(<EncountersCard campaignId={CAMPAIGN_ID} encounters={[]} />)

    await user.type(screen.getByLabelText('New encounter'), 'Ambush at the bridge')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/dm/encounters/${ENCOUNTER_ID}`))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/encounters`)
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: 'Ambush at the bridge',
    })
  })

  it('shows the server’s words when creation is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Give the encounter a name' }),
    } as Response)

    render(<EncountersCard campaignId={CAMPAIGN_ID} encounters={[]} />)

    await user.type(screen.getByLabelText('New encounter'), 'x')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Give the encounter a name')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
