import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InviteLanding } from './invite-landing'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'

describe('InviteLanding', () => {
  it('names the person and the role the invite carries', () => {
    render(<InviteLanding token={TOKEN} role="player" label="Sam" />)

    expect(screen.getByText('Sam, you’re invited')).toBeInTheDocument()
    expect(screen.getByText(/as a player/)).toBeInTheDocument()
  })

  it('reads plainly with no label, and says what a DM invite means', () => {
    render(<InviteLanding token={TOKEN} role="dm" label={null} />)

    expect(screen.getByText('You’re invited')).toBeInTheDocument()
    expect(screen.getByText(/as a DM/)).toBeInTheDocument()
  })

  it('trades the token for the cookie and walks to sign-up', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response)

    render(<InviteLanding token={TOKEN} role="player" label="Sam" />)

    await user.click(screen.getByRole('button', { name: 'Create your account' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/auth/sign-up'))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/invite')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ token: TOKEN })
  })

  it('walks an existing account to sign-in instead, by the same trade', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response)

    render(<InviteLanding token={TOKEN} role="player" label="Sam" />)

    await user.click(screen.getByRole('button', { name: 'I already have an account' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/auth/sign-in'))
  })

  it('shows the server’s words when the link has died under them, and goes nowhere', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'That invite link no longer works. Ask Jamie for a fresh one.' }),
    } as Response)

    render(<InviteLanding token={TOKEN} role="player" label="Sam" />)

    await user.click(screen.getByRole('button', { name: 'Create your account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer works/)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('says so when the request never got out', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    render(<InviteLanding token={TOKEN} role="player" label="Sam" />)

    await user.click(screen.getByRole('button', { name: 'Create your account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/connection/)
  })
})
