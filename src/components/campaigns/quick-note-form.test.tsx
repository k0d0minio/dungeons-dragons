import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { QuickNoteForm } from './quick-note-form'

const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const NOTE = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-15',
  body: 'Innkeeper is called Bram',
  sharedWithPlayers: false,
  createdAt: new Date('2026-08-15T20:00:00.000Z'),
  updatedAt: new Date('2026-08-15T20:00:00.000Z'),
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('QuickNoteForm', () => {
  it('will not send an empty line', () => {
    render(<QuickNoteForm campaignId={CAMPAIGN_ID} />)

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('sends the trimmed line, clears the field and says where it went', async () => {
    const user = userEvent.setup()
    const onCaptured = jest.fn()
    mockFetch.mockResolvedValue(jsonResponse({ note: NOTE }))

    render(<QuickNoteForm campaignId={CAMPAIGN_ID} onCaptured={onCaptured} />)

    const field = screen.getByLabelText('Quick note')
    await user.type(field, '  Innkeeper is called Bram  ')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Added to tonight’s note.'))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/notes/append`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'Innkeeper is called Bram' })

    expect(field).toHaveValue('')
    expect(onCaptured).toHaveBeenCalledWith(NOTE)
  })

  it('submits on Enter — the whole point of a single-line field mid-session', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ note: NOTE }))

    render(<QuickNoteForm campaignId={CAMPAIGN_ID} />)

    await user.type(screen.getByLabelText('Quick note'), 'They let the cultist go{Enter}')

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      text: 'They let the cultist go',
    })
  })

  it('keeps the line in the field when the save fails, so it is not lost', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such campaign' }, 404))

    render(<QuickNoteForm campaignId={CAMPAIGN_ID} />)

    const field = screen.getByLabelText('Quick note')
    await user.type(field, 'Something worth keeping')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('No such campaign'))
    expect(field).toHaveValue('Something worth keeping')
  })

  it('says so when the request never lands', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<QuickNoteForm campaignId={CAMPAIGN_ID} />)

    await user.type(screen.getByLabelText('Quick note'), 'x')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        'That did not send. Check your connection and try again.',
      ),
    )
  })
})
