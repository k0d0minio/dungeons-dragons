import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import type { CampaignSessionPlan } from '@/lib/db/schema'

import { SessionPlanRoster } from './session-plan-roster'

// The campaign's plans, newest night first (`dm-prep-suite/session-plans`).

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const SEPTEMBER: CampaignSessionPlan = {
  id: '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'Session 4 — the shrine',
  sessionDate: '2026-09-17',
  strongStart: null,
  treasure: null,
}

const OCTOBER: CampaignSessionPlan = {
  ...SEPTEMBER,
  id: '8f0a1b2c-3d4e-4f50-a1b2-c3d4e5f60718',
  title: 'Session 5 — the deep shelf',
  sessionDate: '2026-10-01',
  revealedAt: new Date('2026-09-20T19:00:00.000Z'),
}

const UNDATED: CampaignSessionPlan = {
  ...SEPTEMBER,
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  title: 'Someday — the wreck',
  sessionDate: null,
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('SessionPlanRoster', () => {
  // A plan list is chronological, not alphabetical: what a DM opens is the
  // night they are about to run or still writing.
  it('puts the next night first and the undated plans above the lot', () => {
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[SEPTEMBER, OCTOBER, UNDATED]} />)

    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByText('Someday — the wreck')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Session 5 — the deep shelf')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Session 4 — the shrine')).toBeInTheDocument()
  })

  it('reads the date as a human does, and says so when there is not one', () => {
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[SEPTEMBER, UNDATED]} />)

    expect(screen.getByText(/17 Sept 2026/)).toBeInTheDocument()
    expect(screen.getByText('No date yet')).toBeInTheDocument()
  })

  it('taps through to the night itself', () => {
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[SEPTEMBER]} />)

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${SEPTEMBER.id}`,
    )
  })

  // Announcing a night is `dm-run-suite/reveal-controls`' act. The badge
  // reports a column that exists; it must not imply a switch that does not.
  it('reports whether a night has been announced, and offers no way to announce one', () => {
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[SEPTEMBER, OCTOBER]} />)

    expect(screen.getByText('Not announced')).toBeInTheDocument()
    expect(screen.getByText('Announced')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /announce/i })).not.toBeInTheDocument()
  })

  it('says so when there are no plans yet', () => {
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    expect(screen.getByText(/No plans yet/)).toBeInTheDocument()
  })

  it('keeps the add form closed until it is asked for', async () => {
    const user = userEvent.setup()
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Which night')).toHaveAttribute('type', 'date')
  })

  it('starts a plan from a title alone', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ plan: SEPTEMBER }, 201))

    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))
    await user.type(screen.getByLabelText('Title'), SEPTEMBER.title)
    await user.click(screen.getByRole('button', { name: 'Add plan' }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/session-plans`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: SEPTEMBER.title, sessionDate: null }),
      }),
    )
    await waitFor(() => expect(screen.getByText(SEPTEMBER.title)).toBeInTheDocument())
  })

  it('sends the night when one was picked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ plan: SEPTEMBER }, 201))

    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))
    await user.type(screen.getByLabelText('Title'), 'Session 4')
    await user.type(screen.getByLabelText('Which night'), '2026-09-17')
    await user.click(screen.getByRole('button', { name: 'Add plan' }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/session-plans`,
      expect.objectContaining({
        body: JSON.stringify({ title: 'Session 4', sessionDate: '2026-09-17' }),
      }),
    )
  })

  it('will not submit a plan with no title', async () => {
    const user = userEvent.setup()
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))

    expect(screen.getByRole('button', { name: 'Add plan' })).toBeDisabled()
  })

  it('reports why a plan did not save, in the API’s own words', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Give the session a title' }, 400))

    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))
    await user.type(screen.getByLabelText('Title'), 'x')
    await user.click(screen.getByRole('button', { name: 'Add plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Give the session a title')
  })

  it('says so when the request never leaves the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))
    await user.type(screen.getByLabelText('Title'), 'x')
    await user.click(screen.getByRole('button', { name: 'Add plan' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not send')
  })

  it('drops what was typed when the form is cancelled', async () => {
    const user = userEvent.setup()
    render(<SessionPlanRoster campaignId={CAMPAIGN_ID} plans={[]} />)

    await user.click(screen.getByRole('button', { name: 'Plan a session' }))
    await user.type(screen.getByLabelText('Title'), 'Half a thought')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Plan a session' }))

    expect(screen.getByLabelText('Title')).toHaveValue('')
  })
})
