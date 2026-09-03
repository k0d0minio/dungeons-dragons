import {
  composeRecapDraft,
  describeLogEntry,
  formatLogMoment,
  formatLogTime,
  sessionLogLabel,
} from './session-log'
import type { SessionLogEntry } from '@/lib/db/session-log'

// The words half of the session log (`dm-run-suite/session-log-recap`) — pure,
// so this suite is where the draft's shape is settled without a database.

function entry(partial: Partial<SessionLogEntry> & Pick<SessionLogEntry, 'kind'>): SessionLogEntry {
  return {
    id: 'row',
    title: 'Something',
    at: new Date('2026-09-03T20:00:00.000Z'),
    ...partial,
  }
}

describe('describeLogEntry', () => {
  it('speaks in the party’s voice, so a draft line is already half a sentence', () => {
    expect(describeLogEntry(entry({ kind: 'encounter', title: 'Ambush at the ford' }))).toBe(
      'Fought Ambush at the ford',
    )
    expect(describeLogEntry(entry({ kind: 'npc', title: 'Bram' }))).toBe('Met Bram')
    expect(describeLogEntry(entry({ kind: 'location', title: 'The drowned shrine' }))).toBe(
      'Reached The drowned shrine',
    )
    expect(describeLogEntry(entry({ kind: 'handout', title: 'The torn letter' }))).toBe(
      'Were given The torn letter',
    )
    expect(describeLogEntry(entry({ kind: 'scene', title: 'They reach the docks' }))).toBe(
      'Played They reach the docks',
    )
    expect(describeLogEntry(entry({ kind: 'secret', title: 'The mayor is lying' }))).toBe(
      'Learned The mayor is lying',
    )
  })

  it('never says "revealed" — that is the app describing its own mechanism', () => {
    const lines = (['npc', 'location', 'handout'] as const).map((kind) =>
      describeLogEntry(entry({ kind })),
    )

    expect(lines.some((line) => line.toLowerCase().includes('reveal'))).toBe(false)
  })
})

describe('sessionLogLabel', () => {
  it('labels each kind in one word', () => {
    expect(sessionLogLabel('encounter')).toBe('Fight')
    expect(sessionLogLabel('secret')).toBe('Secret')
  })
})

describe('formatLogTime', () => {
  it('is a clock time in UTC, so server and client render the same string', () => {
    expect(formatLogTime(new Date('2026-09-03T20:47:00.000Z'))).toBe('20:47')
    expect(formatLogTime('2026-09-03T20:47:00.000Z')).toBe('20:47')
  })

  it('is empty for a value that is not a time, rather than "Invalid Date"', () => {
    expect(formatLogTime('not a date')).toBe('')
  })
})

describe('formatLogMoment', () => {
  it('spells the date and the time, for the line naming the last close', () => {
    expect(formatLogMoment(new Date('2026-09-03T20:47:00.000Z'))).toBe('3 Sept 2026, 20:47')
  })

  it('is empty for a value that is not a moment', () => {
    expect(formatLogMoment('nonsense')).toBe('')
  })
})

describe('composeRecapDraft', () => {
  it('puts the derived facts first and the DM’s own lines under them', () => {
    const draft = composeRecapDraft({
      entries: [
        entry({ kind: 'npc', title: 'Bram' }),
        entry({ kind: 'encounter', title: 'Ambush at the ford' }),
      ],
      capturedNotes: 'They let the cultist go.',
    })

    expect(draft).toBe('Met Bram\nFought Ambush at the ford\n\nThey let the cultist go.')
  })

  it('is the facts alone when nothing was captured', () => {
    expect(
      composeRecapDraft({ entries: [entry({ kind: 'npc', title: 'Bram' })], capturedNotes: null }),
    ).toBe('Met Bram')
  })

  it('is the captured lines alone when nothing was derived', () => {
    expect(composeRecapDraft({ entries: [], capturedNotes: 'A whole session of talking.' })).toBe(
      'A whole session of talking.',
    )
  })

  it('is empty when there is nothing at all, so the form opens blank', () => {
    expect(composeRecapDraft({ entries: [], capturedNotes: '   ' })).toBe('')
  })
})
