import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { SessionZeroCard, SESSION_ZERO_HEADINGS, SESSION_ZERO_TEMPLATE } from './session-zero-card'

// The DM's one page (`first-table/session-zero-one-pager`): seeded with the
// headings, saved as plain text, and never saved untouched.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('SessionZeroCard', () => {
  it('seeds an unwritten page with the six headings, as text, and will not save them untouched', () => {
    render(<SessionZeroCard campaignId={CAMPAIGN_ID} body={null} />)

    const box = screen.getByLabelText('The one page')
    expect(box).toHaveValue(SESSION_ZERO_TEMPLATE)
    for (const heading of SESSION_ZERO_HEADINGS) expect(box).toHaveDisplayValue(new RegExp(heading))
    expect(screen.getByText(/Write it as you would say it/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows what was written rather than the seed once there is a page', () => {
    render(<SessionZeroCard campaignId={CAMPAIGN_ID} body="Phones — face down." />)

    expect(screen.getByLabelText('The one page')).toHaveValue('Phones — face down.')
  })

  it('saves the page as written and settles on what the server stored', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(
      jsonResponse({
        campaign: { sessionZero: 'The pitch — a lighthouse that should not be lit.' },
      }),
    )

    render(<SessionZeroCard campaignId={CAMPAIGN_ID} body={null} />)

    const box = screen.getByLabelText('The one page')
    await user.clear(box)
    await user.type(box, 'The pitch — a lighthouse that should not be lit.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/session-zero`)
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      body: 'The pitch — a lighthouse that should not be lit.',
    })
    expect(box).toHaveValue('The pitch — a lighthouse that should not be lit.')
  })

  it('reads a cleared page back as empty, not as the seed', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ campaign: { sessionZero: null } }))

    render(<SessionZeroCard campaignId={CAMPAIGN_ID} body="Phones — face down." />)

    await user.clear(screen.getByLabelText('The one page'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())
    expect(screen.getByLabelText('The one page')).toHaveValue('')
  })

  it('shows the server’s words when the save is refused, keeping the draft', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(
      jsonResponse({ error: 'Keep the page under 5,000 characters' }, 400),
    )

    render(<SessionZeroCard campaignId={CAMPAIGN_ID} body="x" />)

    await user.type(screen.getByLabelText('The one page'), 'y')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Keep the page under 5,000 characters',
    )
    expect(screen.getByLabelText('The one page')).toHaveValue('xy')
  })

  it('says so when the save never left the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<SessionZeroCard campaignId={CAMPAIGN_ID} body="x" />)

    await user.type(screen.getByLabelText('The one page'), 'y')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/did not send/)
  })
})
