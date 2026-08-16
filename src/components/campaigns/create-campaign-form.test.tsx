import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CreateCampaignForm } from './create-campaign-form'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('CreateCampaignForm', () => {
  it('creates the campaign with a trimmed name, clears the field and refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<CreateCampaignForm />)

    await user.type(screen.getByLabelText('New campaign'), '  Curse of the Wednesday Table  ')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/campaigns')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      name: 'Curse of the Wednesday Table',
    })

    // The field empties so the next campaign can be typed straight in.
    expect(screen.getByLabelText('New campaign')).toHaveValue('')
  })

  it('shows the server’s words on a rejected name, without refreshing', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'A campaign needs a name.' }),
    } as Response)

    render(<CreateCampaignForm />)

    await user.type(screen.getByLabelText('New campaign'), 'x')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A campaign needs a name.')
    expect(mockRefresh).not.toHaveBeenCalled()
    // The typed name survives the failure — nothing to retype.
    expect(screen.getByLabelText('New campaign')).toHaveValue('x')
  })

  it('falls back to its own words when the error body is not JSON', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)

    render(<CreateCampaignForm />)

    await user.type(screen.getByLabelText('New campaign'), 'Frostmaiden')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not save. Try again.')
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('disables the button while the request is in flight', async () => {
    const user = userEvent.setup()
    let resolveFetch: (response: Response) => void = () => {}
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      }),
    )

    render(<CreateCampaignForm />)

    await user.type(screen.getByLabelText('New campaign'), 'Frostmaiden')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('button', { name: 'Creating…' })).toBeDisabled()

    resolveFetch({ ok: true, status: 200, json: async () => ({}) } as Response)

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('says so when the request never landed', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<CreateCampaignForm />)

    await user.type(screen.getByLabelText('New campaign'), 'Frostmaiden')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That did not send. Check your connection and try again.',
    )
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
