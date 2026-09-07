import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { HiddenReveal } from '@/lib/db/reveals'

import { PlayReveal, PlayRevealProvider, useRevealSheet } from './play-reveal'

// Revealing from the Play tab (`dm-chronology/play-tab`). What these pin: the
// row says what is still hidden, the sheet carries the *same* `RevealSwitch`
// the prep screens do, and a thing revealed leaves the list — so the count on
// the row and the count in the toolbar can never disagree.

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const HIDDEN: HiddenReveal[] = [
  { kind: 'npc', id: 'npc-1', name: 'Bram the innkeeper' },
  { kind: 'location', id: 'loc-1', name: 'Kelp Harbour' },
  { kind: 'handout', id: 'out-1', name: 'The ledger' },
]

function Board({ hidden = HIDDEN }: { hidden?: HiddenReveal[] }) {
  return (
    <PlayRevealProvider campaignId={CAMPAIGN_ID} initialHidden={hidden}>
      <PlayReveal />
      <FromTheToolbar />
    </PlayRevealProvider>
  )
}

/** Standing in for the toolbar's Reveal button, which opens the same sheet. */
function FromTheToolbar() {
  const { open } = useRevealSheet()

  return (
    <button type="button" onClick={open}>
      Reveal from the toolbar
    </button>
  )
}

describe('useRevealSheet', () => {
  it('refuses to be used outside the provider rather than silently doing nothing', () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<FromTheToolbar />)).toThrow(/PlayRevealProvider/)

    quiet.mockRestore()
  })
})

describe('PlayReveal', () => {
  it('is one row saying what the party still cannot see', () => {
    render(<Board />)

    expect(screen.getByText('1 NPC, 1 place and 1 handout still hidden')).toBeInTheDocument()
  })

  it('says so, and offers nothing to open, when nothing is hidden', () => {
    render(<Board hidden={[]} />)

    expect(screen.getByText(/Nothing hidden/)).toBeInTheDocument()
    expect(screen.queryByText(/still hidden/)).not.toBeInTheDocument()
  })

  it('opens the switches in a sheet, listing the hidden things by name alone', async () => {
    const user = userEvent.setup()
    render(<Board />)

    await user.click(screen.getByRole('button', { name: /still hidden/ }))

    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('Bram the innkeeper')).toBeInTheDocument()
    expect(within(sheet).getByText('Kelp Harbour')).toBeInTheDocument()
    expect(within(sheet).getByText('The ledger')).toBeInTheDocument()
    expect(within(sheet).getAllByRole('button', { name: 'Reveal to players' })).toHaveLength(3)
  })

  it('is the same sheet the toolbar opens, so one reveal updates both', async () => {
    const user = userEvent.setup()
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ npc: {} }) })
    global.fetch = fetchMock as unknown as typeof fetch

    render(<Board />)

    await user.click(screen.getByRole('button', { name: 'Reveal from the toolbar' }))

    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getAllByRole('button', { name: 'Reveal to players' })[0])

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/npcs/npc-1/reveal`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ revealed: true }) }),
    )

    // Revealed, so it is off the list — and the row behind the sheet has
    // already dropped it too.
    await waitFor(() => expect(screen.queryByText('Bram the innkeeper')).not.toBeInTheDocument())
    expect(screen.getByText('1 place and 1 handout still hidden')).toBeInTheDocument()
  })
})
