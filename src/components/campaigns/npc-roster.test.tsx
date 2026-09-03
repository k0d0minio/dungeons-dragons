import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { CampaignNpc } from '@/lib/db/schema'
import { NPC_SECRET_FIELDS } from '@/lib/npcs/schema'

import { NpcRoster } from './npc-roster'

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

const VANE: CampaignNpc = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: CAMPAIGN_ID,
  revealedAt: null,
  createdAt: new Date('2026-08-29T10:00:00.000Z'),
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
  name: 'Vane',
  summary: 'Runs the docks, and is bought',
  description: 'A tall man with ink on his cuffs.',
  motivation: 'Pay off the debt before his sister hears of it.',
  secrets: 'He signed the manifest that lost the Marigold.',
  twist: null,
  statReference: null,
  dmNotes: null,
}

const ALDA: CampaignNpc = {
  ...VANE,
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  name: 'Alda',
  summary: null,
  description: null,
  motivation: null,
  secrets: null,
  revealedAt: new Date('2026-08-30T19:00:00.000Z'),
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('NpcRoster', () => {
  it('lists NPCs alphabetically with their one-line summary', () => {
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE, ALDA]} />)

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByRole('heading', { name: 'Alda' })).toBeInTheDocument()
    expect(within(items[1]).getByRole('heading', { name: 'Vane' })).toBeInTheDocument()
    expect(within(items[1]).getByText('Runs the docks, and is bought')).toBeInTheDocument()
  })

  it('says which NPCs the party has been shown, and does not offer to change it', () => {
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE, ALDA]} />)

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Revealed')).toBeInTheDocument()
    expect(within(items[1]).getByText('Hidden')).toBeInTheDocument()

    // Revealing is `dm-run-suite/reveal-controls`, not this screen.
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('marks the DM-only half as secret wherever it is written', () => {
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    const secret = screen.getByRole('heading', { name: 'Behind the screen' }).closest('section')

    expect(secret).not.toBeNull()
    expect(within(secret as HTMLElement).getByLabelText(/never shown to players/i)).toBeVisible()
    expect(
      within(secret as HTMLElement).getByText(/He signed the manifest that lost the Marigold\./),
    ).toBeInTheDocument()

    // The public layer is outside that block, and the secret is not in it.
    expect(screen.getByText('A tall man with ink on his cuffs.')).toBeInTheDocument()
    expect(
      within(secret as HTMLElement).queryByText('A tall man with ink on his cuffs.'),
    ).not.toBeInTheDocument()
  })

  it('renders no secret block for an NPC with nothing written in it', () => {
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[ALDA]} />)

    expect(screen.queryByRole('heading', { name: 'Behind the screen' })).not.toBeInTheDocument()
  })

  it('keeps the add form closed until it is asked for', async () => {
    const user = userEvent.setup()
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[]} />)

    expect(screen.getByText(/No NPCs yet/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add an NPC' }))

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    // Both layers are on the form, and the DM-only one is marked.
    for (const field of NPC_SECRET_FIELDS) {
      expect(screen.getByLabelText(field.label)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: 'Behind the screen' })).toBeInTheDocument()
  })

  it('posts a new NPC, sending blank fields as null, and adds it in order', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ npc: ALDA }, 201))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Add an NPC' }))
    await user.type(screen.getByLabelText('Name'), 'Alda')
    await user.type(screen.getByLabelText('What they want'), 'Get out of the city')
    await user.click(screen.getByRole('button', { name: 'Add NPC' }))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/npcs`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Alda',
      summary: null,
      description: null,
      motivation: 'Get out of the city',
      secrets: null,
      twist: null,
      statReference: null,
      dmNotes: null,
    })

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByRole('heading', { name: 'Alda' })).toBeInTheDocument()
  })

  it('will not post without a name', async () => {
    const user = userEvent.setup()
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[]} />)

    await user.click(screen.getByRole('button', { name: 'Add an NPC' }))

    expect(screen.getByRole('button', { name: 'Add NPC' })).toBeDisabled()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('says what went wrong when the create is refused, and keeps the draft', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Give them a name' }, 400))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[]} />)

    await user.click(screen.getByRole('button', { name: 'Add an NPC' }))
    await user.type(screen.getByLabelText('Name'), 'Alda')
    await user.click(screen.getByRole('button', { name: 'Add NPC' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Give them a name')
    expect(screen.getByLabelText('Name')).toHaveValue('Alda')
  })

  it('patches an edited NPC through its own endpoint and repaints from the answer', async () => {
    const user = userEvent.setup()
    const renamed = { ...VANE, name: 'Vane the elder' }
    mockFetch.mockResolvedValue(jsonResponse({ npc: renamed }))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Vane the elder')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Vane the elder' })).toBeInTheDocument(),
    )

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/npcs/${VANE.id}`)
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toMatchObject({ name: 'Vane the elder' })
  })

  it('clears a field the DM emptied by sending null, not an empty string', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ npc: { ...VANE, secrets: null } }))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('What they are hiding'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toMatchObject({ secrets: null })
  })

  it('leaves the row alone and says so when a save fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Nope' }, 500))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Vane the elder')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Nope'))
    // Still editing, and the row still reads as it did.
    expect(screen.getByLabelText('Name')).toHaveValue('Vane the elder')
  })

  it('restores the row when an edit is cancelled', async () => {
    const user = userEvent.setup()
    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Someone else')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('heading', { name: 'Vane' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Vane')
  })

  it('deletes an NPC once the confirmation is answered', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument())

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`/api/campaigns/${CAMPAIGN_ID}/npcs/${VANE.id}`)
    expect(init?.method).toBe('DELETE')
  })

  it('keeps the NPC and says so when the delete fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Nope' }, 500))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[VANE]} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Could not delete that NPC.'))

    // The confirmation stays open on a failure, and Radix hides the page behind
    // it from the accessibility tree — hence `hidden`. The row is still there.
    expect(screen.getByRole('heading', { name: 'Delete Vane?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Vane', hidden: true })).toBeInTheDocument()
  })

  it('says a network failure is a network failure', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<NpcRoster campaignId={CAMPAIGN_ID} npcs={[]} />)

    await user.click(screen.getByRole('button', { name: 'Add an NPC' }))
    await user.type(screen.getByLabelText('Name'), 'Alda')
    await user.click(screen.getByRole('button', { name: 'Add NPC' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Check your connection/)
  })
})
