import { render, screen } from '@testing-library/react'

import type { PublicLocation, PublicNpc } from '@/lib/db/discovered'

import { DiscoveredList } from './discovered-list'

const NPC: PublicNpc = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  campaignId: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  name: 'Harbourmaster Vane',
  summary: 'Runs the docks',
  description: 'A tall man with ink on his cuffs.\nSpeaks slowly.',
  revealedAt: new Date('2026-08-15T19:00:00.000Z'),
}

const LOCATION: PublicLocation = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  campaignId: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b',
  name: 'Saltmarsh',
  summary: 'The fishing village, and it is empty',
  description: null,
  revealedAt: new Date('2026-08-15T19:00:00.000Z'),
}

describe('DiscoveredList', () => {
  it('renders nothing at all when nothing has been revealed', () => {
    // The page says "nothing yet" once, for all three sections, rather than
    // three empty boxes saying it separately.
    const { container } = render(
      <DiscoveredList title="People you have met" description="…" entries={[]} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the public layer under the heading it was given', () => {
    render(<DiscoveredList title="People you have met" description="…" entries={[NPC]} />)

    expect(screen.getByText('People you have met')).toBeInTheDocument()
    expect(screen.getByText('Harbourmaster Vane')).toBeInTheDocument()
    expect(screen.getByText('Runs the docks')).toBeInTheDocument()
    expect(screen.getByText(/A tall man with ink on his cuffs/)).toBeInTheDocument()
  })

  it('serves places from the same component as people', () => {
    render(<DiscoveredList title="Places you have found" description="…" entries={[LOCATION]} />)

    expect(screen.getByText('Saltmarsh')).toBeInTheDocument()
    expect(screen.getByText('The fishing village, and it is empty')).toBeInTheDocument()
  })

  it('dates each entry with when the party learned it', () => {
    render(<DiscoveredList title="People you have met" description="…" entries={[NPC]} />)

    expect(screen.getByText('15 Aug 2026')).toBeInTheDocument()
  })

  it('leaves out a blurb the DM has not written', () => {
    render(<DiscoveredList title="Places you have found" description="…" entries={[LOCATION]} />)

    // Null is "not written yet", and an empty paragraph would render as a gap
    // the reader has to interpret.
    expect(screen.getByText('Saltmarsh').closest('li')?.querySelectorAll('p')).toHaveLength(1)
  })

  it('cannot render a DM-only field, because it has none to render', () => {
    // The belt to the query's braces. `listDiscoveredNpcs` never selects these
    // columns and `PublicNpc` has no such property — so this cast is the only
    // way to get one here at all, and it stands in for a future edit that
    // widened the selection without widening this component.
    const leaky = {
      ...NPC,
      secrets: 'He signed the manifest that lost the Marigold.',
      motivation: 'Pay off the debt.',
      dmNotes: 'Never finishes a sentence about the wreck.',
    } as unknown as PublicNpc

    render(<DiscoveredList title="People you have met" description="…" entries={[leaky]} />)

    expect(screen.queryByText(/Marigold/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pay off the debt/)).not.toBeInTheDocument()
    expect(screen.queryByText(/finishes a sentence/)).not.toBeInTheDocument()
  })

  it('renders a bare name when that is all the DM wrote', () => {
    // A DM sketches a name at prep time and fills the rest in the week before
    // it matters. Null is "not written yet", and an empty paragraph would read
    // as something the reader was meant to notice.
    const sketch = { ...LOCATION, summary: null, description: null }

    render(<DiscoveredList title="Places you have found" description="…" entries={[sketch]} />)

    expect(screen.getByText('Saltmarsh')).toBeInTheDocument()
    expect(screen.getByText('Saltmarsh').closest('li')?.querySelectorAll('p')).toHaveLength(0)
  })

  it('omits the date for a row with no reveal timestamp', () => {
    // Unreachable through `listDiscoveredNpcs`, which selects only rows whose
    // `revealed_at` is set. The guard is here so a future caller that is less
    // careful renders a missing date as nothing rather than as "Invalid Date".
    const undated = { ...NPC, revealedAt: null }

    render(<DiscoveredList title="People you have met" description="…" entries={[undated]} />)

    expect(screen.getByText('Harbourmaster Vane')).toBeInTheDocument()
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument()
  })
})
