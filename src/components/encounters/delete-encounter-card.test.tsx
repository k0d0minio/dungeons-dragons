import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

import { DeleteEncounterCard } from './delete-encounter-card'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'

function renderCard() {
  render(<DeleteEncounterCard encounterId={ENCOUNTER_ID} name="Ambush at the bridge" />)
}

describe('DeleteEncounterCard', () => {
  it('deletes after confirmation and returns to Play, where the fights are', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
    } as Response)

    renderCard()

    await user.click(screen.getByRole('button', { name: 'Delete encounter' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dm/play'))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}`)
    expect((init as RequestInit).method).toBe('DELETE')
  })

  it('holds the dialog open with the failure where the DM is looking', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response)

    renderCard()

    await user.click(screen.getByRole('button', { name: 'Delete encounter' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not delete this encounter (500).',
    )
    expect(mockPush).not.toHaveBeenCalled()
  })
})
