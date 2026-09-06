// The DM's note as text (first-table/dm-character-notes,
// first-table/between-sessions-questions): the seeded headings, and an append
// that lands under the right heading, once.
import {
  DM_NOTE_HEADINGS,
  DM_NOTE_TEMPLATE,
  appendUnderHeading,
  sessionAnswersBlock,
} from './dm-note'

describe('the template', () => {
  it('opens with the four headings, in order, each with a hint under it', () => {
    const lines = DM_NOTE_TEMPLATE.split('\n')
    const headingLines = lines.filter((line) =>
      (DM_NOTE_HEADINGS as readonly string[]).includes(line),
    )

    expect(headingLines).toEqual(['The player', 'Hooks', 'Ask next session', 'Threads'])
    expect(DM_NOTE_TEMPLATE).toMatch(/The player\nWhat they want/)
    expect(DM_NOTE_TEMPLATE).toMatch(/Threads\nWhat came up/)
  })
})

describe('appendUnderHeading', () => {
  it('adds the block at the end of the heading’s section, before the next heading', () => {
    const note = 'The player\nSam. Nervous about talking.\n\nHooks\nOwes the smith.\n\nThreads\n'

    const next = appendUnderHeading(note, 'Hooks', 'Knows the innkeeper.')

    expect(next).toBe(
      'The player\nSam. Nervous about talking.\n\nHooks\nOwes the smith.\nKnows the innkeeper.\n\nThreads\n',
    )
  })

  it('appends under the last heading without eating the trailing newline', () => {
    const note = 'Threads\n'

    expect(appendUnderHeading(note, 'Threads', '2026-09-10 — Highlight: the shove.')).toBe(
      'Threads\n2026-09-10 — Highlight: the shove.\n',
    )
  })

  it('adds the heading itself when the DM rewrote the page without it', () => {
    expect(appendUnderHeading('Just prose.', 'Threads', 'A line.')).toBe(
      'Just prose.\n\nThreads\nA line.\n',
    )
    expect(appendUnderHeading('', 'Threads', 'A line.')).toBe('Threads\nA line.\n')
  })

  it('never adds the same block twice, so a retried close is harmless', () => {
    const once = appendUnderHeading(DM_NOTE_TEMPLATE, 'Threads', '2026-09-10 — Wants next: gold.')

    expect(appendUnderHeading(once, 'Threads', '2026-09-10 — Wants next: gold.')).toBe(once)
    expect(appendUnderHeading(once, 'Threads', '   ')).toBe(once)
  })

  it('adds only the lines the note does not already carry', () => {
    // A retry after the DM edited one answer: the untouched lines are already
    // there, so only the edited one lands.
    const first = '2026-09-10 — Highlight: the shove\n2026-09-10 — Wants next: gold.'
    const once = appendUnderHeading('Threads\n', 'Threads', first)

    const edited = '2026-09-10 — Highlight: the shove, twice\n2026-09-10 — Wants next: gold.'
    expect(appendUnderHeading(once, 'Threads', edited)).toBe(
      'Threads\n2026-09-10 — Highlight: the shove\n2026-09-10 — Wants next: gold.\n2026-09-10 — Highlight: the shove, twice\n',
    )
  })
})

describe('sessionAnswersBlock', () => {
  it('dates each answered line, highlight first, and skips the blanks', () => {
    expect(
      sessionAnswersBlock('2026-09-10', {
        favouriteMoment: ' the shove ',
        wantsNext: '',
        highlight: 'Talked the guard down',
      }),
    ).toBe(
      '2026-09-10 — Highlight: Talked the guard down\n2026-09-10 — Favourite moment: the shove',
    )

    expect(sessionAnswersBlock('2026-09-10', {})).toBe('')
  })
})
