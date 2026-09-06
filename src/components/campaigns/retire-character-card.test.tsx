import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

import { RetireCharacterCard } from './retire-character-card'

// The DM retires a character (first-table/retire-a-character): a confirmed
// DELETE, then back to the campaign; a refusal is read inside the dialog.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

function renderCard(playedBy: string | null = 'Sam') {
  render(
    <RetireCharacterCard
      campaignId={CAMPAIGN_ID}
      characterId={CHARACTER_ID}
      characterName="Ava Delacroix"
      playedBy={playedBy}
    />,
  )
}

describe('RetireCharacterCard', () => {
  it('names the character and the player before asking', async () => {
    const user = userEvent.setup()
    renderCard()

    expect(screen.getByText(/Sam keeps their seat/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retire Ava Delacroix' }))

    expect(screen.getByRole('alertdialog', { name: 'Retire Ava Delacroix?' })).toBeInTheDocument()
    expect(screen.getByText(/Sam stays at the table/)).toBeInTheDocument()
  })

  it('deletes on confirm and goes back to the campaign', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)
    renderCard()

    await user.click(screen.getByRole('button', { name: 'Retire Ava Delacroix' }))
    await user.click(screen.getByRole('button', { name: 'Retire' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/dm/campaigns/${CAMPAIGN_ID}`))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER_ID}`)
    expect((init as RequestInit).method).toBe('DELETE')
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('keeps the dialog open and says why when the delete is refused', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response)
    renderCard(null)

    await user.click(screen.getByRole('button', { name: 'Retire Ava Delacroix' }))
    await user.click(screen.getByRole('button', { name: 'Retire' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already gone')
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
