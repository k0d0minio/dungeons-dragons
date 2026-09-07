import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { CampaignSessionPlan, SessionPlanItem } from '@/lib/db/schema'
import { formatSessionDate } from '@/lib/notes/schema'

import { NoPlanTonight, PlayPlan } from './play-plan'

// Tonight's plan on the Play tab (`dm-chronology/play-tab`). Three properties:
// the strong start is printed in full behind the DM-only marking, the scenes
// and the secrets are the mid-session tick rows `session-plans` established,
// and "make this tonight's plan" writes the date rather than a column.

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a'
const TODAY = '2026-09-10'

const PLAN: CampaignSessionPlan = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  title: 'Session 3 — the lighthouse',
  sessionDate: TODAY,
  strongStart: 'The lighthouse is dark, and the Marigold is already on the rocks.',
  treasure: 'A smuggler’s ledger worth 50 gp to the right person.',
  revealedAt: null,
  createdAt: new Date('2026-09-05T10:00:00.000Z'),
  updatedAt: new Date('2026-09-05T10:00:00.000Z'),
}

function item(overrides: Partial<SessionPlanItem>): SessionPlanItem {
  return {
    id: 'item-1',
    planId: PLAN_ID,
    kind: 'scene',
    body: 'The harbourmaster lies about the Marigold',
    sortOrder: 0,
    checkedAt: null,
    createdAt: new Date('2026-09-05T10:00:00.000Z'),
    updatedAt: new Date('2026-09-05T10:00:00.000Z'),
    ...overrides,
  }
}

const ITEMS = [
  item({ id: 'scene-1', kind: 'scene' }),
  item({ id: 'secret-1', kind: 'secret', body: 'The village pays the smugglers' }),
]

describe('PlayPlan', () => {
  it('prints the strong start in full, behind the DM-only marking', () => {
    render(<PlayPlan campaignId={CAMPAIGN_ID} plan={PLAN} initialItems={ITEMS} today={TODAY} />)

    // The marking is `SecretLayer`, the same component every prep screen uses:
    // a phone turned round mid-sentence must not show this by accident.
    const secret = screen.getByRole('heading', { name: 'Behind the screen' }).closest('section')!
    expect(within(secret).getByText(PLAN.strongStart!)).toBeInTheDocument()
  })

  it('says nothing is written rather than showing an empty secret block', () => {
    render(
      <PlayPlan
        campaignId={CAMPAIGN_ID}
        plan={{ ...PLAN, strongStart: null }}
        initialItems={[]}
        today={TODAY}
      />,
    )

    expect(screen.queryByRole('heading', { name: 'Behind the screen' })).not.toBeInTheDocument()
    expect(screen.getByText(/No strong start written/)).toBeInTheDocument()
  })

  it('splits the lines into the scenes and the secrets, as one-tap rows', () => {
    render(<PlayPlan campaignId={CAMPAIGN_ID} plan={PLAN} initialItems={ITEMS} today={TODAY} />)

    expect(screen.getByRole('heading', { name: 'Potential scenes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Secrets & clues' })).toBeInTheDocument()

    const scene = screen.getByRole('button', { name: /harbourmaster lies/ })
    expect(scene).toHaveAttribute('aria-pressed', 'false')
  })

  it('says the night is tonight, and offers nothing to fix', () => {
    render(<PlayPlan campaignId={CAMPAIGN_ID} plan={PLAN} initialItems={ITEMS} today={TODAY} />)

    expect(screen.getByText('Tonight')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Make this tonight’s plan/ }),
    ).not.toBeInTheDocument()
  })

  it('puts today’s date on a plan that is being run early, and no column with it', async () => {
    const user = userEvent.setup()
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plan: { ...PLAN, sessionDate: TODAY } }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(
      <PlayPlan
        campaignId={CAMPAIGN_ID}
        plan={{ ...PLAN, sessionDate: null }}
        initialItems={ITEMS}
        today={TODAY}
      />,
    )

    expect(screen.getByText('No date on it yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Make this tonight’s plan/ }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ sessionDate: TODAY }) }),
    )

    await waitFor(() => expect(screen.getByText('Tonight')).toBeInTheDocument())
  })

  it('leaves the date alone and says so when the write is refused', async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'That change is not valid' }),
    }) as unknown as typeof fetch

    render(
      <PlayPlan
        campaignId={CAMPAIGN_ID}
        plan={{ ...PLAN, sessionDate: null }}
        initialItems={ITEMS}
        today={TODAY}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Make this tonight’s plan/ }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That change is not valid'))
    expect(screen.getByText('No date on it yet')).toBeInTheDocument()
  })

  it('keeps the plan as it was when the request never lands', async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch

    render(
      <PlayPlan
        campaignId={CAMPAIGN_ID}
        plan={{ ...PLAN, sessionDate: null }}
        initialItems={ITEMS}
        today={TODAY}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Make this tonight’s plan/ }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('That did not send. Check your connection.'),
    )
  })

  it('ticks a scene off in place, against the plan’s own item route', async () => {
    const user = userEvent.setup()
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ item: { ...ITEMS[0], checkedAt: new Date() } }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<PlayPlan campaignId={CAMPAIGN_ID} plan={PLAN} initialItems={ITEMS} today={TODAY} />)

    await user.click(screen.getByRole('button', { name: /harbourmaster lies/ }))

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}/items/scene-1`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ checked: true }) }),
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /harbourmaster lies/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
  })

  it('offers the fix on a plan dated for another night, and dates it plainly', () => {
    render(
      <PlayPlan
        campaignId={CAMPAIGN_ID}
        plan={{ ...PLAN, sessionDate: '2026-09-17' }}
        initialItems={ITEMS}
        today={TODAY}
      />,
    )

    expect(screen.getByText(formatSessionDate('2026-09-17'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Make this tonight’s plan/ })).toBeInTheDocument()
  })

  it('links on to the whole plan for what this screen leaves out', () => {
    render(<PlayPlan campaignId={CAMPAIGN_ID} plan={PLAN} initialItems={ITEMS} today={TODAY} />)

    expect(screen.getByRole('link', { name: /The whole plan/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`,
    )
  })
})

describe('NoPlanTonight', () => {
  it('is one line and the way to Prep', () => {
    render(<NoPlanTonight campaignId={CAMPAIGN_ID} />)

    expect(screen.getByText(/Nothing prepped for tonight/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan a night in Prep' })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-plans`,
    )
  })
})
