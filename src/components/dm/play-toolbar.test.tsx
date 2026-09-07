import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PlayRevealProvider } from './play-reveal'
import { PlayToolbar, type TableScreenFight } from './play-toolbar'

// The Play tab's four actions (`dm-chronology/play-tab`), and the rail behind
// them: one tap in, never two. Quick note and reveal open sheets over the
// screen the DM is on; the crib is a page and says so by being a link; the
// table screen hands over a link to copy and names the fight it belongs to.

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

/**
 * Replace the clipboard after userEvent.setup() installs its own stub, so the
 * test controls (and can assert on) exactly what `copy` writes.
 */
function stubClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  })
}

const LIVE: TableScreenFight = {
  name: 'Ambush at the bridge',
  shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
}

function Toolbar({ tableFight = LIVE }: { tableFight?: TableScreenFight | null }) {
  return (
    <PlayRevealProvider
      campaignId={CAMPAIGN_ID}
      initialHidden={[{ kind: 'npc', id: 'npc-1', name: 'Bram the innkeeper' }]}
    >
      <PlayToolbar campaignId={CAMPAIGN_ID} tableFight={tableFight} />
    </PlayRevealProvider>
  )
}

describe('PlayToolbar', () => {
  it('carries exactly four actions', () => {
    render(<Toolbar />)

    for (const label of ['Quick note', 'Crib', 'Reveal', 'Table screen']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('opens the quick note in a sheet, landing in tonight’s note', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Quick note' }))

    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByLabelText('Quick note')).toBeInTheDocument()
  })

  it('sends the crib to its own page rather than a sheet over the fight', () => {
    render(<Toolbar />)

    expect(screen.getByRole('link', { name: 'Crib' })).toHaveAttribute('href', '/dm/crib')
  })

  it('opens the reveal switches from the thumb’s arc', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Reveal' }))

    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText('Bram the innkeeper')).toBeInTheDocument()
  })

  it('names the fight the table screen is showing, and copies its link', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Table screen' }))

    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText(LIVE.name)).toBeInTheDocument()
    expect(within(sheet).getByText(`/table/${LIVE.shareToken}`)).toBeInTheDocument()

    await user.click(within(sheet).getByRole('button', { name: 'Copy link' }))

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/table/${LIVE.shareToken}`)
  })

  it('offers the long-press fallback when the clipboard refuses', async () => {
    const user = userEvent.setup()
    stubClipboard(jest.fn().mockRejectedValue(new Error('denied')))

    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Table screen' }))
    const sheet = await screen.findByRole('dialog')
    await user.click(within(sheet).getByRole('button', { name: 'Copy link' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not copy. Long-press the link text instead.'),
    )
  })

  it('says the fight link has no order yet when no fight is on the table', async () => {
    const user = userEvent.setup()
    render(<Toolbar tableFight={null} />)

    await user.click(screen.getByRole('button', { name: 'Table screen' }))

    const sheet = await screen.findByRole('dialog')
    expect(within(sheet).getByText(/No fight on the table/)).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument()
  })

  it('says the same for a fight whose share link was never made', async () => {
    const user = userEvent.setup()
    render(<Toolbar tableFight={{ name: 'The crypt', shareToken: null }} />)

    await user.click(screen.getByRole('button', { name: 'Table screen' }))

    expect(
      within(await screen.findByRole('dialog')).getByText(/this link has no order to show yet/),
    ).toBeInTheDocument()
  })

  it('offers the campaign’s own screen either way (`table-screen-cast`)', async () => {
    const user = userEvent.setup()

    // The campaign's screen outlives any fight and takes anything the DM casts
    // at it, so the door to it is here whether or not there is an order to
    // show — "no fight, nothing on the wall" stopped being true.
    for (const fight of [LIVE, null]) {
      const { unmount } = render(<Toolbar tableFight={fight} />)

      await user.click(screen.getByRole('button', { name: 'Table screen' }))

      const sheet = await screen.findByRole('dialog')
      expect(within(sheet).getByRole('link', { name: /Show them something else/ })).toHaveAttribute(
        'href',
        `/dm/campaigns/${CAMPAIGN_ID}/table`,
      )

      unmount()
    }
  })
})
