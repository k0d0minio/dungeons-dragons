import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InviteGate } from './invite-gate'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('InviteGate', () => {
  it('posts the trimmed code and refreshes so the server can render sign-up', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response)

    render(<InviteGate />)

    await user.type(screen.getByLabelText('Invite code'), '  red-dragon-inn  ')
    await user.click(screen.getByRole('button', { name: 'Continue to sign-up' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/invite')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ code: 'red-dragon-inn' })
  })

  it('shows the server’s words on a wrong code, without refreshing', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'That invite code is not right.' }),
    } as Response)

    render(<InviteGate />)

    await user.type(screen.getByLabelText('Invite code'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Continue to sign-up' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That invite code is not right.')
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
