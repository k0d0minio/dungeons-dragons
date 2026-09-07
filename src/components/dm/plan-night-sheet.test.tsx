import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PlanNightSheet } from './plan-night-sheet'

// Starting a night from the Prep tab (`dm-chronology/prep-tab`): the roster's
// title-and-date form, in a bottom sheet, landing you on the night it made.

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: jest.fn() }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'

beforeEach(() => {
  push.mockClear()
  global.fetch = jest.fn()
})

function created(body: unknown) {
  ;(global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => body,
  })
}

describe('planning a night', () => {
  it('opens the form in a sheet without leaving the tab', async () => {
    const user = userEvent.setup()
    render(<PlanNightSheet campaignId={CAMPAIGN_ID} label="Plan another night" />)

    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Plan another night/ }))

    expect(await screen.findByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Which night')).toBeInTheDocument()
  })

  it('will not send a night with no title on it', async () => {
    const user = userEvent.setup()
    render(<PlanNightSheet campaignId={CAMPAIGN_ID} label="Plan a night" variant="button" />)

    await user.click(screen.getByRole('button', { name: 'Plan a night' }))

    expect(await screen.findByRole('button', { name: 'Start the night' })).toBeDisabled()
  })

  it('posts the title and the date, then opens the night it made', async () => {
    const user = userEvent.setup()
    created({ plan: { id: PLAN_ID, title: 'Session 4 — the shrine' } })

    render(<PlanNightSheet campaignId={CAMPAIGN_ID} label="Plan another night" />)
    await user.click(screen.getByRole('button', { name: /Plan another night/ }))
    await user.type(await screen.findByLabelText('Title'), 'Session 4 — the shrine')
    await user.click(screen.getByRole('button', { name: 'Start the night' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/session-plans`)
    expect(JSON.parse(init.body)).toEqual({
      title: 'Session 4 — the shrine',
      sessionDate: null,
    })

    // The reason to name a night is to prep it, so the tab hands over to the
    // plan screen rather than staying put.
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(`/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`),
    )
  })

  it('keeps the sheet open and says why when the write is refused', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Give the session a title' }),
    })

    render(<PlanNightSheet campaignId={CAMPAIGN_ID} label="Plan another night" />)
    await user.click(screen.getByRole('button', { name: /Plan another night/ }))
    await user.type(await screen.findByLabelText('Title'), 'x')
    await user.click(screen.getByRole('button', { name: 'Start the night' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Give the session a title')
    expect(push).not.toHaveBeenCalled()
  })

  it('says the connection dropped rather than pretending the night was saved', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('offline'))

    render(<PlanNightSheet campaignId={CAMPAIGN_ID} label="Plan another night" />)
    await user.click(screen.getByRole('button', { name: /Plan another night/ }))
    await user.type(await screen.findByLabelText('Title'), 'Session 4')
    await user.click(screen.getByRole('button', { name: 'Start the night' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection')
    expect(push).not.toHaveBeenCalled()
  })
})
