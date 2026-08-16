import { render, screen } from '@testing-library/react'

import type { SharedNote } from '@/lib/db/notes'

import { SharedNotesCard } from './shared-notes-card'

const NOTE: SharedNote = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignName: 'The Rime of the Frostmaiden',
  sessionDate: '2026-08-15',
  body: 'The road north is closed.',
}

const OTHER_TABLE: SharedNote = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  campaignName: 'Storm of the Thursday Table',
  sessionDate: '2026-08-14',
  body: 'The duke wants a word.',
}

describe('SharedNotesCard', () => {
  it('renders nothing when the DM has shared nothing', () => {
    // A permanent empty box on a sheet that is already several screens long
    // would be worse than silence.
    const { container } = render(<SharedNotesCard notes={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows each shared note under its session date', () => {
    render(<SharedNotesCard notes={[NOTE]} />)

    expect(screen.getByText('The road north is closed.')).toBeInTheDocument()
    expect(screen.getByText('Sat, 15 Aug 2026')).toBeInTheDocument()
  })

  it('leaves the campaign name off when there is only one table', () => {
    render(<SharedNotesCard notes={[NOTE]} />)

    expect(screen.queryByText(/The Rime of the Frostmaiden/)).not.toBeInTheDocument()
  })

  it('names the campaign once a character sits at two tables', () => {
    render(<SharedNotesCard notes={[NOTE, OTHER_TABLE]} />)

    expect(screen.getByText(/The Rime of the Frostmaiden/)).toBeInTheDocument()
    expect(screen.getByText(/Storm of the Thursday Table/)).toBeInTheDocument()
  })

  it('is read-only — there is nothing here for a player to change', () => {
    render(<SharedNotesCard notes={[NOTE]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
