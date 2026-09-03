import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { EndFightCard } from './end-fight-card'

// Ending a fight (`dm-run-suite/session-log-recap`).
//
// The property worth pinning is that this is *not* the delete card: one tap in
// both directions, no confirmation dialog, and the copy promising that nothing
// is lost — which is the whole reason this control exists.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const ENDED_AT = '2026-09-03T21:10:00.000Z'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function renderCard(completedAt: Date | string | null) {
  render(
    <EndFightCard encounterId={ENCOUNTER_ID} campaignId={CAMPAIGN_ID} completedAt={completedAt} />,
  )
}

describe('EndFightCard', () => {
  it('promises that nothing is deleted, before the button is pressed', () => {
    renderCard(null)

    expect(screen.getByText(/Nothing is deleted/)).toBeInTheDocument()
    expect(screen.getByText(/Puts it in tonight’s session log/)).toBeInTheDocument()
  })

  it('ends the fight in one tap, with no dialog in the way', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ encounter: { completedAt: ENDED_AT } }))

    renderCard(null)
    await user.click(screen.getByRole('button', { name: 'End fight' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}/complete`)
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({ completed: true })
    expect(mockToastSuccess).toHaveBeenCalledWith('Ended. It is in tonight’s log.')
  })

  it('reads back as ended, and offers the way back — the same control', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ encounter: { completedAt: null } }))

    renderCard(ENDED_AT)

    expect(screen.getByText('This fight is over')).toBeInTheDocument()
    expect(screen.getByText(/Ended 3 Sept 2026, 21:10/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Put it back on the table' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({ completed: false })
    expect(mockToastSuccess).toHaveBeenCalledWith('Back on the table.')
  })

  it('links to the log the line lands in', () => {
    renderCard(null)

    expect(screen.getByRole('link', { name: /session log/i })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-log`,
    )
  })

  it('leaves the fight where it was when the request fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such encounter' }, 404))

    renderCard(null)
    await user.click(screen.getByRole('button', { name: 'End fight' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such encounter'))
    expect(screen.getByRole('button', { name: 'End fight' })).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('says so when the request never left the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    renderCard(null)
    await user.click(screen.getByRole('button', { name: 'End fight' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That did not send. Check your connection and try again.',
      ),
    )
  })
})
