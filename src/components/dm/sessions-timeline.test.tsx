import { render, screen, within } from '@testing-library/react'

import type { CampaignNote } from '@/lib/db/schema'
import type { SessionNight } from '@/lib/db/session-log'

import { SessionsTimeline } from './sessions-timeline'

// The Sessions tab's timeline (`dm-chronology/sessions-tab`): every night in
// order, what state each is in, and what to do about it next. The words are
// `src/lib/sessions/timeline.ts`' and have their own tests; what is on trial
// here is the screen — one labelled row per night, the chips per state, the
// orphan group, the earlier tables, and that a closed campaign offers nothing
// to press.

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const RECAP_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'
const CLOSED_ID = '11111111-2222-4333-8444-555555555555'

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

const PLAN = {
  id: PLAN_ID,
  campaignId: CAMPAIGN_ID,
  title: 'Session 4 — the shrine',
  sessionDate: '2026-09-14',
  revealedAt: null,
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
}

const UPCOMING: SessionNight = {
  kind: 'upcoming',
  id: PLAN_ID,
  date: '2026-09-14',
  since: null,
  until: null,
  recap: null,
  plan: PLAN,
  entries: [],
  notes: [],
}

const TONIGHT: SessionNight = {
  kind: 'tonight',
  id: 'tonight',
  date: '2026-09-07',
  since: null,
  until: null,
  recap: null,
  plan: null,
  entries: [
    {
      kind: 'encounter',
      id: 'f1',
      title: 'Ambush on the mole',
      at: new Date('2026-09-07T19:00:00.000Z'),
    },
  ],
  notes: [note({ sessionDate: '2026-09-07' })],
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
  plan: null,
  entries: [],
  notes: [note({ id: 'note-2' })],
}

function draw(overrides: Partial<Parameters<typeof SessionsTimeline>[0]> = {}) {
  return render(
    <SessionsTimeline
      campaignId={CAMPAIGN_ID}
      nights={[UPCOMING, TONIGHT, PLAYED]}
      tallies={{
        [PLAN_ID]: {
          ready: 5,
          total: 8,
          scenes: { total: 5, ran: 4 },
          secrets: { total: 8, found: 3 },
        },
      }}
      orphanNotes={[]}
      sessionZero={{ date: '2026-08-14', written: true }}
      {...overrides}
    />,
  )
}

describe('SessionsTimeline', () => {
  it('labels every night with the state it is in and the day it is on', () => {
    draw()

    expect(screen.getByText('Upcoming · Mon 14 Sept')).toBeInTheDocument()
    expect(screen.getByText('Tonight · 7 Sept · open')).toBeInTheDocument()
    expect(screen.getByText('Played · Thu 3 Sept')).toBeInTheDocument()
  })

  it('reads newest first — the night you want is the next one or the last one', () => {
    draw()

    const labels = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)

    expect(labels).toEqual([
      'Upcoming · Mon 14 Sept',
      'Tonight · 7 Sept · open',
      'Played · Thu 3 Sept',
      'Before · Fri 14 Aug',
    ])
  })

  it('offers one chip on an upcoming night: prep it', () => {
    draw()

    expect(screen.getByRole('link', { name: 'Prep ›' })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}`,
    )
    expect(screen.getByText('Plan 5 of 8 steps ready')).toBeInTheDocument()
  })

  it('offers tonight the close step and the way back to the table', () => {
    draw()

    expect(screen.getByRole('link', { name: 'Close the session → recap' })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-log`,
    )
    expect(screen.getByRole('link', { name: 'Play ›' })).toHaveAttribute('href', '/dm/play')
    expect(screen.getByText('1 fight ended · 1 note')).toBeInTheDocument()
  })

  it('offers a played night its recap, and says the party can read it', () => {
    draw()

    expect(screen.getByRole('link', { name: 'Recap ✓' })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/sessions/${RECAP_ID}`,
    )
    expect(screen.getByText('Recap shared with players · 1 note')).toBeInTheDocument()
  })

  it('sends tonight’s own row to the page that can close it', () => {
    draw()

    expect(screen.getByRole('link', { name: /Tonight/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/session-log`,
    )
  })

  it('ends the rail with what came before the first night', () => {
    draw()

    const zero = screen.getByRole('link', { name: /Session zero/ })

    expect(zero).toHaveAttribute('href', `/dm/campaigns/${CAMPAIGN_ID}#session-zero`)
    expect(within(zero).getByText('Written')).toBeInTheDocument()
  })

  it('files a note whose date matches no night under its own group rather than losing it', () => {
    draw({ orphanNotes: [note({ id: 'orphan', sessionDate: '2026-07-01' })] })

    expect(screen.getByText('Notes without a night')).toBeInTheDocument()
    expect(screen.getByText('The harbourmaster wants a favour.')).toBeInTheDocument()
  })

  it('teaches in the empty state, with one thing to do', () => {
    draw({ nights: [], sessionZero: null })

    expect(screen.getByText('No nights yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan your first night ›' })).toHaveAttribute(
      'href',
      '/dm/prep',
    )
  })

  it('lists the tables behind you, each a row into its own timeline', () => {
    draw({
      earlier: [{ id: CLOSED_ID, name: 'The tutorial night', closedOn: '2026-08-30', nights: 1 }],
    })

    const row = screen.getByRole('link', { name: /The tutorial night/ })

    expect(row).toHaveAttribute('href', `/dm/campaigns/${CLOSED_ID}/sessions`)
    expect(within(row).getByText('1 night')).toBeInTheDocument()
  })

  it('is read-only on a closed campaign — history is not a thing you press', () => {
    draw({ readOnly: true })

    expect(screen.queryByRole('link', { name: 'Prep ›' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Close the session → recap' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Recap ✓' })).not.toBeInTheDocument()

    // The nights themselves are still readable: it is history, not a locked door.
    expect(screen.getByText('Played · Thu 3 Sept')).toBeInTheDocument()
  })

  it('teaches nothing to press on a closed campaign with no nights on it', () => {
    draw({ nights: [], sessionZero: null, readOnly: true })

    expect(screen.queryByRole('link', { name: 'Plan your first night ›' })).not.toBeInTheDocument()
  })
})
