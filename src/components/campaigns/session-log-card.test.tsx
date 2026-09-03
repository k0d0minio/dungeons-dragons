import { render, screen } from '@testing-library/react'

import type { SessionLogEntry } from '@/lib/db/session-log'

import { SessionLogCard } from './session-log-card'

// The DM's view of tonight (`dm-run-suite/session-log-recap`).

const ENTRIES: SessionLogEntry[] = [
  { kind: 'npc', id: 'n1', title: 'Bram', at: new Date('2026-09-03T19:30:00.000Z') },
  {
    kind: 'encounter',
    id: 'e1',
    title: 'Ambush at the ford',
    at: new Date('2026-09-03T20:10:00.000Z'),
  },
  {
    kind: 'secret',
    id: 'i1',
    title: 'The mayor is lying',
    at: new Date('2026-09-03T20:40:00.000Z'),
  },
]

function renderCard(props: Partial<Parameters<typeof SessionLogCard>[0]> = {}) {
  render(
    <SessionLogCard
      entries={ENTRIES}
      since={null}
      capturedNotes={null}
      capturedOn={null}
      {...props}
    />,
  )
}

describe('SessionLogCard', () => {
  it('lists what happened, labelled by kind and stamped with a time', () => {
    renderCard()

    expect(screen.getByText('Bram')).toBeInTheDocument()
    expect(screen.getByText('Person')).toBeInTheDocument()
    expect(screen.getByText('Fight')).toBeInTheDocument()
    expect(screen.getByText('Secret')).toBeInTheDocument()
    expect(screen.getByText('19:30')).toBeInTheDocument()
  })

  it('keeps the order it was given — a log reads forwards', () => {
    renderCard()

    const lines = screen.getAllByRole('listitem').map((item) => item.textContent)

    expect(lines[0]).toContain('Bram')
    expect(lines[1]).toContain('Ambush at the ford')
    expect(lines[2]).toContain('The mayor is lying')
  })

  it('says the log covers everything when no session has been closed', () => {
    renderCard()

    expect(screen.getByText(/has not closed a session yet/)).toBeInTheDocument()
  })

  it('names the last close when there is one, so the window is not a guess', () => {
    renderCard({ since: new Date('2026-09-02T22:40:00.000Z') })

    expect(
      screen.getByText(/since you closed the last session, 2 Sept 2026, 22:40/),
    ).toBeInTheDocument()
  })

  it('explains what fills the log rather than apologising for it being empty', () => {
    renderCard({ entries: [] })

    expect(screen.getByText(/Ending a fight, revealing an NPC/)).toBeInTheDocument()
  })

  it('shows the DM’s captured lines beside the derived facts', () => {
    renderCard({ capturedNotes: 'Innkeeper is called Bram', capturedOn: '2026-09-03' })

    expect(screen.getByText('Innkeeper is called Bram')).toBeInTheDocument()
    expect(screen.getByText(/Thu, 3 Sept 2026/)).toBeInTheDocument()
  })

  it('leaves the captured block out when nothing was typed', () => {
    renderCard({ capturedNotes: '   ', capturedOn: '2026-09-03' })

    expect(screen.queryByText(/Your notes/)).not.toBeInTheDocument()
  })
})
