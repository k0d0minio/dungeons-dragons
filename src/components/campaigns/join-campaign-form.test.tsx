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
  it('pre-ticks the character when there is exactly one', () => {
    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX]} />)

    expect(screen.getByRole('checkbox', { name: 'Bring Vex Ashbrand' })).toBeChecked()
  })

  it('pre-ticks nothing when there are several to choose from', () => {
    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX, BRUNE]} />)

    expect(screen.getByRole('checkbox', { name: 'Bring Vex Ashbrand' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Bring Brune Ironhide' })).not.toBeChecked()
  })

  it('toggles a character in and back out', async () => {
    const user = userEvent.setup()
    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX, BRUNE]} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Bring Brune Ironhide' })

    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('joins with the code and the ticked characters, then heads to /characters', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response)

    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[VEX]} />)

    await user.click(screen.getByRole('button', { name: 'Join Frostmaiden' }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/characters'))

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/campaigns/join')
    expect((init as RequestInit).method).toBe('POST')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      code: CODE,
      characterIds: [VEX.id],
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

  it('says you can join now and create a character afterwards when there are none', () => {
    render(<JoinCampaignForm code={CODE} campaignName="Frostmaiden" characters={[]} />)

    expect(
      screen.getByText('You have no characters yet — you can join now and create one afterwards.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join Frostmaiden' })).toBeEnabled()
  })
})
