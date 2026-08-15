import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DeleteCharacterCard } from './delete-character-card'

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

beforeEach(() => {
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
})

/** Open the confirmation and return the button inside it. */
async function confirmationButton(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Delete character' }))
  return screen.findByRole('button', { name: 'Delete' })
}

describe('DeleteCharacterCard', () => {
  it('deletes nothing until the confirmation is answered', async () => {
    const user = userEvent.setup()
    render(<DeleteCharacterCard id={ID} name="Vex Ashbrand" />)

    await user.click(screen.getByRole('button', { name: 'Delete character' }))

    // Named, because the one thing worth being sure of is *which* character.
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Delete Vex Ashbrand?')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('deletes the character and returns to the list once confirmed', async () => {
    const user = userEvent.setup()
    render(<DeleteCharacterCard id={ID} name="Vex Ashbrand" />)

    await user.click(await confirmationButton(user))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe(`/api/characters/${ID}`)
    expect(init.method).toBe('DELETE')

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/characters'))
    // Without this the list would come back still showing the deleted character.
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('backs out without deleting anything', async () => {
    const user = userEvent.setup()
    render(<DeleteCharacterCard id={ID} name="Vex Ashbrand" />)

    await user.click(screen.getByRole('button', { name: 'Delete character' }))
    await user.click(await screen.findByRole('button', { name: 'Keep them' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('says so in the dialog when the delete failed, rather than navigating away', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })

    render(<DeleteCharacterCard id={ID} name="Vex Ashbrand" />)

    await user.click(await confirmationButton(user))

    expect(await screen.findByRole('alert')).toHaveTextContent('already gone')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('says so when the request never landed', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('offline'))

    render(<DeleteCharacterCard id={ID} name="Vex Ashbrand" />)

    await user.click(await confirmationButton(user))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i)
    expect(mockPush).not.toHaveBeenCalled()
  })
})
