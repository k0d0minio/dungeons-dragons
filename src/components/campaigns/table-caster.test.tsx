import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TableCaster, type TableCasterContent } from './table-caster'

// The DM's remote (`dm-run-suite/table-screen-cast`). One page that drives the
// other screen: what is on it now, everything that can go on it next, and the
// link that opens it. What matters here is that a tap sends a *pointer* — never
// content — that the live row is marked so re-casting reads as a no-op, and
// that the copy says out loud what showing prep costs: it reveals it.

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

jest.mock('@/lib/srd/hooks', () => {
  const actual = jest.requireActual('@/lib/srd/hooks')
  return {
    ...actual,
    useMonsters: () => ({
      monsters: [
        { index: 'goblin', name: 'Goblin', challengeRatingText: '1/4', type: 'Fey' },
        { index: 'owlbear', name: 'Owlbear', challengeRatingText: '3', type: 'Monstrosity' },
      ],
      isLoading: false,
      error: undefined,
    }),
    useSpells: () => ({
      spells: [{ index: 'fireball', name: 'Fireball', level: 3 }],
      isLoading: false,
      error: undefined,
    }),
  }
})

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NPC_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const CHARACTER_ID = '9f8e7d6c-5b4a-4392-8172-6a5b4c3d2e1f'
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

const CONTENT: TableCasterContent = {
  characters: [
    {
      target: { kind: 'character', id: CHARACTER_ID },
      label: 'Vex Ashbrand',
      detail: 'Level 5 Rogue',
    },
  ],
  npcs: [
    {
      target: { kind: 'npc', id: NPC_ID },
      label: 'Harbourmaster Vane',
      detail: 'Runs the docks, and is bought',
      hidden: true,
    },
  ],
  locations: [],
  handouts: [],
}

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function respondWith(campaign: Record<string, unknown>) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ campaign }),
  } as Response)
}

function renderCaster(overrides: Partial<Parameters<typeof TableCaster>[0]> = {}) {
  return render(
    <TableCaster
      campaignId={CAMPAIGN_ID}
      campaignName="The Rime of the Frostmaiden"
      initialToken={TOKEN}
      initialSpotlight={null}
      content={CONTENT}
      {...overrides}
    />,
  )
}

describe('TableCaster', () => {
  it('casts a pointer, never content', async () => {
    const user = userEvent.setup()
    respondWith({ tableSpotlight: { kind: 'npc', id: NPC_ID, at: '2026-09-07T19:00:00.000Z' } })

    renderCaster()

    await user.click(screen.getByRole('button', { name: /Harbourmaster Vane/ }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/spotlight`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ spotlight: { kind: 'npc', id: NPC_ID } }),
      }),
    )

    // And the row it cast is now the live one, so tapping again reads as a
    // no-op rather than as an invitation.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Harbourmaster Vane/ })).toHaveTextContent(
        'On screen',
      ),
    )
  })

  it('says once, on the prep card, that showing something reveals it', async () => {
    renderCaster()

    // The consequence lives on the control rather than in a dialog that would
    // be dismissed unread — the reveal switch's rule, applied here.
    expect(screen.getByText(/reveals it/)).toBeInTheDocument()
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('clears the screen with an explicit null', async () => {
    const user = userEvent.setup()
    respondWith({ tableSpotlight: null })

    renderCaster({
      initialSpotlight: { kind: 'handout', id: NPC_ID, at: '2026-09-07T19:00:00.000Z' },
    })

    expect(screen.getByText(/Handout — the table is looking at it/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear the screen' }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/spotlight`,
      expect.objectContaining({ body: JSON.stringify({ spotlight: null }) }),
    )
    await waitFor(() => expect(screen.getByText(/^Nothing\./)).toBeInTheDocument())
  })

  it('finds a monster by name and casts it by index', async () => {
    const user = userEvent.setup()
    respondWith({ tableSpotlight: { kind: 'monster', index: 'owlbear', at: 'now' } })

    renderCaster()

    // Three hundred stat blocks is not a list to scroll past the handouts, so
    // nothing is offered until there is something to match.
    expect(screen.getByText('Type a name to find it.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Find a monster'), 'owl')
    await user.click(screen.getByRole('button', { name: /Owlbear/ }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/spotlight`,
      expect.objectContaining({
        body: JSON.stringify({ spotlight: { kind: 'monster', index: 'owlbear' } }),
      }),
    )
  })

  it('lists the conditions without a search, because there are fifteen', async () => {
    const user = userEvent.setup()

    renderCaster()

    await user.click(screen.getByRole('button', { name: 'Conditions' }))

    expect(screen.getByRole('button', { name: /Prone/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Find a monster')).not.toBeInTheDocument()
  })

  it('offers a link before it offers anything to cast', async () => {
    const user = userEvent.setup()
    respondWith({ tableToken: TOKEN })

    renderCaster({ initialToken: null })

    expect(
      screen.getByText(/No live screen for The Rime of the Frostmaiden yet/),
    ).toBeInTheDocument()
    // Nothing is castable until there is a screen to cast onto.
    expect(screen.getByRole('button', { name: /Vex Ashbrand/ })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Make a link' }))

    expect(mockFetch).toHaveBeenCalledWith(`/api/campaigns/${CAMPAIGN_ID}/table-token`, {
      method: 'POST',
    })
    await waitFor(() => expect(screen.getByText(`/table/${TOKEN}`)).toBeInTheDocument())
  })

  it('keeps the screen as it was when the cast does not land', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)

    renderCaster()

    await user.click(screen.getByRole('button', { name: /Vex Ashbrand/ }))

    const { toast } = jest.requireMock('sonner') as { toast: { error: jest.Mock } }
    expect(toast.error).toHaveBeenCalled()
    expect(screen.getByText(/^Nothing\./)).toBeInTheDocument()
  })

  it('names the party card for what it shows, and what it does not', async () => {
    renderCaster()

    expect(screen.getByText('Your table')).toBeInTheDocument()
    expect(screen.getByText(/No coins, no bags, no notes/)).toBeInTheDocument()
  })
})
