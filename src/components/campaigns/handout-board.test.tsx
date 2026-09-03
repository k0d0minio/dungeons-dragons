import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { HandoutForDm } from '@/lib/db/handouts'

import { HandoutBoard } from './handout-board'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const LETTER: HandoutForDm = {
  id: '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
  title: 'The pressed-flower letter',
  body: 'Dearest Mira — do not come back for me.',
  image: null,
  provenance: 'Written by the harbourmaster, in a hand that is not his.',
  dmNotes: null,
}

const MAP: HandoutForDm = {
  ...LETTER,
  id: '1a2b3c4d-5e6f-4708-9a0b-1c2d3e4f5061',
  title: 'A torn map',
  body: null,
  provenance: null,
  image: { contentType: 'image/jpeg', bytes: 120_000, uploadedAt: '2026-09-03T10:00:00.000Z' },
  revealedAt: new Date('2026-09-04T19:00:00.000Z'),
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('HandoutBoard', () => {
  it('lists handouts alphabetically with the words on the thing', () => {
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER, MAP]} />)

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByRole('heading', { name: 'A torn map' })).toBeInTheDocument()
    expect(
      within(items[1]).getByRole('heading', { name: 'The pressed-flower letter' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Dearest Mira — do not come back for me.')).toBeInTheDocument()
  })

  it('hands one out on a tap, and says the picture goes with it', async () => {
    const user = userEvent.setup()
    const revealed = { ...LETTER, revealedAt: new Date('2026-09-03T20:00:00.000Z') }
    mockFetch.mockResolvedValue(jsonResponse({ handout: revealed }))

    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER, MAP]} />)

    expect(screen.getByText('Hidden')).toBeInTheDocument()
    expect(screen.getByText('Revealed')).toBeInTheDocument()

    // The consequence names the picture, because revealing publishes the
    // bytes as well as the words.
    expect(
      screen.getByText(/Revealing shows its title, the text and the picture/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reveal to players' }))

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/campaigns/${CAMPAIGN_ID}/handouts/${LETTER.id}/reveal`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ revealed: true }) }),
    )
    await waitFor(() => expect(screen.getAllByText('Revealed')).toHaveLength(2))
  })

  // A handout's public layer is the artefact; what stays back is what it is.
  it('marks what it really is as the DM’s half', () => {
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    expect(screen.getByText('Behind the screen')).toBeInTheDocument()
    expect(screen.getByLabelText('DM only — never shown to players')).toBeInTheDocument()
    expect(
      screen.getByText(/None of this goes across the table with the handout/),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Written by the harbourmaster, in a hand that is not his.'),
    ).toBeInTheDocument()
  })

  // The store key never reaches the browser; the picture comes from the app's
  // own authed route, built from the handout's id.
  it('shows a picture through the authed image route, never a store address', () => {
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[MAP]} />)

    const picture = screen.getByRole('img', { name: 'A torn map' })

    expect(picture.getAttribute('src')).toContain(
      `/api/campaigns/${CAMPAIGN_ID}/handouts/${MAP.id}/image`,
    )
    expect(document.body.innerHTML).not.toContain('blob.vercel-storage.com')
  })

  it('offers to add a picture to a handout that has none', () => {
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    expect(screen.getByRole('button', { name: 'Add an image' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('keeps the add form closed until it is asked for, and takes text only', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[]} />)

    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add a handout' }))

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('What it says')).toBeInTheDocument()
    // The picture belongs to a row that exists; a new handout has no endpoint
    // to post one to yet.
    expect(screen.queryByRole('button', { name: 'Add an image' })).not.toBeInTheDocument()
  })

  it('posts a new handout, sending blank fields as null', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ handout: LETTER }, 201))

    await user.click(screen.getByRole('button', { name: 'Add a handout' }))
    await user.type(screen.getByLabelText('Title'), 'The pressed-flower letter')
    await user.click(screen.getByRole('button', { name: 'Add handout' }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/handouts`)
    expect(JSON.parse(String(init.body))).toEqual({
      title: 'The pressed-flower letter',
      body: null,
      provenance: null,
      dmNotes: null,
    })
  })

  it('will not post without a title', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[]} />)

    await user.click(screen.getByRole('button', { name: 'Add a handout' }))

    expect(screen.getByRole('button', { name: 'Add handout' })).toBeDisabled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('says what went wrong when the create is refused, and keeps the draft', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Give the handout a title' }, 400))

    await user.click(screen.getByRole('button', { name: 'Add a handout' }))
    await user.type(screen.getByLabelText('Title'), 'A letter')
    await user.click(screen.getByRole('button', { name: 'Add handout' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Give the handout a title'),
    )
    expect(screen.getByLabelText('Title')).toHaveValue('A letter')
  })

  it('patches an edited handout through its own endpoint and repaints from the answer', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ handout: { ...LETTER, body: 'Burn this when you have read it.' } }),
    )

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('What it says'))
    await user.type(screen.getByLabelText('What it says'), 'Burn this when you have read it.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByText('Burn this when you have read it.')).toBeInTheDocument(),
    )
    expect(mockFetch.mock.calls[0]?.[0]).toBe(`/api/campaigns/${CAMPAIGN_ID}/handouts/${LETTER.id}`)
  })

  it('repaints the row from the handout an upload answers with', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ handout: { ...LETTER, image: MAP.image } }))

    const file = new File(['x'], 'letter.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('The thing itself'), file)

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'The pressed-flower letter' })).toBeInTheDocument(),
    )
    expect(mockFetch.mock.calls[0]?.[0]).toBe(
      `/api/campaigns/${CAMPAIGN_ID}/handouts/${LETTER.id}/image`,
    )
  })

  it('deletes a handout once the confirmation is answered, and says the picture goes too', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[MAP]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ deleted: true }))

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText(/so does the picture, wherever it was stored/)).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledWith(`/api/campaigns/${CAMPAIGN_ID}/handouts/${MAP.id}`, {
      method: 'DELETE',
    })
  })

  it('keeps the handout and says so when the delete fails', async () => {
    const user = userEvent.setup()
    render(<HandoutBoard campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'No such handout' }, 500))

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('Could not delete that handout.'),
    )
    expect(
      screen.getByRole('heading', { name: 'The pressed-flower letter', hidden: true }),
    ).toBeInTheDocument()
  })
})
