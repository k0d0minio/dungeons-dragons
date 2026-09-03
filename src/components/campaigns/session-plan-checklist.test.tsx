import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { toast } from 'sonner'

import type { SessionPlanItem } from '@/lib/db/schema'

import { SessionPlanChecklist } from './session-plan-checklist'

// The list a DM taps mid-session (`dm-prep-suite/session-plans`).
//
// Two properties matter more than the CRUD here and are tested first: **one tap
// ticks a line**, with no mode to enter and nothing else on the row to hit by
// mistake; and the tick lands on screen before the request comes back, because
// a phone at a table cannot wait on a round trip.

const mockToastError = toast.error as jest.MockedFunction<typeof toast.error>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const BASE = `/api/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}/items`

const FIRST: SessionPlanItem = {
  id: '11111111-2222-4333-8444-555555555555',
  planId: PLAN_ID,
  kind: 'secret',
  body: 'The lighthouse is kept dark on purpose',
  sortOrder: 0,
  checkedAt: null,
  createdAt: new Date('2026-09-03T10:00:00.000Z'),
  updatedAt: new Date('2026-09-03T10:00:00.000Z'),
}

const SECOND: SessionPlanItem = {
  ...FIRST,
  id: '66666666-7777-4888-8999-aaaaaaaaaaaa',
  body: 'The harbourmaster is paid in coral',
  sortOrder: 1,
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

/** The component with the parent's state wired up, as the board wires it. */
function Harness({ initial = [FIRST, SECOND] }: { initial?: SessionPlanItem[] }) {
  const [items, setItems] = require('react').useState(initial)

  return (
    <SessionPlanChecklist
      campaignId={CAMPAIGN_ID}
      planId={PLAN_ID}
      kind="secret"
      heading="Secrets & clues"
      blurb="About ten one-liners."
      addLabel="Add a secret or clue"
      placeholder="One thing they could learn tonight"
      empty="No secrets yet."
      items={items}
      onItemsChange={(updater: (all: SessionPlanItem[]) => SessionPlanItem[]) =>
        setItems((current: SessionPlanItem[]) => updater(current))
      }
    />
  )
}

beforeEach(() => {
  mockFetch.mockReset()
  mockToastError.mockReset()
})

describe('SessionPlanChecklist', () => {
  it('shows the lines with a running count of what has been used', () => {
    render(<Harness initial={[{ ...FIRST, checkedAt: new Date() }, SECOND]} />)

    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText(FIRST.body)).toBeInTheDocument()
  })

  it('says so, in the section’s own words, when there is nothing in it yet', () => {
    render(<Harness initial={[]} />)

    expect(screen.getByText('No secrets yet.')).toBeInTheDocument()
  })

  // The whole point of the feature: check off a secret in one tap.
  it('ticks a line off with one tap on the row itself', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(
      jsonResponse({ item: { ...FIRST, checkedAt: '2026-09-17T20:00:00.000Z' } }),
    )

    render(<Harness />)

    const row = screen.getByRole('button', { name: FIRST.body })
    expect(row).toHaveAttribute('aria-pressed', 'false')

    await user.click(row)

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/${FIRST.id}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ checked: true }) }),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: FIRST.body })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
  })

  it('unticks a line that was already used', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ item: FIRST }))

    render(<Harness initial={[{ ...FIRST, checkedAt: new Date() }]} />)

    await user.click(screen.getByRole('button', { name: FIRST.body }))

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/${FIRST.id}`,
      expect.objectContaining({ body: JSON.stringify({ checked: false }) }),
    )
  })

  it('puts the row back and says so when the tick does not save', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'nope' }, 500))

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: FIRST.body }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: FIRST.body })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('puts the row back when the request never leaves the phone', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValue(new Error('offline'))

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: FIRST.body }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: FIRST.body })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('adds a line and clears the field', async () => {
    const user = userEvent.setup()
    const added = { ...FIRST, id: 'new', body: 'A third thing' }
    mockFetch.mockResolvedValue(jsonResponse({ item: added }, 201))

    render(<Harness />)

    const field = screen.getByLabelText('Add a secret or clue')
    await user.type(field, 'A third thing')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mockFetch).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'secret', body: 'A third thing' }),
      }),
    )
    await waitFor(() => expect(screen.getByText('A third thing')).toBeInTheDocument())
    expect(field).toHaveValue('')
  })

  it('adds on Enter, so a thumb never leaves the keyboard', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ item: { ...FIRST, id: 'new', body: 'Typed' } }, 201))

    render(<Harness />)

    await user.type(screen.getByLabelText('Add a secret or clue'), 'Typed{Enter}')

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  })

  it('reports why a line did not save, in the API’s own words', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Write the line first' }, 400))

    render(<Harness />)

    await user.type(screen.getByLabelText('Add a secret or clue'), 'x')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Write the line first'))
  })

  // Arranging and rewording are prep, not play. They live behind a toggle so a
  // stray touch mid-session cannot delete a secret or nudge the order.
  it('keeps the arrows and the delete out of reading mode entirely', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByRole('button', { name: 'Move down' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Arrange' }))

    expect(screen.getAllByRole('button', { name: 'Move down' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: FIRST.body })).not.toBeInTheDocument()
  })

  it('moves a line and sends the whole order back', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(
      jsonResponse({
        items: [
          { ...SECOND, sortOrder: 0 },
          { ...FIRST, sortOrder: 1 },
        ],
      }),
    )

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))

    const rows = screen.getAllByRole('listitem')
    await user.click(within(rows[1]).getByRole('button', { name: 'Move up' }))

    expect(mockFetch).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ kind: 'secret', ids: [SECOND.id, FIRST.id] }),
      }),
    )
  })

  it('cannot move the first line up or the last one down', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))

    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByRole('button', { name: 'Move up' })).toBeDisabled()
    expect(within(rows[1]).getByRole('button', { name: 'Move down' })).toBeDisabled()
  })

  it('puts the order back when the reorder does not save', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({}, 500))

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))
    await user.click(screen.getAllByRole('button', { name: 'Move up' })[1])

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Done' }))
    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]).getByText(FIRST.body)).toBeInTheDocument()
  })

  it('rewords a line when the field loses focus, and not before', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ item: { ...FIRST, body: 'Reworded' } }))

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))

    const field = screen.getAllByLabelText('Line')[0]
    await user.clear(field)
    await user.type(field, 'Reworded')
    expect(mockFetch).not.toHaveBeenCalled()

    await user.tab()

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/${FIRST.id}`,
        expect.objectContaining({ body: JSON.stringify({ body: 'Reworded' }) }),
      ),
    )
  })

  it('does not send a reword that changed nothing, or blanked the line', async () => {
    const user = userEvent.setup()

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))

    const field = screen.getAllByLabelText('Line')[0]
    await user.click(field)
    await user.tab()

    await user.clear(field)
    await user.tab()

    expect(mockFetch).not.toHaveBeenCalled()
    expect(field).toHaveValue(FIRST.body)
  })

  it('deletes a line', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({ deleted: true }))

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))
    await user.click(screen.getByRole('button', { name: `Delete ${FIRST.body}` }))

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/${FIRST.id}`, { method: 'DELETE' })
    await waitFor(() => expect(screen.queryByDisplayValue(FIRST.body)).not.toBeInTheDocument())
  })

  it('says so when a delete or a reword fails, and keeps the line', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue(jsonResponse({}, 500))

    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Arrange' }))
    await user.click(screen.getByRole('button', { name: `Delete ${FIRST.body}` }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(screen.getByDisplayValue(FIRST.body)).toBeInTheDocument()
  })
})
