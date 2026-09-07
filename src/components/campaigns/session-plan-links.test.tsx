import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { ResolvedSessionPlanLink, SessionPlanTargets } from '@/lib/db/session-plans'
import type { SessionPlanLinkKind } from '@/lib/db/schema'

import { SessionPlanLinks } from './session-plan-links'

// One of a night's three link steps — the places, the people, or the fights
// (`dm-chronology/eight-steps-plan`). One kind per instance now, because the
// book names them as three steps and the plan screen gives each its own row and
// its own sheet.
//
// The picker is a list of full-width buttons rather than a dropdown, and what
// is already linked is absent from it rather than greyed out — both are tested
// here, because both are the difference between usable and unusable with one
// thumb.

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

function Harness({
  kind = 'npc',
  initial = [] as ResolvedSessionPlanLink[],
  targets = TARGETS,
}: {
  kind?: SessionPlanLinkKind
  initial?: ResolvedSessionPlanLink[]
  targets?: SessionPlanTargets
}) {
  const [links, setLinks] = useState(initial)

  return (
    <SessionPlanLinks
      campaignId={CAMPAIGN_ID}
      planId={PLAN_ID}
      kind={kind}
      links={links}
      targets={targets}
      onLinksChange={setLinks}
      footer={kind === 'encounter' ? <a href="/build">Build a fight for this night</a> : null}
    />
  )
}

beforeEach(() => {
  mockFetch.mockReset()
  mockToastError.mockReset()
})

describe('SessionPlanLinks', () => {
  it('offers this kind and no other, with the picker already open', () => {
    render(<Harness kind="npc" />)

    expect(screen.getByRole('button', { name: 'Halda the harbourmaster' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brother Tems' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kelp Harbour' })).not.toBeInTheDocument()
  })

  it('shows only this kind’s links, not the whole night’s', () => {
    render(
      <Harness
        kind="location"
        initial={[
          LINKED,
          { id: 'link-2', kind: 'location', targetId: 'loc-1', label: 'Kelp Harbour' },
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: /Kelp Harbour/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Halda/ })).not.toBeInTheDocument()
  })

  it('links each kind through to the thing it points at', () => {
    const { unmount } = render(<Harness kind="npc" initial={[LINKED]} />)

    expect(screen.getByRole('link', { name: /Halda/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/npcs`,
    )
    unmount()

    render(
      <Harness
        kind="location"
        initial={[{ id: 'l', kind: 'location', targetId: 'loc-1', label: 'Kelp Harbour' }]}
      />,
    )
    expect(screen.getByRole('link', { name: /Kelp Harbour/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/locations`,
    )
  })

  it('sends an encounter to the fight itself, which is its own screen', () => {
    render(
      <Harness
        kind="encounter"
        initial={[{ id: 'l', kind: 'encounter', targetId: 'enc-1', label: 'Ambush on the mole' }]}
      />,
    )

    expect(screen.getByRole('link', { name: /Ambush/ })).toHaveAttribute(
      'href',
      '/dm/encounters/enc-1',
    )
  })

  it('links what is tapped, of the kind the step is about', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ link: { id: 'link-9' } }, 201))

    render(<Harness kind="npc" />)

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

  // Absent, not disabled: there is nothing to learn from a row you cannot press.
  it('leaves what is already linked out of the picker', () => {
    render(<Harness kind="npc" initial={[LINKED]} />)

    expect(screen.getByRole('button', { name: 'Brother Tems' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Halda the harbourmaster' }),
    ).not.toBeInTheDocument()
  })

  it('says so when everything of this kind is already on the night', () => {
    render(
      <Harness
        kind="location"
        initial={[{ id: 'l', kind: 'location', targetId: 'loc-1', label: 'Kelp Harbour' }]}
      />,
    )

    expect(screen.getByText(/already on the night/)).toBeInTheDocument()
  })

  // A different sentence from the one above, because it is a different job:
  // nothing to pick because nothing is written yet is a prompt to go and write.
  it('says so when the campaign has nothing of this kind written yet', () => {
    render(<Harness kind="npc" targets={{ npcs: [], locations: [], encounters: [] }} />)

    expect(screen.getByText(/No NPCs written yet/)).toBeInTheDocument()
  })

  it('carries whatever the step puts under the picker — the way to build a fight', () => {
    render(<Harness kind="encounter" />)

    expect(screen.getByRole('link', { name: 'Build a fight for this night' })).toBeInTheDocument()
  })

  it('unlinks without touching what it pointed at', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

    render(<Harness kind="npc" initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'Unlink Halda the harbourmaster' }))

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/link-1`, { method: 'DELETE' })
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Halda/ })).not.toBeInTheDocument(),
    )
  })

  it('reports why a link did not save, in the API’s own words', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such session plan' }, 404))

    render(<Harness kind="encounter" />)

    await user.click(screen.getByRole('button', { name: 'Ambush on the mole' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such session plan'))
  })

  it('says so when an unlink fails, and keeps the link on screen', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({}, 500))

    render(<Harness kind="npc" initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'Unlink Halda the harbourmaster' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: /Halda/ })).toBeInTheDocument()
  })

  it('says so when neither request leaves the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<Harness kind="npc" initial={[LINKED]} />)

    await user.click(screen.getByRole('button', { name: 'Unlink Halda the harbourmaster' }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(1))

    await user.click(screen.getByRole('button', { name: 'Brother Tems' }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledTimes(2))
  })

  it('keeps every tap target at thumb height', () => {
    render(<Harness kind="npc" initial={[LINKED]} />)

    const row = screen.getAllByRole('listitem')[0]
    expect(within(row).getByRole('link')).toHaveClass('min-h-11')
    expect(within(row).getByRole('button')).toHaveClass('size-11')
  })
})
