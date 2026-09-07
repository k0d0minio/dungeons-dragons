import type { CampaignNote } from '@/lib/db/schema'
import type { SessionLogEntry, SessionNight } from '@/lib/db/session-log'
import type { PlanTally } from '@/lib/db/session-plans'

import {
  actsLine,
  beforeLabel,
  formatNightDate,
  nightChips,
  nightDetail,
  nightHref,
  nightLabel,
  nightTitle,
  notesWithoutANight,
  planRanLine,
} from './timeline'

// What a night's row says, and what it offers to do about it
// (`dm-chronology/sessions-tab`). No database in the room: `listNights` decides
// what a night is and has its own tests, and this file is only the words.

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const PLAN_ID = '3c9d1e0f-2a4b-4c6d-8e0f-1a2b3c4d5e6f'
const RECAP_ID = '0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e'

function note(overrides: Partial<CampaignNote> = {}): CampaignNote {
  return {
    id: RECAP_ID,
    campaignId: CAMPAIGN_ID,
    sessionDate: '2026-09-03',
    body: 'They talked the harbourmaster round.',
    sharedWithPlayers: false,
    sessionClosedAt: null,
    planId: null,
    createdAt: new Date('2026-09-03T20:00:00.000Z'),
    updatedAt: new Date('2026-09-03T20:00:00.000Z'),
    ...overrides,
  }
}

function entry(kind: SessionLogEntry['kind'], id: string): SessionLogEntry {
  return { kind, id, title: `A ${kind}`, at: new Date('2026-09-03T20:00:00.000Z') }
}

