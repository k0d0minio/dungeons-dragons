import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { CampaignNote } from '@/lib/db/schema'
import { todaySessionDate } from '@/lib/notes/schema'

import { CampaignNotesCard } from './campaign-notes-card'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const OLDER: CampaignNote = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-01',
  body: 'They met the harbourmaster.',
  sharedWithPlayers: false,
  sessionClosedAt: null,
  createdAt: new Date('2026-08-01T20:00:00.000Z'),
  updatedAt: new Date('2026-08-01T20:00:00.000Z'),
}

const NEWER: CampaignNote = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  campaignId: CAMPAIGN_ID,
  sessionDate: '2026-08-15',
  body: 'They bribed him.',
  sharedWithPlayers: true,
  sessionClosedAt: null,
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

describe('CampaignNotesCard', () => {
  it('lists notes newest session first, with the shared switch reflecting each one', () => {
    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[OLDER, NEWER]} />)

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('They bribed him.')).toBeInTheDocument()
    expect(within(items[1]).getByText('They met the harbourmaster.')).toBeInTheDocument()

    const switches = screen.getAllByRole('switch')
    expect(switches[0]).toBeChecked()
    expect(switches[1]).not.toBeChecked()
  })

  it('says the quick note starts tonight’s note when there is not one yet', () => {
    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[OLDER]} />)

    expect(screen.getByText(/Starts tonight’s note/)).toBeInTheDocument()
  })

  it('says the quick note adds to tonight’s note once one exists', () => {
    const tonight = { ...OLDER, sessionDate: todaySessionDate() }

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[tonight]} />)

    expect(screen.getByText(/Adds to tonight’s note/)).toBeInTheDocument()
  })

  it('shares a note through the note’s own endpoint and repaints from the answer', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ note: { ...OLDER, sharedWithPlayers: true } }))

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[OLDER]} />)

    await user.click(screen.getByRole('switch'))

    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/notes/${OLDER.id}`)
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ sharedWithPlayers: true })
  })

  it('leaves the switch alone and says so when sharing fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Nope' }, 500))

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[OLDER]} />)

    await user.click(screen.getByRole('switch'))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Nope'))
    expect(screen.getByRole('switch')).not.toBeChecked()
  })

  it('writes a new dated note and shows it without a reload', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ note: NEWER }, 201))

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[]} />)

    await user.type(screen.getByLabelText('What happened'), 'They bribed him.')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    await waitFor(() => expect(screen.getByText('They bribed him.')).toBeInTheDocument())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/notes`)
    expect(JSON.parse(String(init?.body))).toEqual({
      body: 'They bribed him.',
      // Defaults to today, which is also what the quick capture writes into.
      sessionDate: todaySessionDate(),
    })
  })

  it('reports a failed note in the form rather than a toast the DM may have scrolled past', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'That note did not save.' }, 500))

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[]} />)

    await user.type(screen.getByLabelText('What happened'), 'Lost thought')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That note did not save.')
    // The text stays put, so the DM can send it again.
    expect(screen.getByLabelText('What happened')).toHaveValue('Lost thought')
  })

  it('edits a note in place', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ note: { ...OLDER, body: 'They robbed him.' } }))

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[OLDER]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const textarea = screen.getByLabelText('Note')
    await user.clear(textarea)
    await user.type(textarea, 'They robbed him.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('They robbed him.')).toBeInTheDocument())
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      body: 'They robbed him.',
    })
  })

  it('deletes a note behind a confirmation', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

    render(<CampaignNotesCard campaignId={CAMPAIGN_ID} notes={[OLDER]} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete', hidden: false }))

    await waitFor(() => expect(screen.getByText('No notes yet.')).toBeInTheDocument())
    expect(mockFetch.mock.calls[0][1]?.method).toBe('DELETE')
  })
})
