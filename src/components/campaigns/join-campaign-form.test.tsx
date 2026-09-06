import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { JoinCampaignForm } from './join-campaign-form'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const CODE = 'kfEbCq3vX9pLm2Rt8sWz1A'
const VEX = {
  id: '3f1c9d2e-7a4b-4c8d-9e5f-1a2b3c4d5e6f',
  name: 'Vex Ashbrand',
  summary: 'Level 5 Half-Elf Wizard',
}
const BRUNE = {
  id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e',
  name: 'Brune Ironhide',
  summary: 'Level 3 Dwarf Fighter',
}

describe('JoinCampaignForm', () => {
  // `first-table/one-character`: no picker — a player is their character, and
  // the form says who is joining.
  it('says who is joining and offers nothing to tick', () => {
    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX]} />)

    expect(screen.getByRole('list', { name: 'Joining as' })).toHaveTextContent('Vex Ashbrand')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('joins as the one character and lands on its sheet', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX]} />)

    await user.click(screen.getByRole('button', { name: 'Join Frostmaiden' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(`/characters/${VEX.id}`))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/campaigns/join')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      code: CODE,
      characterIds: [VEX.id],
    })
  })

  it('brings every character a player somehow owns, and lands on the list', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX, BRUNE]} />)

    await user.click(screen.getByRole('button', { name: 'Join Frostmaiden' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/characters'))
    expect(JSON.parse(String((mockFetch.mock.calls[0][1] as RequestInit).body))).toEqual({
      code: CODE,
      characterIds: [VEX.id, BRUNE.id],
    })
  })

  it('shows the server’s words on a dead code, without navigating', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'That join link is no longer live.' }),
    } as Response)

    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX]} />)

    await user.click(screen.getByRole('button', { name: 'Join Frostmaiden' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That join link is no longer live.')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('offers to walk a player with no characters through making one', () => {
    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[]} />)

    expect(screen.getByText(/You have no characters yet/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Join Frostmaiden and make a character' }),
    ).toBeEnabled()
  })

  // The loop `guided-creation/wizard-frame` closes: a player who joins with no
  // characters used to land on an empty list, and whatever they made afterwards
  // was never attached to the table they had just joined.
  it('sends a player with no characters into the wizard, carrying the campaign', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        campaign: { id: 'a1b2c3d4-0000-4000-8000-000000000001', name: 'Frostmaiden' },
      }),
    } as Response)

    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[]} />)

    await user.click(screen.getByRole('button', { name: 'Join Frostmaiden and make a character' }))

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/characters/new?campaign=a1b2c3d4-0000-4000-8000-000000000001',
      ),
    )
  })

  it('falls back to the plain wizard when the join response names no campaign', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[]} />)

    await user.click(screen.getByRole('button', { name: 'Join Frostmaiden and make a character' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/characters/new'))
  })
})
