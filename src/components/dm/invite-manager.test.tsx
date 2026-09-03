import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

import { InviteManager, type InviteView } from './invite-manager'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const OPEN: InviteView = {
  id: 'inv-open',
  token: 'kfEbCq3vX9pLm2Rt8sWz1A',
  role: 'player',
  label: 'Sam',
  email: 'sam@example.com',
  createdAt: '2026-09-03T10:00:00.000Z',
  expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'open',
  claimedByName: null,
}

const USED: InviteView = {
  ...OPEN,
  id: 'inv-used',
  token: 'AAAAAAAAAAAAAAAAAAAAAA',
  label: 'Priya',
  email: null,
  role: 'dm',
  status: 'claimed',
  claimedByName: 'Priya',
}

const MINTED = {
  id: 'inv-new',
  token: 'BBBBBBBBBBBBBBBBBBBBBB',
  role: 'dm',
  label: 'Alex',
  email: null,
  createdAt: '2026-09-03T11:00:00.000Z',
  expiresAt: '2026-09-17T11:00:00.000Z',
}

describe('InviteManager', () => {
  it('lists every invite, with the link and controls only on an open one', () => {
    render(<InviteManager invites={[OPEN, USED]} />)

    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getByText(/Expires in 5 days · sam@example.com/)).toBeInTheDocument()
    expect(screen.getByText(`/invite/${OPEN.token}`)).toBeInTheDocument()

    expect(screen.getByText('Priya')).toBeInTheDocument()
    expect(screen.getByText('Used by Priya')).toBeInTheDocument()
    expect(screen.queryByText(`/invite/${USED.token}`)).not.toBeInTheDocument()

    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Copy link' })).toHaveLength(1)
  })

  it('offers a mail with the link in it when the invite has an address', () => {
    render(<InviteManager invites={[OPEN]} />)

    const mail = screen.getByRole('link', { name: 'Send by email' })
    expect(mail.getAttribute('href')).toMatch(/^mailto:sam@example\.com\?subject=/)
    expect(decodeURIComponent(mail.getAttribute('href') ?? '')).toContain(`/invite/${OPEN.token}`)
  })

  it('says so when there are none', () => {
    render(<InviteManager invites={[]} />)

    expect(screen.getByText('No invites yet.')).toBeInTheDocument()
  })

  it('mints an invite from the form and puts it at the top of the list', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ invite: MINTED }),
    } as Response)

    render(<InviteManager invites={[OPEN]} />)

    await user.type(screen.getByLabelText('Who is it for?'), 'Alex')
    await user.click(screen.getByLabelText('DM'))
    await user.click(screen.getByRole('button', { name: 'Make invite link' }))

    expect(await screen.findByText('Alex')).toBeInTheDocument()
    expect(screen.getByText(`/invite/${MINTED.token}`)).toBeInTheDocument()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/dm/invites')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      role: 'dm',
      label: 'Alex',
      email: '',
    })
    // The form resets for the next friend.
    expect(screen.getByLabelText('Who is it for?')).toHaveValue('')
    expect(screen.getByLabelText('Player')).toBeChecked()
  })

  it('shows the server’s words when minting is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'That does not look like an email address' }),
    } as Response)

    render(<InviteManager invites={[]} />)

    await user.click(screen.getByRole('button', { name: 'Make invite link' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('That does not look like an email address'),
    )
    expect(screen.getByText('No invites yet.')).toBeInTheDocument()
  })

  it('revokes an open invite and marks the row', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invite: { ...OPEN, revokedAt: new Date().toISOString() } }),
    } as Response)

    render(<InviteManager invites={[OPEN]} />)

    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    expect(await screen.findByText(/^Revoked · /)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledWith(`/api/dm/invites/${OPEN.id}`, { method: 'DELETE' })
  })

  it('leaves the row open when revoking fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)

    render(<InviteManager invites={[OPEN]} />)

    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
  })

  it('copies the full link, origin included', async () => {
    const user = userEvent.setup()

    render(<InviteManager invites={[OPEN]} />)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/copied/i)),
    )
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/invite/${OPEN.token}`,
    )
  })

  it('says so when the network is gone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    render(<InviteManager invites={[OPEN]} />)

    await user.click(screen.getByRole('button', { name: 'Make invite link' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/connection/)),
    )

    await user.click(screen.getByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2))
  })
})
