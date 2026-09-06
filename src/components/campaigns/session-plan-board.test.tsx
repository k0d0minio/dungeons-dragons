import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

import { toast } from 'sonner'

import type { CampaignSessionPlan, SessionPlanItem } from '@/lib/db/schema'
import type { ResolvedSessionPlanLink, SessionPlanTargets } from '@/lib/db/session-plans'

import { SessionPlanBoard } from './session-plan-board'

// One night's prep (`dm-prep-suite/session-plans`).
//
// The five sections are on trial here, and so is the split: **the strong start
// and the treasure sit behind the DM-only marking**, because announcing a night
// tells the party when it is and nothing about what happens on it.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const BACK = `/dm/campaigns/${CAMPAIGN_ID}/session-plans`

const PLAN: CampaignSessionPlan = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'Session 4 — the shrine',
  sessionDate: '2026-09-17',
  strongStart: 'The tide is out further than it has ever been, and something is standing in it.',
  treasure: 'A silver holy symbol, tarnished black.',
}

const SCENE: SessionPlanItem = {
  id: '11111111-2222-4333-8444-555555555555',
  planId: PLAN_ID,
  kind: 'scene',
  body: 'The harbourmaster tries to stop them leaving',
  sortOrder: 0,
  checkedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
}

const SECRET: SessionPlanItem = {
  ...SCENE,
  id: '66666666-7777-4888-8999-aaaaaaaaaaaa',
  kind: 'secret',
  body: 'The lighthouse is kept dark on purpose',
}

const LINK: ResolvedSessionPlanLink = {
  id: 'link-1',
  kind: 'npc',
  targetId: 'npc-1',
  label: 'Halda the harbourmaster',
}

const TARGETS: SessionPlanTargets = {
  npcs: [{ id: 'npc-1', name: 'Halda the harbourmaster' }],
  locations: [],
  encounters: [],
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function board(plan: CampaignSessionPlan = PLAN) {
  return (
    <SessionPlanBoard
      campaignId={CAMPAIGN_ID}
      plan={plan}
      items={[SCENE, SECRET]}
      links={[LINK]}
      targets={TARGETS}
      backHref={BACK}
    />
  )
}

beforeEach(() => {
  mockFetch.mockReset()
  mockToastError.mockReset()
  mockPush.mockReset()
  mockRefresh.mockReset()
})

describe('SessionPlanBoard', () => {
  it('shows all five sections of the night', () => {
    render(board())

    expect(screen.getByText(/The tide is out/)).toBeInTheDocument()
    expect(screen.getByText(/tarnished black/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Potential scenes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Secrets & clues' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tonight touches' })).toBeInTheDocument()
  })

  it('sorts each line into its own list and nowhere else', () => {
    render(board())

    // One tickable row per line, one list each, no line in both.
    expect(screen.getByRole('button', { name: SCENE.body })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: SECRET.body })).toBeInTheDocument()
    expect(screen.getAllByText('0/1')).toHaveLength(2)
  })

  // The safety property: a DM reads this with players either side of him.
  it('marks the strong start and the treasure as the DM’s half', () => {
    render(board())

    const marking = screen.getByRole('heading', { name: 'Behind the screen' }).closest('section')

    expect(marking).not.toBeNull()
    expect(marking).toHaveTextContent(/The tide is out/)
    expect(marking).toHaveTextContent(/tarnished black/)
    expect(screen.getByLabelText('DM only — never shown to players')).toBeInTheDocument()
  })

  it('shows the date in front of the marking, because that is all that is announced', () => {
    render(board())

    const marking = screen.getByRole('heading', { name: 'Behind the screen' }).closest('section')

    expect(screen.getByText(/17 Sept 2026/)).toBeInTheDocument()
    expect(marking).not.toHaveTextContent(/Sept 2026/)
  })

  // Announcing (`first-table/announce-the-night`): the reveal switch every
  // other prep entity carries, with the consequence written beside it.
  it('reports whether the night is announced, and carries the switch that announces it', () => {
    render(board())

    expect(screen.getByText('Not announced')).toBeInTheDocument()
    expect(screen.getByText('Only you can see this night so far.')).toBeInTheDocument()
    expect(
      screen.getByText(/Revealing shows the title and the date — nothing that is written here/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal to players' })).toBeInTheDocument()
  })

  it('announces the night through its own reveal route, and the badge follows', async () => {
    const user = userEvent.setup()
    const revealedAt = new Date('2026-09-05T19:00:00.000Z')
    mockFetch.mockResolvedValue(jsonResponse({ plan: { ...PLAN, revealedAt } }))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Reveal to players' }))

    await waitFor(() => expect(screen.getByText('Announced')).toBeInTheDocument())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}/reveal`)
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ revealed: true })
    expect(screen.getByText('Your players can see this night.')).toBeInTheDocument()
  })

  it('keeps the switch out of the editor — announcing is not a form save', async () => {
    const user = userEvent.setup()
    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.queryByRole('button', { name: 'Reveal to players' })).not.toBeInTheDocument()
  })

  it('nudges for a strong start when nothing has been written yet', () => {
    render(board({ ...PLAN, strongStart: null, treasure: null }))

    expect(screen.getByText(/No strong start yet/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Behind the screen' })).not.toBeInTheDocument()
  })

  // The editor is behind a button so a stray touch mid-session cannot land in
  // the middle of the strong start.
  it('keeps the editor closed until it is asked for', async () => {
    const user = userEvent.setup()
    render(board())

    expect(screen.queryByLabelText('Strong start')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Title')).toHaveValue(PLAN.title)
    expect(screen.getByLabelText('Strong start')).toHaveValue(PLAN.strongStart)
    expect(screen.getByLabelText('Which night')).toHaveValue('2026-09-17')
  })

  it('saves an edit and closes the editor', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ plan: { ...PLAN, treasure: 'Nothing but salt' } }))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const treasure = screen.getByLabelText('Treasure')
    await user.clear(treasure)
    await user.type(treasure, 'Nothing but salt')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    await waitFor(() => expect(screen.getByText('Nothing but salt')).toBeInTheDocument())
  })

  it('collapses a cleared field to null rather than an empty string', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ plan: { ...PLAN, treasure: null } }))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Treasure'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.treasure).toBeNull()
  })

  it('reports why an edit did not save, in the API’s own words', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Nothing to change' }, 400))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Nothing to change'))
  })

  it('says so when the save never leaves the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(expect.stringMatching(/did not send/)),
    )
  })

  it('drops the edit on cancel', async () => {
    const user = userEvent.setup()
    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Renamed')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByLabelText('Title')).toHaveValue(PLAN.title)
  })

  it('will not save a plan with no title', async () => {
    const user = userEvent.setup()
    render(board())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Title'))

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('deletes the plan behind a confirmation and leaves for the list', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(
      await screen.findByText(/The scenes, the secrets and the links go with it/),
    ).toBeInTheDocument()

    // Radix hides the page behind the dialog from the accessibility tree, so
    // this is the dialog's own Delete and not the trigger that opened it.
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(BACK))
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('says so when a delete fails, and stays on the plan', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({}, 404))

    render(board())

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('That plan is already gone.'))
    expect(mockPush).not.toHaveBeenCalled()
  })
})
