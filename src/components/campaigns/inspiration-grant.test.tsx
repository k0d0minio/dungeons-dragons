import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

import { toast } from 'sonner'

import { InspirationGrant } from './inspiration-grant'

// The DM hands over Heroic Inspiration (first-table/dm-character-profile):
// the same combat-state PATCH the sheet's card makes, with the version.

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

describe('InspirationGrant', () => {
  it('grants it through the character’s combat state, then refreshes', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(
      <InspirationGrant characterId={CHARACTER_ID} characterName="Ava" version={2} held={false} />,
    )

    await user.click(screen.getByRole('button', { name: 'Grant it to Ava' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/characters/${CHARACTER_ID}`)
    expect((init as RequestInit).method).toBe('PATCH')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      heroicInspiration: true,
      version: 2,
    })
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Ava has Heroic Inspiration/))
  })

  it('takes it back the same way', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<InspirationGrant characterId={CHARACTER_ID} characterName="Ava" version={2} held />)

    const button = screen.getByRole('button', { name: 'Take it back' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await user.click(button)

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({
      heroicInspiration: false,
      version: 2,
    })
  })

  it('warns on a version conflict instead of retrying', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({}) } as Response)

    render(
      <InspirationGrant characterId={CHARACTER_ID} characterName="Ava" version={2} held={false} />,
    )
    await user.click(screen.getByRole('button', { name: 'Grant it to Ava' }))

    await waitFor(() => expect(toast.warning).toHaveBeenCalled())
    expect(mockRefresh).toHaveBeenCalled()
  })
})
