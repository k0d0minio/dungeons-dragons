import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CarryForwardCard } from './carry-forward-card'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '2f3a4b5c-6d7e-4f80-91a2-b3c4d5e6f708'

const TUTORIAL = {
  id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  name: 'The Tutorial',
  playerCount: 4,
  characterCount: 4,
}

const OTHER = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  name: 'The Rime',
  playerCount: 3,
  characterCount: 5,
}

function sent(index = 0): { url: string; method: string; body: Record<string, unknown> } {
  const [url, init] = mockFetch.mock.calls[index]
  const request = init as RequestInit
  return {
    url: String(url),
    method: String(request.method),
    body: JSON.parse(String(request.body)),
  }
}

// The carry, on the campaign's own page (`triage/carry-forward-rerun`): the
// mend that outlives the screen the campaign was made on.
describe('CarryForwardCard', () => {
  it('carries the table across from the one campaign offered, and refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<CarryForwardCard campaignId={CAMPAIGN_ID} sources={[TUTORIAL]} />)

    // One source is named in the button rather than hidden behind a picker.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Carry the table across from The Tutorial' }),
    )

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(sent()).toEqual({
      url: `/api/campaigns/${CAMPAIGN_ID}/carry-from`,
      method: 'PUT',
      body: { campaignId: TUTORIAL.id },
    })
  })

  it('picks between several, with each one’s headcount on the option', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<CarryForwardCard campaignId={CAMPAIGN_ID} sources={[TUTORIAL, OTHER]} />)

    const select = screen.getByRole('combobox', { name: 'Campaign to carry forward from' })
    expect(
      screen.getByRole('option', { name: 'The Rime — 3 players · 5 characters' }),
    ).toBeVisible()

    await user.selectOptions(select, OTHER.id)
    await user.click(screen.getByRole('button', { name: 'Carry the table across from The Rime' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(sent().body).toEqual({ campaignId: OTHER.id })
  })

  it('says what went wrong and does not refresh, so the button can be pressed again', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)

    render(<CarryForwardCard campaignId={CAMPAIGN_ID} sources={[TUTORIAL]} />)

    await user.click(screen.getByRole('button', { name: /Carry the table across/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That campaign is not yours to carry forward.',
    )
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Carry the table across/ })).toBeEnabled()
  })

  it('says so when the request never landed', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<CarryForwardCard campaignId={CAMPAIGN_ID} sources={[TUTORIAL]} />)

    await user.click(screen.getByRole('button', { name: /Carry the table across/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Check your connection and try again.',
    )
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('renders nothing when there is no table worth carrying', () => {
    const { container } = render(<CarryForwardCard campaignId={CAMPAIGN_ID} sources={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
