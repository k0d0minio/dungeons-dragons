import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { CampaignNote } from '@/lib/db/schema'

import { NightNotes, RecapNote } from './night-notes'

// The DM's notes, filed under the night they were written for
// (`dm-chronology/sessions-tab`). What these pin: the state of a note is a
// word on its row rather than a switch to read, the sheet writes through the
// note routes that already existed, a new note is filed under this night
// without anyone picking a date, and the recap cannot be deleted from here —
// deleting it would delete the night.

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh }),
}))

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const NOTE_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

function note(overrides: Partial<CampaignNote> = {}): CampaignNote {
  return {
    id: NOTE_ID,
    campaignId: CAMPAIGN_ID,
    sessionDate: '2026-09-03',
    body: 'The harbourmaster wants a favour.',
    sharedWithPlayers: false,
    sessionClosedAt: null,
    planId: null,
    createdAt: new Date('2026-09-03T20:00:00.000Z'),
    updatedAt: new Date('2026-09-03T20:00:00.000Z'),
    ...overrides,
  }
}

/** One OK response carrying whatever the route hands back. */
function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

beforeEach(() => {
  mockFetch.mockReset()
  refresh.mockClear()
})

describe('NightNotes', () => {
  function draw(props: Partial<Parameters<typeof NightNotes>[0]> = {}) {
    return render(
      <ul>
        <NightNotes campaignId={CAMPAIGN_ID} notes={[note()]} writeFor="2026-09-03" {...props} />
      </ul>,
    )
  }

  it('says whether the party can read a note without opening it', () => {
    draw({ notes: [note(), note({ id: 'shared', sharedWithPlayers: true })] })

    expect(screen.getAllByText('Private')).toHaveLength(1)
    expect(screen.getAllByText('Shared')).toHaveLength(1)
  })

  it('saves an edit through the note route, then re-reads the page', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok({ note: note({ body: 'They took the ledger.' }) }))
    draw()

    await user.click(screen.getByRole('button', { name: /The harbourmaster wants a favour/ }))

    const body = await screen.findByLabelText('What happened')
    await user.clear(body)
    await user.type(body, 'They took the ledger.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/notes/${NOTE_ID}`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({
      body: 'They took the ledger.',
      sessionDate: '2026-09-03',
      sharedWithPlayers: false,
    })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it('shares a note with the party from the same sheet', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok({ note: note({ sharedWithPlayers: true }) }))
    draw()

    await user.click(screen.getByRole('button', { name: /The harbourmaster wants a favour/ }))
    await user.click(await screen.findByLabelText('Players can read this'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).sharedWithPlayers).toBe(true)
  })

  it('files a new note under this night without anyone picking a date', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(ok({ note: note({ id: 'new', body: 'A second thought.' }) }))
    draw()

    await user.click(screen.getByRole('button', { name: /Write a note/ }))
    await user.type(await screen.findByLabelText('What happened'), 'A second thought.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/notes`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).sessionDate).toBe('2026-09-03')

    expect(await screen.findByRole('button', { name: /A second thought/ })).toBeInTheDocument()
  })

  it('says what went wrong instead of closing on a failed save', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Nope' }) })
    draw()

    await user.click(screen.getByRole('button', { name: /Write a note/ }))
    await user.type(await screen.findByLabelText('What happened'), 'A line')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nope')
  })

  it('deletes a note the DM no longer wants, and it leaves the list', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    draw()

    await user.click(screen.getByRole('button', { name: /The harbourmaster wants a favour/ }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockFetch.mock.calls[0][1].method).toBe('DELETE'))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /The harbourmaster wants a favour/ }),
      ).not.toBeInTheDocument(),
    )
  })

  it('lets an orphan note be re-filed by its date, which is the point of the group', async () => {
    const user = userEvent.setup()
    draw({ fixedDate: false, writeFor: null })

    await user.click(screen.getByRole('button', { name: /The harbourmaster wants a favour/ }))

    expect(await screen.findByLabelText('The night it belongs to')).toHaveValue('2026-09-03')
  })

  it('offers nothing to write on a campaign that is closed', () => {
    draw({ readOnly: true })

    expect(screen.queryByRole('button', { name: /Write a note/ })).not.toBeInTheDocument()
  })
})

describe('RecapNote', () => {
  const RECAP = note({ sharedWithPlayers: true, body: 'They talked the harbourmaster round.' })

  it('prints the recap in full, and offers exactly one act on it', async () => {
    const user = userEvent.setup()
    render(
      <ul>
        <RecapNote campaignId={CAMPAIGN_ID} note={RECAP} />
      </ul>,
    )

    expect(screen.getByText('They talked the harbourmaster round.')).toBeInTheDocument()

    const row = screen.getByRole('button', { name: /Edit the recap/ })
    expect(within(row).getByText('Shared')).toBeInTheDocument()

    await user.click(row)

    // Deleting the recap would delete the night — `listNights` keys a played
    // night by it — so the sheet that edits it cannot.
    expect(await screen.findByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
