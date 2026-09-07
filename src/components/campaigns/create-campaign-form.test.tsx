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

  // The table that carries on (`first-table/one-night-campaign`), created then
  // carried, with the carry re-runnable on its own (`triage/carry-forward-rerun`).
  describe('carrying the table forward', () => {
    const TUTORIAL = { id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b', name: 'The Tutorial' }
    const OTHER = { id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e', name: 'The Rime' }
    const NEW_ID = '2f3a4b5c-6d7e-4f80-91a2-b3c4d5e6f708'

    /** The campaign this create call made, as the route answers with it. */
    function created(): Response {
      return {
        ok: true,
        status: 201,
        json: async () => ({ campaign: { id: NEW_ID } }),
      } as Response
    }

    function sentTo(index: number): { url: string; method: string; body: Record<string, unknown> } {
      const [url, init] = mockFetch.mock.calls[index]
      const request = init as RequestInit
      return {
        url: String(url),
        method: String(request.method),
        body: JSON.parse(String(request.body)),
      }
    }

    it('offers nothing to carry when the DM runs no campaign yet', () => {
      render(<CreateCampaignForm campaigns={[]} />)

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('is one checkbox naming the campaign when there is exactly one, unticked by default', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(created())

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
      // Unticked means one call and nothing carried.
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(sentTo(0).body).toEqual({ name: 'The real one' })
    })

    it('creates, then carries into the campaign it just made, then clears the tick', async () => {
      const user = userEvent.setup()
      mockFetch
        .mockResolvedValueOnce(created())
        .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL]} />)

      await user.click(screen.getByRole('checkbox'))
      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())

      expect(sentTo(0)).toEqual({
        url: '/api/campaigns',
        method: 'POST',
        body: { name: 'The real one' },
      })
      expect(sentTo(1)).toEqual({
        url: `/api/campaigns/${NEW_ID}/carry-from`,
        method: 'PUT',
        body: { campaignId: TUTORIAL.id },
      })
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('lists the campaigns to pick from when there are several, live only once ticked', async () => {
      const user = userEvent.setup()
      mockFetch
        .mockResolvedValueOnce(created())
        .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL, OTHER]} />)

      const select = screen.getByRole('combobox', { name: 'Campaign to carry forward from' })
      expect(select).toBeDisabled()

      await user.click(screen.getByRole('checkbox'))
      expect(select).toBeEnabled()
      await user.selectOptions(select, OTHER.id)

      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      expect(sentTo(1).body).toEqual({ campaignId: OTHER.id })
    })

    // The stub's whole point: a carry that failed is finished by pressing
    // again, and never by making a second campaign.
    it('keeps the campaign it made and offers the carry again when the carry fails', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce(created()).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'The table did not carry across.' }),
      } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL]} />)

      await user.click(screen.getByRole('checkbox'))
      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('The table did not carry across.')
      // The page is not refreshed out from under the retry, and the create
      // form is gone: there is no second campaign to be made here.
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(screen.queryByLabelText('New campaign')).not.toBeInTheDocument()
      expect(screen.getByText(/was created, but the table did not/)).toBeInTheDocument()

      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)
      await user.click(screen.getByRole('button', { name: 'Carry the table across' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      // The re-run is the carry alone, against the same campaign.
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(sentTo(2)).toEqual({
        url: `/api/campaigns/${NEW_ID}/carry-from`,
        method: 'PUT',
        body: { campaignId: TUTORIAL.id },
      })
      expect(screen.getByLabelText('New campaign')).toHaveValue('')
    })

    it('lets the DM leave an unfinished carry, which keeps the campaign', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce(created()).mockRejectedValueOnce(new Error('offline'))

      render(<CreateCampaignForm campaigns={[TUTORIAL]} />)

      await user.click(screen.getByRole('checkbox'))
      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'That did not send. Check your connection and try again.',
      )

      await user.click(screen.getByRole('button', { name: 'Leave it for now' }))

      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(screen.getByLabelText('New campaign')).toBeInTheDocument()
    })

    it('says so, and still refreshes, when the created campaign comes back without an id', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({}) } as Response)

      render(<CreateCampaignForm campaigns={[TUTORIAL]} />)

      await user.click(screen.getByRole('checkbox'))
      await user.type(screen.getByLabelText('New campaign'), 'The real one')
      await user.click(screen.getByRole('button', { name: 'Create' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/did not get its id back/)
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
      // Nothing was carried, because there was nothing to carry into.
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
