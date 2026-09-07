import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

import { CampaignInviteCard } from './campaign-invite-card'

// One link that makes the account *and* seats the person at this table
// (`dm-chronology/one-link-invite`). What this card owes its DM: the campaign
// rides on every mint, the role is never asked, the link comes back copyable,
// and share is offered only where the phone has it.
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const CAMPAIGN_NAME = 'Heroes of the Borderlands'
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

function minted() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ invite: { token: TOKEN } }),
  } as Response)
}

function renderCard() {
  return render(<CampaignInviteCard campaignId={CAMPAIGN_ID} campaignName={CAMPAIGN_NAME} />)
}

async function mintFor(user: ReturnType<typeof userEvent.setup>, who = 'Sam') {
  await user.type(screen.getByLabelText('Who is it for?'), who)
  await user.click(screen.getByRole('button', { name: 'Make invite link' }))
}

describe('CampaignInviteCard', () => {
  it('names the table and asks only who the link is for', () => {
    renderCard()

    expect(screen.getByText(`Invite someone to ${CAMPAIGN_NAME}`)).toBeInTheDocument()
    expect(screen.getByLabelText('Who is it for?')).toBeInTheDocument()
    // The role is not a question on this screen — an invite from here is for a
    // player at this table.
    expect(screen.queryByText('They will be a')).not.toBeInTheDocument()
  })

  it('mints a player invite carrying this campaign, and shows the link', async () => {
    const user = userEvent.setup()
    minted()

    renderCard()
    await mintFor(user)

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/dm/invites')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      role: 'player',
      label: 'Sam',
      campaignId: CAMPAIGN_ID,
    })

    expect(await screen.findByText(`/invite/${TOKEN}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Make another link' })).toBeInTheDocument()
  })

  it('copies the full link, origin included', async () => {
    const user = userEvent.setup()
    minted()

    renderCard()
    await mintFor(user)
    await user.click(await screen.findByRole('button', { name: 'Copy link' }))

    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/invite/${TOKEN}`)
  })

  // The phone-native way to get a link into WhatsApp: `navigator.share` is what
  // the DM actually reaches for, and the campaign is named in what it sends.
  it('shares the link with the table named, where the browser has a share sheet', async () => {
    const user = userEvent.setup()
    minted()

    renderCard()
    await mintFor(user)
    await user.click(await screen.findByRole('button', { name: 'Share' }))

    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `Join ${CAMPAIGN_NAME}`,
        url: `${window.location.origin}/invite/${TOKEN}`,
      }),
    )
  })

  // Absent on every desktop browser worth naming, so the button is not drawn
  // where tapping it could only fail.
  it('offers no share button when the browser has none', async () => {
    const user = userEvent.setup()
    minted()
    // `jest.setup.js` gives every test a share sheet; this one takes it away
    // again, which is what a laptop looks like.
    const share = navigator.share
    Object.assign(navigator, { share: undefined })

    try {
      renderCard()
      await mintFor(user)

      expect(await screen.findByRole('button', { name: 'Copy link' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
    } finally {
      Object.assign(navigator, { share })
    }
  })

  it('shows the server’s words when minting is refused, and no link', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No campaign with that id' }),
    } as Response)

    renderCard()
    await mintFor(user)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No campaign with that id'))
    expect(screen.queryByText(`/invite/${TOKEN}`)).not.toBeInTheDocument()
  })

  it('says so when the request never got out', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    renderCard()
    await mintFor(user)

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Could not make that invite. Check your connection.',
      ),
    )
  })
})
