import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { CloseSessionCard } from './close-session-card'

// Closing a session (`dm-run-suite/session-log-recap`).
//
// What is worth pinning: the draft arrives editable rather than as a list of
// facts the DM approves, publishing sends what is in the box at that moment,
// and a failure leaves the text where the DM can send it again.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const DRAFT = 'Met Bram\nFought Ambush at the ford'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function renderCard(draft = DRAFT) {
  render(<CloseSessionCard campaignId={CAMPAIGN_ID} draft={draft} />)
  return screen.getByLabelText('Recap') as HTMLTextAreaElement
}

describe('CloseSessionCard', () => {
  it('opens with the generated draft in an editable box', () => {
    const box = renderCard()

    expect(box).toHaveValue(DRAFT)
    expect(box.tagName).toBe('TEXTAREA')
  })

  it('says what publishing does, before the button is pressed', () => {
    renderCard()

    expect(screen.getByText(/top of their campaign page/)).toBeInTheDocument()
    expect(screen.getByText(/starts the next session/)).toBeInTheDocument()
  })

  it('publishes what the DM edited, not the draft it started with', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ recap: { id: 'n1' } }, 201))

    const box = renderCard()

    await user.clear(box)
    await user.type(box, 'They burned the shrine.')
    await user.click(screen.getByRole('button', { name: /Publish recap/ }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/session-log/close`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ body: 'They burned the shrine.' })
  })

  it('re-renders the page after publishing — the log’s window has moved', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ recap: { id: 'n1' } }, 201))

    renderCard()
    await user.click(screen.getByRole('button', { name: /Publish recap/ }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Session closed. Your players can read the recap.',
    )
  })

  it('cannot publish an empty recap — the button is disabled until there is one', async () => {
    const user = userEvent.setup()

    renderCard('')

    expect(screen.getByRole('button', { name: /Publish recap/ })).toBeDisabled()

    await user.type(screen.getByLabelText('Recap'), 'Something happened.')
    expect(screen.getByRole('button', { name: /Publish recap/ })).toBeEnabled()
  })

  it('keeps the text on a failure, and says so', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such campaign' }, 404))

    const box = renderCard()
    await user.click(screen.getByRole('button', { name: /Publish recap/ }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such campaign'))
    expect(box).toHaveValue(DRAFT)
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('says so when the request never left the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    renderCard()
    await user.click(screen.getByRole('button', { name: /Publish recap/ }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That did not send. Check your connection and try again.',
      ),
    )
  })
})