function night(overrides: Partial<SessionNight> = {}): SessionNight {
  return {
    kind: 'played',
    id: RECAP_ID,
    date: '2026-09-03',
    since: null,
    until: new Date('2026-09-03T23:00:00.000Z'),
    recap: note({ sharedWithPlayers: true, sessionClosedAt: new Date('2026-09-03T23:00:00.000Z') }),
    plan: null,
    entries: [],
    notes: [],
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

describe('formatNightDate', () => {
  it('is short enough for a phone row — no year on a list already in order', () => {
    expect(formatNightDate('2026-09-14')).toBe('Mon 14 Sept')
  })

  it('drops the weekday when the label has already named the day', () => {
    expect(formatNightDate('2026-09-07', { weekday: false })).toBe('7 Sept')
  })

  it('hands back anything that is not a date rather than inventing one', () => {
    expect(formatNightDate('later')).toBe('later')
  })
})

describe('nightLabel', () => {
  it('says a night is coming, and when', () => {
    expect(nightLabel(night({ kind: 'upcoming', date: '2026-09-14', plan: PLAN }))).toBe(
      'Upcoming · Mon 14 Sept',
    )
  })

  it('says tonight is open — the one thing that distinguishes it from history', () => {
    expect(nightLabel(night({ kind: 'tonight', id: 'tonight', date: '2026-09-07' }))).toBe(
      'Tonight · 7 Sept · open',
    )
  })

  it('says a night was played, and when', () => {
    expect(nightLabel(night())).toBe('Played · Thu 3 Sept')
  })

  it('says so plainly when a plan has no date on it yet', () => {
    expect(nightLabel(night({ kind: 'upcoming', date: null }))).toBe('Upcoming · no date yet')
  })

  it('labels what came before the first night by its date', () => {
    expect(beforeLabel('2026-08-14')).toBe('Before · Fri 14 Aug')
  })
})

describe('nightTitle', () => {
  it('is what the DM called the night while planning it', () => {
    expect(nightTitle(night({ plan: PLAN }))).toBe('Session 4 — the shrine')
  })

  it('falls back to the recap’s first line when the night ran without a plan', () => {
    expect(nightTitle(night())).toBe('They talked the harbourmaster round.')
  })

  it('trims a recap that opens with a paragraph rather than a heading', () => {
    const long = 'x'.repeat(200)

    expect(nightTitle(night({ recap: note({ body: long }) }))).toHaveLength(65)
  })

  it('says something honest when there is neither a plan nor a recap', () => {
    expect(nightTitle(night({ recap: null }))).toBe('A night with no plan')
    expect(nightTitle(night({ kind: 'tonight', recap: null }))).toBe('Tonight')
  })
})

describe('actsLine', () => {
  it('counts what happened, in the order the night produced it', () => {
    const entries = [
      entry('encounter', '1'),
      entry('npc', '2'),
      entry('location', '3'),
      entry('handout', '4'),
      entry('secret', '5'),
      entry('secret', '6'),
    ]

    expect(actsLine(entries, 1)).toBe('1 fight ended · 3 revealed · 2 secrets found · 1 note')
  })

  it('names only what happened — a quiet night is not four zeroes', () => {
    expect(actsLine([], 2)).toBe('2 notes')
  })

  it('is empty when nothing at all happened', () => {
    expect(actsLine([], 0)).toBe('')
  })
})

describe('nightDetail', () => {
  const tally: PlanTally = {
    ready: 5,
    total: 8,
    scenes: { total: 5, ran: 4 },
    secrets: { total: 8, found: 3 },
  }

  it('asks an upcoming night how far through its prep it is', () => {
    expect(nightDetail(night({ kind: 'upcoming', plan: PLAN }), tally)).toBe(
      'Plan 5 of 8 steps ready',
    )
  })

  it('asks tonight what has piled up so far', () => {
    const tonight = night({
      kind: 'tonight',
      recap: null,
      entries: [entry('encounter', '1')],
      notes: [note()],
    })

    expect(nightDetail(tonight, null)).toBe('1 fight ended · 1 note')
  })

  it('says nothing has happened yet rather than leaving the line blank', () => {
    expect(nightDetail(night({ kind: 'tonight', recap: null }), null)).toBe('Nothing recorded yet')
  })

  it('tells a played night that the party can already read it', () => {
    expect(nightDetail(night({ notes: [note(), note()] }), null)).toBe(
      'Recap shared with players · 2 notes',
    )
  })

  it('does not claim a recap is shared when it is not', () => {
    expect(nightDetail(night({ recap: note({ sharedWithPlayers: false }) }), null)).toBe(
      'Recap written',
    )
  })
})

describe('nightChips', () => {
  it('offers to prep an upcoming night, and nothing else', () => {
    expect(nightChips(night({ kind: 'upcoming', plan: PLAN }), CAMPAIGN_ID)).toEqual([
      { label: 'Prep ›', href: `/dm/campaigns/${CAMPAIGN_ID}/session-plans/${PLAN_ID}` },
    ])
  })

  it('offers to close tonight or go back to the table', () => {
    expect(nightChips(night({ kind: 'tonight' }), CAMPAIGN_ID)).toEqual([
      {
        label: 'Close the session → recap',
        href: `/dm/campaigns/${CAMPAIGN_ID}/session-log`,
        primary: true,
      },
      { label: 'Play ›', href: '/dm/play' },
    ])
  })

  it('offers a played night’s recap', () => {
    expect(nightChips(night(), CAMPAIGN_ID)).toEqual([
      { label: 'Recap ✓', href: `/dm/campaigns/${CAMPAIGN_ID}/sessions/${RECAP_ID}` },
    ])
  })

  it('offers nothing at all on a campaign that is closed — history is read', () => {
    for (const kind of ['upcoming', 'tonight', 'played'] as const) {
      expect(nightChips(night({ kind }), CAMPAIGN_ID, { readOnly: true })).toEqual([])
    }
  })
})

describe('nightHref', () => {
  it('sends tonight to the page that can close it', () => {
    expect(nightHref(night({ kind: 'tonight', id: 'tonight' }), CAMPAIGN_ID)).toBe(
      `/dm/campaigns/${CAMPAIGN_ID}/session-log`,
    )
  })

  it('sends every other night to its own page, keyed the way listNights keys it', () => {
    expect(nightHref(night(), CAMPAIGN_ID)).toBe(
      `/dm/campaigns/${CAMPAIGN_ID}/sessions/${RECAP_ID}`,
    )
  })
})

describe('planRanLine', () => {
  it('says how much of the plan the night actually used', () => {
    expect(
      planRanLine({
        ready: 8,
        total: 8,
        scenes: { total: 5, ran: 4 },
        secrets: { total: 8, found: 3 },
      }),
    ).toBe('4 of 5 scenes ran · 3 of 8 secrets found')
  })

  it('names only the halves that exist', () => {
    expect(
      planRanLine({
        ready: 1,
        total: 8,
        scenes: { total: 1, ran: 0 },
        secrets: { total: 0, found: 0 },
      }),
    ).toBe('0 of 1 scene ran')
  })

  it('says so when the plan has neither scenes nor secrets on it', () => {
    expect(
      planRanLine({
        ready: 0,
        total: 8,
        scenes: { total: 0, ran: 0 },
        secrets: { total: 0, found: 0 },
      }),
    ).toBe('Nothing written on it')
  })
})

describe('notesWithoutANight', () => {
  const filed = note({ id: 'filed', sessionDate: '2026-09-03' })
  const orphan = note({ id: 'orphan', sessionDate: '2026-07-01' })
  const older = note({ id: 'older', sessionDate: '2026-06-01' })

  it('keeps a note whose date matches no night, rather than losing it', () => {
    const nights = [night({ notes: [filed] })]

    expect(notesWithoutANight(nights, [filed, orphan])).toEqual([orphan])
  })

  it('never treats a recap as an orphan — a recap is a night', () => {
    const recap = note({
      id: 'recap',
      sessionClosedAt: new Date('2026-09-03T23:00:00.000Z'),
      sharedWithPlayers: true,
    })

    expect(notesWithoutANight([], [recap])).toEqual([])
  })

  it('orders the leftovers newest first, like the timeline above them', () => {
    expect(notesWithoutANight([], [older, orphan]).map((one) => one.id)).toEqual([
      'orphan',
      'older',
    ])
  })

  it('is empty when every note is filed under a night', () => {
    expect(notesWithoutANight([night({ notes: [filed] })], [filed])).toEqual([])
  })
})
