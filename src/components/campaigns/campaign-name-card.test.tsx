import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CampaignNameCard } from './campaign-name-card'

const refresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = jest.fn(async () => response as Response)
  global.fetch = fetchMock as unknown as typeof fetch
  return fetchMock
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('the campaign name card', () => {
  it('will not save until the name has actually changed', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({ ok: true, json: async () => ({ campaign: { name: 'x' } }) })

    render(<CampaignNameCard campaignId={CAMPAIGN_ID} name="The Tutorial" />)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    // Whitespace either side is not a change: the route trims it too.
    await user.type(screen.getByLabelText('Name'), ' ')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('patches the campaign itself, and refreshes what the server named', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetch({
      ok: true,
      json: async () => ({ campaign: { name: 'The Thursday Table' } }),
    })

    render(<CampaignNameCard campaignId={CAMPAIGN_ID} name="The Tutorial" />)

    const field = screen.getByLabelText('Name')
    await user.clear(field)
    await user.type(field, 'The Thursday Table')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ name: 'The Thursday Table' })

    // The name is server-rendered in three places behind this sheet.
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it("shows the route's own refusal where the tap landed", async () => {
    const user = userEvent.setup()
    mockFetch({
      ok: false,
      json: async () => ({ error: 'Keep the name under 120 characters' }),
    })

    render(<CampaignNameCard campaignId={CAMPAIGN_ID} name="The Tutorial" />)

    const field = screen.getByLabelText('Name')
    await user.clear(field)
    await user.type(field, 'Something else')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Keep the name under 120 characters')
    expect(refresh).not.toHaveBeenCalled()
  })
})
