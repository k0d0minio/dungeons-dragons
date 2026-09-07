import { render, screen, waitFor, within } from '@testing-library/react'
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

import { SessionPlanSteps } from './session-plan-steps'

// One night's prep as the Lazy DM's eight steps
// (`dm-chronology/eight-steps-plan`).
//
// What is on trial: the eight rows in the book's order, each saying where it
// stands; the empty ones calling themselves out; each row opening that step's
// editor and nothing else; and the two properties this screen inherited and
// must not lose — **the strong start and the treasure stay behind the DM-only
// marking**, and announcing a night still carries only the title and the date.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const BACK = `/dm/campaigns/${CAMPAIGN_ID}/session-plans`
const PLAN_URL = `/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`

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

const EMPTY_PLAN: CampaignSessionPlan = {
  ...PLAN,
  sessionDate: null,
  strongStart: null,
  treasure: null,
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

const LINKS: ResolvedSessionPlanLink[] = [
  { id: 'link-1', kind: 'npc', targetId: 'npc-1', label: 'Halda the harbourmaster' },
  { id: 'link-2', kind: 'location', targetId: 'loc-1', label: 'Kelp Harbour' },
  { id: 'link-3', kind: 'encounter', targetId: 'enc-1', label: 'Ambush on the mole' },
]

const TARGETS: SessionPlanTargets = {
  npcs: [
    { id: 'npc-1', name: 'Halda the harbourmaster' },
    { id: 'npc-2', name: 'Brother Tems' },
  ],
  locations: [{ id: 'loc-1', name: 'Kelp Harbour' }],
  encounters: [{ id: 'enc-1', name: 'Ambush on the mole' }],
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function steps({
  plan = PLAN,
  items = [SCENE, SECRET],
  links = LINKS,
  party = { total: 5, notReady: 0 },
}: {
  plan?: CampaignSessionPlan
  items?: SessionPlanItem[]
  links?: ResolvedSessionPlanLink[]
  party?: { total: number; notReady: number }
} = {}) {
  return (
    <SessionPlanSteps
      campaignId={CAMPAIGN_ID}
      plan={plan}
      items={items}
      links={links}
      targets={TARGETS}
      party={party}
      backHref={BACK}
    />
  )
}

/** The unwritten night: nothing on the plan, nobody at the table. */
function barren() {
  return steps({ plan: EMPTY_PLAN, items: [], links: [], party: { total: 0, notReady: 0 } })
}

/** Open one step's sheet by tapping its row. */
async function openStep(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name }))
}

beforeEach(() => {
  mockFetch.mockReset()
  mockToastError.mockReset()
  mockPush.mockReset()
  mockRefresh.mockReset()
})

