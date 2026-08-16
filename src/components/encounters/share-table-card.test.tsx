import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import { ShareTableCard } from './share-table-card'

const mockToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const ENCOUNTER_ID = '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d'
const TOKEN = 'kfEbCq3vX9pLm2Rt8sWz1A'
const NEW_TOKEN = 'aaaaaaaaaaaaaaaaaaaaaa'

function stubClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  })
}

describe('ShareTableCard', () => {
  it('renders the table path and both buttons when a token is live', () => {
    render(<ShareTableCard encounterId={ENCOUNTER_ID} shareToken={TOKEN} />)

    expect(screen.getByText(`/table/${TOKEN}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument()
  })

  it('copies the full table URL and says so', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    render(<ShareTableCard encounterId={ENCOUNTER_ID} shareToken={TOKEN} />)

    await user.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalled())
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/table/${TOKEN}`)
  })

  it('regenerates the token and swaps in the new link', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ encounter: { shareToken: NEW_TOKEN } }),
    } as Response)

    render(<ShareTableCard encounterId={ENCOUNTER_ID} shareToken={TOKEN} />)

    await user.click(screen.getByRole('button', { name: 'Regenerate' }))

    await waitFor(() => expect(screen.getByText(`/table/${NEW_TOKEN}`)).toBeInTheDocument())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/encounters/${ENCOUNTER_ID}/share-token`)
    expect((init as RequestInit).method).toBe('POST')
    expect(screen.queryByText(`/table/${TOKEN}`)).not.toBeInTheDocument()
  })
})
