import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { CampaignLocation } from '@/lib/db/schema'
import { LOCATION_SECRET_FIELDS } from '@/lib/locations/schema'

import { LocationRoster } from './location-roster'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const HARBOUR: CampaignLocation = {
  id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  name: 'Kelp Harbour',
  summary: 'A fishing village with no fishermen left',
  description: 'Nets rotting on the racks. Every boat still tied up.',
  secrets: 'The village keeps the lighthouse dark on purpose.',
  dmNotes: null,
}

const CAIRN: CampaignLocation = {
  ...HARBOUR,
  id: '8f0a1b2c-3d4e-4f50-a1b2-c3d4e5f60718',
  name: 'Barrow Cairn',
  summary: null,
  description: null,
  secrets: null,
  revealedAt: new Date('2026-09-04T19:00:00.000Z'),
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('LocationRoster', () => {
  it('lists places alphabetically with their one-line summary', () => {
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR, CAIRN]} />)

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByRole('heading', { name: 'Barrow Cairn' })).toBeInTheDocument()
    expect(within(items[1]).getByRole('heading', { name: 'Kelp Harbour' })).toBeInTheDocument()
    expect(screen.getByText('A fishing village with no fishermen left')).toBeInTheDocument()
  })

  // Reveal is `dm-run-suite/reveal-controls`' act. The badge tells the truth
  // about a column that exists; it must not imply a switch that does not.
  it('says which places the party has been shown, and offers no way to change it', () => {
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR, CAIRN]} />)

    expect(screen.getByText('Hidden')).toBeInTheDocument()
    expect(screen.getByText('Revealed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('marks the DM-only half as secret wherever it is written', () => {
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    expect(screen.getByText('Behind the screen')).toBeInTheDocument()
    expect(screen.getByLabelText('DM only — never shown to players')).toBeInTheDocument()
    expect(screen.getByText(/None of this reaches a player/)).toBeInTheDocument()
    expect(
      screen.getByText('The village keeps the lighthouse dark on purpose.'),
    ).toBeInTheDocument()
  })

  it('renders no secret block for a place with nothing written in it', () => {
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[CAIRN]} />)

    expect(screen.queryByText('Behind the screen')).not.toBeInTheDocument()
  })

  it('keeps the add form closed until it is asked for', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[]} />)

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add a place' }))

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    // Both layers, and each field labelled from the schema's own list.
    for (const field of LOCATION_SECRET_FIELDS) {
      expect(screen.getByLabelText(field.label)).toBeInTheDocument()
    }
  })

  it('posts a new place, sending blank fields as null, and adds it in order', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[CAIRN]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ location: HARBOUR }, 201))

    await user.click(screen.getByRole('button', { name: 'Add a place' }))
    await user.type(screen.getByLabelText('Name'), 'Kelp Harbour')
    await user.click(screen.getByRole('button', { name: 'Add place' }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/locations`)
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Kelp Harbour',
      summary: null,
      description: null,
      secrets: null,
      dmNotes: null,
    })
  })

  it('will not post without a name', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[]} />)

    await user.click(screen.getByRole('button', { name: 'Add a place' }))

    expect(screen.getByRole('button', { name: 'Add place' })).toBeDisabled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('says what went wrong when the create is refused, and keeps the draft', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Give the place a name' }, 400))

    await user.click(screen.getByRole('button', { name: 'Add a place' }))
    await user.type(screen.getByLabelText('Name'), 'Kelp Harbour')
    await user.click(screen.getByRole('button', { name: 'Add place' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Give the place a name'),
    )
    expect(screen.getByLabelText('Name')).toHaveValue('Kelp Harbour')
  })

  it('patches an edited place through its own endpoint and repaints from the answer', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ location: { ...HARBOUR, summary: 'Emptied out overnight' } }),
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('One line'))
    await user.type(screen.getByLabelText('One line'), 'Emptied out overnight')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Emptied out overnight')).toBeInTheDocument())
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      `/api/campaigns/${CAMPAIGN_ID}/locations/${HARBOUR.id}`,
    )
  })

  it('clears a field the DM emptied by sending null, not an empty string', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ location: { ...HARBOUR, secrets: null } }))

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('What is really here'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body)).secrets).toBeNull()
  })

  it('leaves the row alone and says so when a save fails', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'No such place' }, 404))

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Name'), '!')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such place'))
    expect(screen.getByLabelText('Name')).toHaveValue('Kelp Harbour!')
  })

  it('restores the row when an edit is cancelled', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Name'), ' (renamed)')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Kelp Harbour' })).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('deletes a place once the confirmation is answered', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true }))

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/locations/${HARBOUR.id}`,
      { method: 'DELETE' },
    )
  })

  it('keeps the place and says so when the delete fails', async () => {
    const user = userEvent.setup()
    render(<LocationRoster campaignId={CAMPAIGN_ID} locations={[HARBOUR]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'No such place' }, 404))

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('That place is already gone.'))

    // The confirmation stays open on a failure, and Radix hides the page behind
    // it from the accessibility tree — hence `hidden`. The row is still there.
    expect(screen.getByRole('heading', { name: 'Delete Kelp Harbour?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kelp Harbour', hidden: true })).toBeInTheDocument()
  })
})