describe('SessionPlanSteps', () => {
  it('leads with the eight steps in the book’s order, numbered', () => {
    render(steps())

    const [group] = screen.getAllByRole('list')
    const headings = within(group)
      .getAllByRole('listitem')
      .map((row) => row.textContent)

    expect(headings[0]).toMatch(/^1\. Review the characters/)
    expect(headings[1]).toMatch(/^2\. A strong start/)
    expect(headings[2]).toMatch(/^3\. Potential scenes/)
    expect(headings[3]).toMatch(/^4\. Secrets and clues/)
    expect(headings[4]).toMatch(/^5\. Fantastic locations/)
    expect(headings[5]).toMatch(/^6\. Important NPCs/)
    expect(headings[6]).toMatch(/^7\. Monsters/)
    expect(headings[7]).toMatch(/^8\. Treasure/)
  })

  it('counts the steps that are ready, and names what is left', () => {
    render(steps({ plan: { ...PLAN, treasure: null }, party: { total: 5, notReady: 1 } }))

    expect(screen.getByText('6 of 8 steps ready')).toBeInTheDocument()
    expect(screen.getByText(/still to do: the characters and treasure/)).toBeInTheDocument()
  })

  it('says a fully written night is ready to run', () => {
    render(steps())

    expect(screen.getByText('8 of 8 steps ready')).toBeInTheDocument()
    expect(screen.getByText(/ready to run/)).toBeInTheDocument()
  })

  it('says where each step stands, in words rather than in colour', () => {
    render(steps({ party: { total: 5, notReady: 1 } }))

    expect(screen.getByText('5 characters · 1 not ready')).toBeInTheDocument()
    expect(screen.getByText('1 scene')).toBeInTheDocument()
    expect(screen.getByText('1 written · aim for about 10')).toBeInTheDocument()
    expect(screen.getByText('Kelp Harbour')).toBeInTheDocument()
    expect(screen.getByText('Halda the harbourmaster')).toBeInTheDocument()
    expect(screen.getByText('Ambush on the mole')).toBeInTheDocument()
  })

  // A step with nothing in it is the next thing to do, and the rail is what
  // says so — but never by colour alone.
  it('marks an empty step as the next thing to do', () => {
    render(barren())

    const strongStart = screen.getByText('2. A strong start')
    expect(strongStart).toHaveClass('text-primary')
    expect(screen.getAllByText('Empty')).toHaveLength(2)

    const scenes = screen.getByText('3. Potential scenes')
    expect(scenes).toHaveClass('text-primary')
  })

  it('does not colour a step that is done', () => {
    render(steps())

    expect(screen.getByText('2. A strong start')).not.toHaveClass('text-primary')
  })

  it('sends the first step to the party, where the characters are reviewed', () => {
    render(steps())

    expect(screen.getByRole('link', { name: /Review the characters/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/party`,
    )
  })

  it('says in words that Play is where these get ticked', () => {
    render(steps())

    expect(screen.getByText(/On the night, Play shows this plan/)).toBeInTheDocument()
  })

  describe('one step at a time', () => {
    it('keeps every editor closed until its row is tapped', () => {
      render(steps())

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Strong start')).not.toBeInTheDocument()
    })

    it('opens the strong start behind the DM-only marking', async () => {
      const user = userEvent.setup()
      render(steps())

      await openStep(user, /A strong start/)

      const sheet = screen.getByRole('dialog')
      expect(within(sheet).getByText('DM only')).toBeInTheDocument()
      expect(within(sheet).getByLabelText('Strong start')).toHaveValue(PLAN.strongStart)
    })

    it('saves one step’s field on its own and closes the sheet', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(jsonResponse({ plan: { ...PLAN, treasure: 'A bag of teeth.' } }))

      render(steps())

      await openStep(user, /Treasure/)
      const field = screen.getByLabelText('Treasure')
      await user.clear(field)
      await user.type(field, 'A bag of teeth.')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(mockFetch).toHaveBeenCalledWith(
        PLAN_URL,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ treasure: 'A bag of teeth.' }),
        }),
      )
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('collapses a cleared field to null rather than an empty string', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(jsonResponse({ plan: EMPTY_PLAN }))

      render(steps())

      await openStep(user, /Treasure/)
      await user.clear(screen.getByLabelText('Treasure'))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(mockFetch).toHaveBeenCalledWith(
        PLAN_URL,
        expect.objectContaining({ body: JSON.stringify({ treasure: null }) }),
      )
    })

    it('reports why a step did not save, in the API’s own words', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(jsonResponse({ error: 'That is too long' }, 400))

      render(steps())

      await openStep(user, /A strong start/)
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('That is too long'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('opens the scenes as the checklist, not as a form', async () => {
      const user = userEvent.setup()
      render(steps())

      await openStep(user, /Potential scenes/)

      const sheet = screen.getByRole('dialog')
      expect(within(sheet).getByText(SCENE.body)).toBeInTheDocument()
      expect(within(sheet).queryByText(SECRET.body)).not.toBeInTheDocument()
      expect(within(sheet).getByRole('button', { name: 'Arrange' })).toBeInTheDocument()
    })

    it('opens each link step on its own kind and nothing else', async () => {
      const user = userEvent.setup()
      render(steps())

      await openStep(user, /Important NPCs/)

      const sheet = screen.getByRole('dialog')
      expect(within(sheet).getByRole('link', { name: /Halda/ })).toBeInTheDocument()
      expect(within(sheet).queryByRole('link', { name: /Kelp Harbour/ })).not.toBeInTheDocument()
      // Everything else of this kind is still on offer.
      expect(within(sheet).getByRole('button', { name: 'Brother Tems' })).toBeInTheDocument()
    })

    it('hands the monsters step the builder, carrying the night', async () => {
      const user = userEvent.setup()
      render(steps())

      await openStep(user, /Monsters/)

      expect(
        within(screen.getByRole('dialog')).getByRole('link', {
          name: 'Build a fight for this night',
        }),
      ).toHaveAttribute('href', `/dm/campaigns/${CAMPAIGN_ID}/encounters/new?plan=${PLAN_ID}`)
    })

    it('closes one step’s sheet when another is opened', async () => {
      const user = userEvent.setup()
      render(steps())

      await openStep(user, /A strong start/)
      expect(screen.getByLabelText('Strong start')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await openStep(user, /Treasure/)
      expect(screen.queryByLabelText('Strong start')).not.toBeInTheDocument()
      expect(screen.getByLabelText('Treasure')).toBeInTheDocument()
    })
  })

  describe('the night itself', () => {
    it('shows the date, and edits the title and date together', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(jsonResponse({ plan: { ...PLAN, title: 'Session 5' } }))

      render(steps())

      await user.click(screen.getByRole('button', { name: /Title and date/ }))

      const title = screen.getByLabelText('Title')
      await user.clear(title)
      await user.type(title, 'Session 5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(mockFetch).toHaveBeenCalledWith(
        PLAN_URL,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ title: 'Session 5', sessionDate: '2026-09-17' }),
        }),
      )
    })

    it('will not save a night with no title', async () => {
      const user = userEvent.setup()
      render(steps())

      await user.click(screen.getByRole('button', { name: /Title and date/ }))
      await user.clear(screen.getByLabelText('Title'))

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('says whether the night is announced, and announces it through its own route', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(
        jsonResponse({ plan: { ...PLAN, revealedAt: '2026-09-10T09:00:00.000Z' } }),
      )

      render(steps())

      expect(screen.getByText('Not announced')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Announce the night/ }))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Reveal to players' }),
      )

      expect(mockFetch).toHaveBeenCalledWith(
        `${PLAN_URL}/reveal`,
        expect.objectContaining({ method: 'PUT' }),
      )
      await waitFor(() => expect(screen.getByText('Announced')).toBeInTheDocument())
    })

    it('deletes the night behind a confirmation and leaves for the list', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

      render(steps())

      await user.click(screen.getByRole('button', { name: /Delete this night/ }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(mockFetch).toHaveBeenCalledWith(PLAN_URL, { method: 'DELETE' })
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith(BACK))
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('says so when a delete fails, and stays on the night', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(jsonResponse({}, 500))

      render(steps())

      await user.click(screen.getByRole('button', { name: /Delete this night/ }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => expect(mockToastError).toHaveBeenCalled())
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
