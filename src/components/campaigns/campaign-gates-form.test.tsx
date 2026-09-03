import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { GATES } from '@/lib/campaigns/gates'

import { CampaignGatesForm } from './campaign-gates-form'

const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

function ok() {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ campaign: { id: CAMPAIGN_ID } }),
  } as Response)
}

function sentBody() {
  const call = mockFetch.mock.calls.at(-1)
  return JSON.parse(String((call?.[1] as RequestInit).body))
}

beforeEach(() => {
  ok()
})

describe('CampaignGatesForm', () => {
  it('lists every gate with what it adds for the players', () => {
    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={null} />)

    for (const gate of GATES) {
      expect(screen.getByRole('switch', { name: gate.label })).toBeInTheDocument()
      expect(screen.getByText(gate.adds)).toBeInTheDocument()
    }
  })

  it('reads a campaign that has never been here as everything off', () => {
    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={null} />)

    for (const gate of GATES) {
      expect(screen.getByRole('switch', { name: gate.label })).not.toBeChecked()
      // The other half of the choice: what the players have while it is off.
      expect(screen.getByText(gate.whileOff)).toBeInTheDocument()
    }
  })

  it('shows a stored gate as on, and says so instead of the off line', () => {
    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={{ conditions: true }} />)

    expect(screen.getByRole('switch', { name: 'Conditions and exhaustion' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Coins and carrying' })).not.toBeChecked()
    expect(screen.getAllByText('On for this campaign.')).toHaveLength(1)
  })

  it('promises, on the screen, that nothing is lost by switching one off', () => {
    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={null} />)

    expect(screen.getByText(/everything underneath keeps being tracked/i)).toBeInTheDocument()
  })

  it('sends the whole set on a toggle, not just the one that moved', async () => {
    const user = userEvent.setup()
    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={{ currency: true }} />)

    await user.click(screen.getByRole('switch', { name: 'Conditions and exhaustion' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/gates`)
    expect(init.method).toBe('PUT')
    expect(sentBody()).toEqual({ gates: { currency: true, conditions: true } })
  })

  it('switches one back off without disturbing the others', async () => {
    const user = userEvent.setup()
    render(
      <CampaignGatesForm campaignId={CAMPAIGN_ID} gates={{ currency: true, conditions: true }} />,
    )

    await user.click(screen.getByRole('switch', { name: 'Coins and carrying' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(sentBody()).toEqual({ gates: { currency: false, conditions: true } })
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Off. It is hidden on their sheets — nothing they had is gone.',
    )
  })

  it('puts the switch back and says so when the write is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No such campaign' }),
    } as Response)

    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={null} />)
    const gate = screen.getByRole('switch', { name: 'Class resources' })

    await user.click(gate)

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such campaign'))
    expect(gate).not.toBeChecked()
  })

  it('puts the switch back when the request never lands', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<CampaignGatesForm campaignId={CAMPAIGN_ID} gates={null} />)
    const gate = screen.getByRole('switch', { name: 'Choosing spells each day' })

    await user.click(gate)

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That switch did not save. Check your connection.',
      ),
    )
    expect(gate).not.toBeChecked()
  })
})
