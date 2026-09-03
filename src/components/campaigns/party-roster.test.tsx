import { render, screen } from '@testing-library/react'

import type { PartyMember } from '@/lib/db/discovered'

import { PartyRoster } from './party-roster'

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'
const CHARACTER_ID = '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c'

const MINE: PartyMember = {
  id: CHARACTER_ID,
  name: 'Vess Ondrel',
  level: 3,
  speciesIndex: 'high-elf',
  classIndex: 'wizard',
  portrait: null,
  isYours: true,
}

const THEIRS: PartyMember = {
  id: '5a8b0c2d-1e3f-4a5b-8c9d-0e1f2a3b4c5d',
  name: 'Grud',
  level: 3,
  speciesIndex: 'orc',
  classIndex: 'fighter',
  portrait: { contentType: 'image/jpeg', bytes: 24_000, uploadedAt: '2026-09-03T10:00:00.000Z' },
  isYours: false,
}

describe('PartyRoster', () => {
  it('names each character with what they are and what level', () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE, THEIRS]} />)

    expect(screen.getByText('Vess Ondrel')).toBeInTheDocument()
    expect(screen.getByText('Level 3 High-Elf Wizard')).toBeInTheDocument()
    expect(screen.getByText('Level 3 Orc Fighter')).toBeInTheDocument()
  })

  it("marks the reader's own character without reordering the list", () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE, THEIRS]} />)

    expect(screen.getByText('yours')).toBeInTheDocument()

    // Alphabetical on every phone is what makes the list something a table can
    // point at; pulling your own row to the top would break that.
    const names = screen.getAllByText(/Vess Ondrel|Grud/).map((node) => node.textContent)
    expect(names).toEqual(['Vess Ondrel', 'Grud'])
  })

  it('shows nothing but hit-point-free facts about other people', () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE, THEIRS]} />)

    // The DM's glance shows HP and conditions; this is a party list, and the
    // query behind it never selected them.
    expect(screen.queryByText(/HP|hit points/i)).not.toBeInTheDocument()
  })

  it('points a portrait at the app own authed route, cache-busted', () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[THEIRS]} />)

    const portrait = screen.getByRole('presentation', { hidden: true })

    expect(portrait).toHaveAttribute(
      'src',
      `/api/campaigns/${CAMPAIGN_ID}/party/${THEIRS.id}/portrait?v=${encodeURIComponent('2026-09-03T10:00:00.000Z')}`,
    )
  })

  it('falls back to initials rather than a broken image', () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE]} />)

    expect(screen.getByText('VO')).toBeInTheDocument()
    expect(screen.queryByRole('presentation', { hidden: true })).not.toBeInTheDocument()
  })

  it('links nowhere — another player sheet is not the reader to open', () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE, THEIRS]} />)

    // Sheets are owner-only, so a row that linked to one would 404. Offering
    // no link is better than offering a broken one.
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('says so plainly when nobody has brought a character yet', () => {
    render(<PartyRoster campaignId={CAMPAIGN_ID} party={[]} />)

    expect(screen.getByText(/Nobody has brought a character/)).toBeInTheDocument()
  })

  it('counts the party in words a person would use', () => {
    const { rerender } = render(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE]} />)
    expect(screen.getByText(/One character at this table/)).toBeInTheDocument()

    rerender(<PartyRoster campaignId={CAMPAIGN_ID} party={[MINE, THEIRS]} />)
    expect(screen.getByText(/2 characters at this table/)).toBeInTheDocument()
  })
})
