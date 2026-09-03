import { render, screen } from '@testing-library/react'

import type { DiscoveredHandout } from '@/lib/db/discovered'

import { DiscoveredHandouts } from './discovered-handouts'

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const HANDOUT_ID = '6d1e2f30-4a5b-4c7d-9e0f-2a3b4c5d6e7f'

const LETTER: DiscoveredHandout = {
  id: HANDOUT_ID,
  campaignId: CAMPAIGN_ID,
  title: 'The pressed flower letter',
  body: 'Come alone.\nBurn this.',
  revealedAt: new Date('2026-08-15T19:00:00.000Z'),
  imageUploadedAt: '2026-09-03T10:00:00.000Z',
}

const TEXT_ONLY: DiscoveredHandout = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  campaignId: CAMPAIGN_ID,
  title: 'The inscription',
  body: 'Seven went down. Six came up.',
  revealedAt: new Date('2026-08-14T19:00:00.000Z'),
  imageUploadedAt: null,
}

describe('DiscoveredHandouts', () => {
  it('renders nothing when the DM has produced nothing', () => {
    const { container } = render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the artefact — the title, the text and the picture', () => {
    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    expect(screen.getByText('The pressed flower letter')).toBeInTheDocument()
    expect(screen.getByText(/Come alone/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'The pressed flower letter' })).toBeInTheDocument()
  })

  it("points the image at the app's own member-scoped route, cache-busted", () => {
    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[LETTER]} />)

    // The store key never reached this component — the row carries only the
    // upload time, which is both the "there is one" and the `?v=`.
    expect(screen.getByRole('img', { name: 'The pressed flower letter' })).toHaveAttribute(
      'src',
      `/api/campaigns/${CAMPAIGN_ID}/discovered/handouts/${HANDOUT_ID}/image?v=${encodeURIComponent('2026-09-03T10:00:00.000Z')}`,
    )
  })

  it('renders a text-only handout without an empty image frame', () => {
    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[TEXT_ONLY]} />)

    expect(screen.getByText(/Seven went down/)).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('keeps the order it was given — the last one produced, first', () => {
    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[LETTER, TEXT_ONLY]} />)

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent?.replace(/\d.*$/, '').trim())

    expect(titles).toEqual(['The pressed flower letter', 'The inscription'])
  })

  it('cannot render what the DM kept back', () => {
    const leaky = {
      ...LETTER,
      provenance: 'A forgery. The duke never wrote it.',
      dmNotes: 'Produce this only after they open the crypt.',
    } as unknown as DiscoveredHandout

    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[leaky]} />)

    expect(screen.queryByText(/forgery/)).not.toBeInTheDocument()
    expect(screen.queryByText(/open the crypt/)).not.toBeInTheDocument()
  })

  it('renders a picture with no words under it', () => {
    // A handout may be text, an image, or both — prep arrives in the order the
    // DM thinks of it, and a scan with no transcription is a whole handout.
    const scanOnly = { ...LETTER, body: null }

    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[scanOnly]} />)

    expect(screen.getByRole('img', { name: 'The pressed flower letter' })).toBeInTheDocument()
    expect(
      screen.getByText('The pressed flower letter').closest('li')?.querySelectorAll('p'),
    ).toHaveLength(0)
  })

  it('omits the date for a row with no reveal timestamp', () => {
    const undated = { ...TEXT_ONLY, revealedAt: null }

    render(<DiscoveredHandouts campaignId={CAMPAIGN_ID} handouts={[undated]} />)

    expect(screen.getByText('The inscription')).toBeInTheDocument()
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument()
  })
})
