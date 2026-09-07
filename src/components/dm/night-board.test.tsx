import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { CampaignNote } from '@/lib/db/schema'
import type { SessionNight } from '@/lib/db/session-log'

import { NightBoard } from './night-board'

// One night, top to bottom (`dm-chronology/sessions-tab`): the recap the party
// reads, what happened while it ran, the DM's own notes from that evening, and
// the plan it ran from. Four sections, and the same component draws tonight —
// so what is on trial here is that each section says the right thing for the
// state the night is in.

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const RECAP_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'

function note(overrides: Partial<CampaignNote> = {}): CampaignNote {
  return {
    id: 'note-1',
    campaignId: CAMPAIGN_ID,
    sessionDate: '2026-09-03',
    body: 'The harbourmaster wants a favour.',
    sharedWithPlayers: false,
    sessionClosedAt: null,
    planId: null,
    createdAt: new Date('2026-09-03T20:00:00.000Z'),
    updatedAt: new Date('2026-09-03T20:00:00.000Z'),
    ...overrides,
  }
}

const PLAYED: SessionNight = {
  kind: 'played',
  id: RECAP_ID,
  date: '2026-09-03',
  since: null,
  until: new Date('2026-09-03T23:00:00.000Z'),
  recap: note({
    id: RECAP_ID,
    sharedWithPlayers: true,
    sessionClosedAt: new Date('2026-09-03T23:00:00.000Z'),
    body: 'They talked the harbourmaster round.',
  }),
  plan: {
    id: PLAN_ID,
    campaignId: CAMPAIGN_ID,
    title: 'Session 4 — the shrine',
    sessionDate: '2026-09-03',
    revealedAt: null,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
  },
  entries: [
    {
      kind: 'encounter',
      id: 'f1',
      title: 'Ambush on the mole',
      at: new Date('2026-09-03T20:47:00.000Z'),
    },
    {
      kind: 'secret',
      id: 's1',
      title: 'The tide is not natural',
      at: new Date('2026-09-03T21:10:00.000Z'),
    },
  ],
  notes: [note()],
}

const TALLY = {
  ready: 8,
  total: 8,
  scenes: { total: 5, ran: 4 },
  secrets: { total: 8, found: 3 },
}

function draw(
  night: SessionNight = PLAYED,
  props: { tally?: typeof TALLY | null; readOnly?: boolean } = {},
) {
  return render(
    <NightBoard
      campaignId={CAMPAIGN_ID}
      night={night}
      tally={props.tally === undefined ? TALLY : props.tally}
      readOnly={props.readOnly}
    />,
  )
}

describe('NightBoard', () => {
  it('prints the recap under a header that says who else is reading it', () => {
    draw()

    expect(screen.getByText('Recap · players read this')).toBeInTheDocument()
    expect(screen.getByText('They talked the harbourmaster round.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Edit the recap/ })).toBeInTheDocument()
  })

  it('does not claim the party can read a recap that was never shared', () => {
    draw({ ...PLAYED, recap: note({ id: RECAP_ID, sharedWithPlayers: false }) })

    expect(screen.getByText('Recap · not shared')).toBeInTheDocument()
  })

  it('has no recap section at all on a night that has not been closed', () => {
    draw({ ...PLAYED, kind: 'tonight', id: 'tonight', recap: null })

    expect(screen.queryByText(/^Recap/)).not.toBeInTheDocument()
  })

  it('lists what happened as time, kind and title, oldest first', () => {
    draw()

    expect(screen.getByText('What happened')).toBeInTheDocument()
    expect(screen.getByText('Ambush on the mole')).toBeInTheDocument()
    expect(screen.getByText('20:47 · Fight')).toBeInTheDocument()
    expect(screen.getByText('21:10 · Secret')).toBeInTheDocument()
  })

  it('says a quiet night was quiet, and what would have filled it', () => {
    draw({ ...PLAYED, entries: [] })

    expect(screen.getByText('Nothing recorded')).toBeInTheDocument()
    expect(screen.getByText(/land here on their own/)).toBeInTheDocument()
  })

  it('files the DM’s own notes under the night, each with its state in a word', () => {
    draw()

    const row = screen.getByRole('button', { name: /The harbourmaster wants a favour/ })

    expect(screen.getByText('Your notes')).toBeInTheDocument()
    expect(within(row).getByText('Private')).toBeInTheDocument()
  })

  it('writes a new note already filed under this night', async () => {
    const user = userEvent.setup()
    draw()

    const write = screen.getByRole('button', { name: /Write a note/ })
    expect(within(write).getByText('Filed under Thu, 3 Sept 2026.')).toBeInTheDocument()

    await user.click(write)

    expect(await screen.findByRole('heading', { name: 'Write a note' })).toBeInTheDocument()
    expect(screen.getByText('Filed under Thu, 3 Sept 2026.', { selector: 'p' })).toBeInTheDocument()
  })

  it('leads into the plan the night ran from, with how much of it was used', () => {
    draw()

    const row = screen.getByRole('link', { name: /Session 4 — the shrine/ })

    expect(screen.getByText('The plan that night')).toBeInTheDocument()
    expect(row).toHaveAttribute('href', `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`)
    expect(within(row).getByText('4 of 5 scenes ran · 3 of 8 secrets found')).toBeInTheDocument()
  })

  it('says plainly when a night was closed without a plan on it', () => {
    draw({ ...PLAYED, plan: null }, { tally: null })

    expect(screen.getByText('No plan')).toBeInTheDocument()
    expect(screen.getByText(/No plan was linked to this night/)).toBeInTheDocument()
  })

  it('calls the plan section tonight’s while the night is still open', () => {
    draw({ ...PLAYED, kind: 'tonight', id: 'tonight', recap: null })

    expect(screen.getByText('The plan tonight')).toBeInTheDocument()
  })

  it('adds nothing to a closed campaign — a table that is over gains no notes', () => {
    draw(PLAYED, { readOnly: true })

    expect(screen.queryByRole('button', { name: /Write a note/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /The harbourmaster wants a favour/ }),
    ).toBeInTheDocument()
  })
})
