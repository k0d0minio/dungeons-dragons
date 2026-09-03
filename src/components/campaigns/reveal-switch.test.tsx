import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { RevealSwitch } from './reveal-switch'

// The DM's reveal switch (`dm-run-suite/reveal-controls`).
//
// What is worth pinning here is not the markup: it is that the control is one
// tap in both directions, that the sentence beside it says what the party will
// get, and that a failure leaves the switch where it was rather than lying
// about a reveal that did not happen.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENDPOINT = '/api/campaigns/7b2e4f1a/npcs/5a8b0c2d/reveal'

type Row = { id: string; revealedAt: Date | null }

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function renderSwitch(revealedAt: Date | null, onChanged = jest.fn()) {
  render(
    <RevealSwitch<Row>
      endpoint={ENDPOINT}
      revealedAt={revealedAt}
      noun="NPC"
      shows="their name and the description"
      unwrap={(body) => (body as { npc: Row }).npc}
      onChanged={onChanged}
    />,
  )

  return onChanged
}

describe('RevealSwitch', () => {
  it('states the consequence beside the switch, before anything is tapped', () => {
    renderSwitch(null)

    expect(screen.getByText('Only you can see this NPC so far.')).toBeInTheDocument()

    // The sentence names what actually crosses, and the honest latency — the
    // party's surfaces poll, so nothing here promises "instantly".
    expect(screen.getByText(/Revealing shows their name and the description/)).toBeInTheDocument()
    expect(screen.getByText(/within a few seconds/)).toBeInTheDocument()
    expect(screen.getByText(/notes stay yours/)).toBeInTheDocument()
  })

  it('reveals on one tap — no dialog to dismiss mid-scene', async () => {
    const user = userEvent.setup()
    const onChanged = renderSwitch(null)
    const revealed = { id: 'npc', revealedAt: new Date('2026-09-03T19:00:00.000Z') }
    mockFetch.mockResolvedValue(jsonResponse({ npc: revealed }))

    await user.click(screen.getByRole('button', { name: 'Reveal to players' }))

    expect(mockFetch).toHaveBeenCalledWith(ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed: true }),
    })

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(revealed))
    expect(mockToastSuccess).toHaveBeenCalledWith('Your players can see it now.')

    // One tap and no confirmation step: nothing else was waiting for an answer.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('un-reveals on one tap too, because the misclick has to be undoable', async () => {
    const user = userEvent.setup()
    // August, not September: `en-GB` renders September as "Sep" or "Sept"
    // depending on the runtime's ICU, which is not this test's business.
    const onChanged = renderSwitch(new Date('2026-08-30T19:00:00.000Z'))
    mockFetch.mockResolvedValue(jsonResponse({ npc: { id: 'npc', revealedAt: null } }))

    expect(screen.getByText('Your players can see this NPC.')).toBeInTheDocument()
    expect(screen.getByText(/Revealed 30 Aug 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Nothing you wrote is lost/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide it again' }))

    expect(mockFetch).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({ body: JSON.stringify({ revealed: false }) }),
    )
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ id: 'npc', revealedAt: null }))
    expect(mockToastSuccess).toHaveBeenCalledWith('Hidden again.')
  })

  it('says what went wrong and leaves the switch where it was', async () => {
    const user = userEvent.setup()
    const onChanged = renderSwitch(null)
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such NPC' }, 404))

    await user.click(screen.getByRole('button', { name: 'Reveal to players' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such NPC'))

    // Nothing was revealed, so nothing above this control is told otherwise.
    expect(onChanged).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Reveal to players' })).toBeEnabled()
  })

  it('survives the table wifi dropping mid-tap', async () => {
    const user = userEvent.setup()
    const onChanged = renderSwitch(null)
    mockFetch.mockRejectedValue(new Error('offline'))

    await user.click(screen.getByRole('button', { name: 'Reveal to players' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That did not send. Check your connection and try again.',
      ),
    )
    expect(onChanged).not.toHaveBeenCalled()
  })
})
