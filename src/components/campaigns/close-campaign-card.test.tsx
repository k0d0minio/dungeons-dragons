import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

import { CloseCampaignCard } from './close-campaign-card'

// The end of a campaign (`first-table/one-night-campaign`). What is worth
// pinning: the draft is in the box, the consequence is on the control, the
// close is behind a confirmation that names it, an empty recap still closes
// (the recovery path), and a closed campaign offers nothing.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const DRAFT = 'Ended: The bridge\nYou met Halda.'

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

beforeEach(() => {
  mockFetch.mockReset()
  mockRefresh.mockReset()
})

describe('CloseCampaignCard', () => {
  it('seeds the box with the draft and states the consequence beside the button', () => {
    render(<CloseCampaignCard campaignId={CAMPAIGN_ID} draft={DRAFT} closedAt={null} />)

    expect(screen.getByLabelText('Recap')).toHaveValue(DRAFT)
    expect(
      screen.getByText(/Closing publishes this recap to your players and takes the campaign off/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Their characters stay\./)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Publish the recap and close this campaign' }),
    ).toHaveClass('h-11')
  })

  it('closes behind a confirmation, sending what is in the box, then refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ campaign: { id: CAMPAIGN_ID } }))

    render(<CloseCampaignCard campaignId={CAMPAIGN_ID} draft={DRAFT} closedAt={null} />)

    await user.clear(screen.getByLabelText('Recap'))
    await user.type(screen.getByLabelText('Recap'), 'You met Halda.')
    await user.click(
      screen.getByRole('button', { name: 'Publish the recap and close this campaign' }),
    )

    // Nothing is sent by the first tap; the dialog names what the second does.
    expect(mockFetch).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog', { name: 'Close this campaign?' })).toBeInTheDocument()
    expect(screen.getByText(/there is no reopening/)).toBeInTheDocument()
    expect(screen.getByText(/within a few seconds/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close it' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/close`)
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ recap: 'You met Halda.' })
  })

  it('still closes with the box emptied — the second press after a half-failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ campaign: { id: CAMPAIGN_ID } }))

    render(<CloseCampaignCard campaignId={CAMPAIGN_ID} draft="" closedAt={null} />)

    await user.click(
      screen.getByRole('button', { name: 'Publish the recap and close this campaign' }),
    )
    expect(screen.getByText(/nothing is published/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close it' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ recap: '' })
  })

  it('keeps the dialog open and says why when the close fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'nope' }, 404))

    render(<CloseCampaignCard campaignId={CAMPAIGN_ID} draft={DRAFT} closedAt={null} />)

    await user.click(
      screen.getByRole('button', { name: 'Publish the recap and close this campaign' }),
    )
    await user.click(screen.getByRole('button', { name: 'Close it' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This campaign is not yours to close.',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('says so when the request never landed', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<CloseCampaignCard campaignId={CAMPAIGN_ID} draft={DRAFT} closedAt={null} />)

    await user.click(
      screen.getByRole('button', { name: 'Publish the recap and close this campaign' }),
    )
    await user.click(screen.getByRole('button', { name: 'Close it' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the server/)
  })

  it('offers nothing once the campaign is closed — only when', () => {
    render(
      <CloseCampaignCard
        campaignId={CAMPAIGN_ID}
        draft={DRAFT}
        closedAt={new Date('2026-08-20T22:30:00.000Z')}
      />,
    )

    expect(screen.getByText(/Closed on 20 Aug 2026/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Recap')).not.toBeInTheDocument()
  })
})
