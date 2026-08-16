import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { JoinCodeCard } from './join-code-card'

const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CODE = 'kfEbCq3vX9pLm2Rt8sWz1A'
const NEW_CODE = 'aaaaaaaaaaaaaaaaaaaaaa'

/**
 * Replace the clipboard after userEvent.setup() installs its own stub, so the
 * test controls (and can assert on) exactly what `copy` writes.
 */
function stubClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  })
}

describe('JoinCodeCard', () => {
  it('renders the join path and both buttons when a code is live', () => {
    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={CODE} />)

    expect(screen.getByText(`/campaigns/join/${CODE}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument()
  })

  it('renders the empty state, with no copy button, when there is no code', () => {
    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={null} />)

    expect(screen.getByText('No live join link. Make one to invite the table.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create join link' })).toBeInTheDocument()
  })

  it('copies the full join URL and says so', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={CODE} />)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith('Join link copied. Send it to your players.'),
    )
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/campaigns/join/${CODE}`)
  })

  it('offers the long-press fallback when the clipboard refuses', async () => {
    const user = userEvent.setup()
    stubClipboard(jest.fn().mockRejectedValue(new Error('denied')))

    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={CODE} />)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Could not copy. Long-press the link text instead.',
      ),
    )
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('regenerates the code, swaps in the new link and says the old one is dead', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ campaign: { joinCode: NEW_CODE } }),
    } as Response)

    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={CODE} />)

    await user.click(screen.getByRole('button', { name: 'Regenerate' }))

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'New join link made. The old one no longer works.',
      ),
    )

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/join-code`)
    expect((init as RequestInit).method).toBe('POST')

    expect(screen.getByText(`/campaigns/join/${NEW_CODE}`)).toBeInTheDocument()
    expect(screen.queryByText(`/campaigns/join/${CODE}`)).not.toBeInTheDocument()
  })

  it('keeps the old code and toasts an error when regeneration fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)

    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={CODE} />)

    await user.click(screen.getByRole('button', { name: 'Regenerate' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Could not make a new link. Try again.'),
    )
    expect(screen.getByText(`/campaigns/join/${CODE}`)).toBeInTheDocument()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('blames the connection when the regenerate request never landed', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<JoinCodeCard campaignId={CAMPAIGN_ID} joinCode={CODE} />)

    await user.click(screen.getByRole('button', { name: 'Regenerate' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'Could not make a new link. Check your connection.',
      ),
    )
    expect(screen.getByText(`/campaigns/join/${CODE}`)).toBeInTheDocument()
  })
})
