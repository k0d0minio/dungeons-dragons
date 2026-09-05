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

    render(<CreateCampaignForm campaigns={[]} />)

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

    render(<CreateCampaignForm campaigns={[]} />)

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

    render(<CreateCampaignForm campaigns={[]} />)

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

    render(<CreateCampaignForm campaigns={[]} />)

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

    render(<CreateCampaignForm campaigns={[]} />)

    await user.type(screen.getByLabelText('New campaign'), 'Frostmaiden')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That did not send. Check your connection and try again.',
    )
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  // The table that carries on (`first-table/one-night-campaign`).
  describe('carrying the table forward', () => {
    const TUTORIAL = { id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b', name: 'The Tutorial' }
    const OTHER = { id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e', name: 'The Rime' }

    function sentBody(): Record<string, unknown> {
      const [, init] = mockFetch.mock.calls[0]
      return JSON.parse(String((init as RequestInit).body))
    }

    it('offers nothing to carry when the DM runs no campaign yet', () => {
      render(<CreateCampaignForm campaigns={[]} />)

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('is one checkbox naming the campaign when there is exactly one, unticked by default', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL]} />)

      const checkbox = screen.getByRole('checkbox', { name: /Carry the table forward from/ })
      expect(checkbox).not.toBeChecked()
      expect(screen.getByText('The Tutorial')).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      // The consequence, on the control.
      expect(
        screen.getByText(/every character at that table start on the new campaign/),
      ).toBeInTheDocument()

      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      // Unticked means the body says nothing about carrying.
      expect(sentBody()).toEqual({ name: 'The real one' })
    })

    it('sends carryFrom when ticked, and clears the tick once the campaign is made', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL]} />)

      await user.click(screen.getByRole('checkbox'))
      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      expect(sentBody()).toEqual({ name: 'The real one', carryFrom: TUTORIAL.id })
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('lists the campaigns to pick from when there are several, live only once ticked', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL, OTHER]} />)

      const select = screen.getByRole('combobox', { name: 'Campaign to carry forward from' })
      expect(select).toBeDisabled()

      await user.click(screen.getByRole('checkbox'))
      expect(select).toBeEnabled()
      await user.selectOptions(select, OTHER.id)

      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      expect(sentBody()).toEqual({ name: 'The real one', carryFrom: OTHER.id })
    })
  })
})
