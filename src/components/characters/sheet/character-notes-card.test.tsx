import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { CharacterNotesCard } from './character-notes-card'

const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CHARACTER_ID = '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f'

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('CharacterNotesCard', () => {
  it('says plainly that the DM cannot read this', () => {
    render(<CharacterNotesCard characterId={CHARACTER_ID} notes="" />)

    expect(screen.getByText(/your DM cannot read these/i)).toBeInTheDocument()
  })

  it('will not save until something has changed', async () => {
    const user = userEvent.setup()

    render(<CharacterNotesCard characterId={CHARACTER_ID} notes="Owe 50gp." />)

    expect(screen.getByRole('button', { name: 'Save notes' })).toBeDisabled()

    await user.type(screen.getByRole('textbox'), ' Ask the mayor.')
    expect(screen.getByRole('button', { name: 'Save notes' })).toBeEnabled()
  })

  it('saves through the owner-only notes route, not the character patch route', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ notes: { body: 'Owe 50gp.' } }))

    render(<CharacterNotesCard characterId={CHARACTER_ID} notes="" />)

    await user.type(screen.getByRole('textbox'), 'Owe 50gp.')
    await user.click(screen.getByRole('button', { name: 'Save notes' }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('Notes saved.'))

    const [url, init] = mockFetch.mock.calls[0]
    // Its own endpoint: `/api/characters/[id]` carries the DND-027 viewer
    // predicate, which is exactly what these notes must not be saved through.
    expect(url).toBe(`/api/characters/${CHARACTER_ID}/notes`)
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ body: 'Owe 50gp.' })
  })

  it('sends no version and never has to reconcile a 409', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ notes: { body: 'x' } }))

    render(<CharacterNotesCard characterId={CHARACTER_ID} notes="" />)

    await user.type(screen.getByRole('textbox'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save notes' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).not.toHaveProperty('version')
  })

  it('keeps the draft and shows the error when a save fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'No such character' }, 404))

    render(<CharacterNotesCard characterId={CHARACTER_ID} notes="" />)

    await user.type(screen.getByRole('textbox'), 'Do not trust the mayor.')
    await user.click(screen.getByRole('button', { name: 'Save notes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No such character')
    expect(screen.getByRole('textbox')).toHaveValue('Do not trust the mayor.')
  })

  it('settles on what the server stored, so the button goes quiet again', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ notes: { body: 'Owe 50gp.' } }))

    render(<CharacterNotesCard characterId={CHARACTER_ID} notes="" />)

    await user.type(screen.getByRole('textbox'), 'Owe 50gp.')
    await user.click(screen.getByRole('button', { name: 'Save notes' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Save notes' })).toBeDisabled())
  })
})
