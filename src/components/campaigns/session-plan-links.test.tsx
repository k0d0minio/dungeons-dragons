import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { ResolvedSessionPlanLink, SessionPlanTargets } from '@/lib/db/session-plans'

import { SessionPlanLinks } from './session-plan-links'

// What tonight touches (`dm-prep-suite/session-plans`). The picker is a list of
// full-width buttons rather than a dropdown, and what is already linked is
// absent from it rather than greyed out — both are tested here, because both
// are the difference between usable and unusable with one thumb.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const BASE = `/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}/links`

const TARGETS: SessionPlanTargets = {
  npcs: [
    { id: 'npc-1', name: 'Halda the harbourmaster' },
    { id: 'npc-2', name: 'Brother Tems' },
  ],
  locations: [{ id: 'loc-1', name: 'Kelp Harbour' }],
  encounters: [{ id: 'enc-1', name: 'Ambush on the mole' }],
}

const LINKED: ResolvedSessionPlanLink = {
  id: 'link-1',
  kind: 'npc',
  targetId: 'npc-1',
  label: 'Halda the harbourmaster',
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function Harness({ initial = [] as ResolvedSessionPlanLink[] }) {
  const [links, setLinks] = require('react').useState(initial)

  return (
    <SessionPlanLinks
      campaignId={CAMPAIGN_ID}
      planId={PLAN_ID}
      links={links}
      targets={TARGETS}
      onLinksChange={setLinks}
    />
  )
}

beforeEach(() => {
  mockFetch.mockReset()
  mockToastError.mockReset()
})

describe('SessionPlanLinks', () => {
  it('says so when nothing is linked yet', () => {
    render(<Harness />)

    expect(screen.getByText(/Nothing linked yet/)).toBeInTheDocument()
  })

  it('links each kind through to the thing it points at', () => {
    render(
      <Harness
        initial={[
          LINKED,
          { id: 'link-2', kind: 'location', targetId: 'loc-1', label: 'Kelp Harbour' },
          { id: 'link-3', kind: 'encounter', targetId: 'enc-1', label: 'Ambush on the mole' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: /Halda/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/npcs`,
    )
    expect(screen.getByRole('link', { name: /Kelp Harbour/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/locations`,
    )
    // An encounter is its own screen, so the link goes to the fight itself.
    expect(screen.getByRole('link', { name: /Ambush/ })).toHaveAttribute(
      'href',
      '/dm/encounters/enc-1',
    )
  })

  it('opens a picker of full-width buttons and links what is tapped', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ link: { id: 'link-1' } }, 201))

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'NPCs' }))
    await user.click(screen.getByRole('button', { name: 'Brother Tems' }))

    expect(mockFetch).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'npc', targetId: 'npc-2' }),
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Brother Tems/ })).toBeInTheDocument(),
    )
  })

  it('closes the picker again on a second tap of the same kind', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'NPCs' }))
    expect(screen.getByRole('button', { name: 'Brother Tems' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'NPCs' }))
    expect(screen.queryByRole('button', { name: 'Brother Tems' })).not.toBeInTheDocument()
  })

  // Absent, not disabled: there is nothing to learn from a row you cannot press.
  it('leaves what is already linked out of the picker', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'NPCs' }))

    expect(screen.getByRole('button', { name: 'Brother Tems' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Halda the harbourmaster' }),
    ).not.toBeInTheDocument()
  })

  it('says so when a kind has nothing left to offer', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        initial={[{ id: 'l', kind: 'location', targetId: 'loc-1', label: 'Kelp Harbour' }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Places' }))

    expect(screen.getByText(/Nothing left to link here/)).toBeInTheDocument()
  })

  it('unlinks without touching what it pointed at', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

    render(<Harness initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'Unlink Halda the harbourmaster' }))

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/link-1`, { method: 'DELETE' })
    await waitFor(() => expect(screen.getByText(/Nothing linked yet/)).toBeInTheDocument())
  })

  it('reports why a link did not save, in the API’s own words', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such session plan' }, 404))

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Encounters' }))
    await user.click(screen.getByRole('button', { name: 'Ambush on the mole' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such session plan'))
  })

  it('says so when an unlink fails, and keeps the link on screen', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({}, 500))

    render(<Harness initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'Unlink Halda the harbourmaster' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: /Halda/ })).toBeInTheDocument()
  })

  it('says so when neither request leaves the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<Harness initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'Unlink Halda the harbourmaster' }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: 'Places' }))
    await user.click(screen.getByRole('button', { name: 'Kelp Harbour' }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(2))
  })

  it('keeps every tap target at thumb height', () => {
    render(<Harness initial={[LINKED]} />)

    const row = screen.getAllByRole('listitem')[0]
    expect(within(row).getByRole('link')).toHaveClass('min-h-11')
    expect(within(row).getByRole('button')).toHaveClass('size-11')
  })
})
