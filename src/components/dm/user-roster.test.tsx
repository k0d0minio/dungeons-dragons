import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

import { UserRoster, type RosterUser } from './user-roster'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const JAMIE: RosterUser = {
  id: 'jamie',
  name: 'Jamie',
  email: 'jamie@example.com',
  createdAt: '2026-08-13T17:44:34.000Z',
  role: 'dm',
  characterCount: 2,
  campaignCount: 1,
}

const SAM: RosterUser = {
  id: 'sam',
  name: 'Sam',
  email: 'sam@example.com',
  createdAt: '2026-09-01T10:00:00.000Z',
  role: 'player',
  characterCount: 1,
  campaignCount: 0,
}

describe('UserRoster', () => {
  it('lists every account with role, email and what they have touched', () => {
    render(<UserRoster users={[JAMIE, SAM]} selfId="jamie" />)

    expect(screen.getByText('Jamie')).toBeInTheDocument()
    expect(screen.getByText('DM')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()
    expect(screen.getByText(/1 character · 0 campaigns/)).toBeInTheDocument()
    expect(screen.getByText(/2 characters · 1 campaign$/)).toBeInTheDocument()
  })

  it('offers nothing on your own row — no role switch, and no delete', () => {
    render(<UserRoster users={[JAMIE, SAM]} selfId="jamie" />)

    expect(screen.getByText('you')).toBeInTheDocument()
    // Two controls, both on Sam's row: a DM who could delete themself would
    // take the one `dm` row with them.
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Make DM' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Sam' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Jamie' })).not.toBeInTheDocument()
  })

  it('says so when nobody has signed up', () => {
    render(<UserRoster users={[]} selfId="jamie" />)

    expect(screen.getByText('Nobody has signed up yet.')).toBeInTheDocument()
  })

  it('puts the new role to the API and flips the row', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 'sam', role: 'dm' } }),
    } as Response)

    render(<UserRoster users={[JAMIE, SAM]} selfId="jamie" />)

    await user.click(screen.getByRole('button', { name: 'Make DM' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Make player' })).toBeInTheDocument(),
    )
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/dm/users/sam/role')
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ role: 'dm' })
    expect(toast.success).toHaveBeenCalledWith('Sam is now a DM.')
  })

  it('keeps the row as it was and shows the server’s words on a refusal', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Only the DM can change roles' }),
    } as Response)

    render(<UserRoster users={[JAMIE, SAM]} selfId="jamie" />)

    await user.click(screen.getByRole('button', { name: 'Make DM' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Only the DM can change roles'))
    expect(screen.getByRole('button', { name: 'Make DM' })).toBeInTheDocument()
  })

  it('says so when the request never got out', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    render(<UserRoster users={[JAMIE, SAM]} selfId="jamie" />)

    await user.click(screen.getByRole('button', { name: 'Make DM' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/connection/)),
    )
  })
})

describe('UserRoster — deleting an account', () => {
  async function openTheDialog() {
    const user = userEvent.setup()
    render(<UserRoster users={[JAMIE, SAM]} selfId="jamie" />)
    await user.click(screen.getByRole('button', { name: 'Delete Sam' }))
    return user
  }

  it('asks first, naming the person and counting what goes with them', async () => {
    await openTheDialog()

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Delete Sam’s account?')).toBeInTheDocument()
    expect(screen.getByText(/their character, their sign-in/)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('deletes on confirmation, drops the row and refreshes the invites beside it', async () => {
    const user = await openTheDialog()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ deleted: { id: 'sam' } }),
    } as Response)

    await user.click(screen.getByRole('button', { name: 'Delete account' }))

    await waitFor(() => expect(screen.queryByText('Sam')).not.toBeInTheDocument())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/dm/users/sam')
    expect((init as RequestInit).method).toBe('DELETE')
    expect(toast.success).toHaveBeenCalledWith('Sam’s account is gone.')
    // Their invite rows went with them, and that card is server-rendered.
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('keeps the row and holds the dialog open on a refusal, so the reason is read', async () => {
    const user = await openTheDialog()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'This account runs a campaign. Delete it or hand it to another DM first.',
      }),
    } as Response)

    await user.click(screen.getByRole('button', { name: 'Delete account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/runs a campaign/)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
  })

  it('says so when the request never got out', async () => {
    const user = await openTheDialog()
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    await user.click(screen.getByRole('button', { name: 'Delete account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/connection/)
    expect(screen.getByText('Sam')).toBeInTheDocument()
  })

  it('keeps them when the DM backs out', async () => {
    const user = await openTheDialog()

    await user.click(screen.getByRole('button', { name: 'Keep them' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
