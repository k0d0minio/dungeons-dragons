import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { DM_NOTE_TEMPLATE } from '@/lib/notes/dm-note'

import { DmNoteCard } from './dm-note-card'

// The DM's note on a character (first-table/dm-character-notes): seeded with
// the four headings on first open, saved through the campaign-scoped route.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

function renderCard(note = '') {
  render(
    <DmNoteCard
      campaignId={CAMPAIGN_ID}
      characterId={CHARACTER_ID}
      characterName="Ava Delacroix"
      note={note}
    />,
  )
  return screen.getByLabelText('Your note on Ava Delacroix') as HTMLTextAreaElement
}

describe('DmNoteCard', () => {
  it('opens a new note on the four headings, ready to save', () => {
    const box = renderCard()

    expect(box).toHaveValue(DM_NOTE_TEMPLATE)
    expect(box.value).toMatch(/^The player\n/)
    expect(box.value).toMatch(/\nThreads\n/)
    // The seed is not the stored note, so saving it is a real change.
    expect(screen.getByRole('button', { name: 'Save note' })).toBeEnabled()
  })

  it('opens an existing note as it was, with nothing to save', () => {
    const box = renderCard('Sam. Says it “Ah-va”.')

    expect(box).toHaveValue('Sam. Says it “Ah-va”.')
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled()
  })

  it('saves through the campaign-scoped route', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ note: { body: 'Sam.' } }),
    } as Response)

    const box = renderCard('')
    await user.clear(box)
    await user.type(box, 'Sam.')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/party/${CHARACTER_ID}/dm-note`)
    expect((init as RequestInit).method).toBe('PUT')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ body: 'Sam.' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled())
  })

  it('keeps the text and says so when the save is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'No such character' }),
    } as Response)

    const box = renderCard('Old.')
    await user.type(box, ' New.')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No such character')
    expect(box).toHaveValue('Old. New.')
  })
})
