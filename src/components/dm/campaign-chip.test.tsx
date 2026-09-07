import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CampaignChip } from './campaign-chip'

const refresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

const OPEN = { id: '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b', name: 'The Rime of the Frostmaiden' }
const OTHER = { id: '9c3d5e2b-4f6a-4b7c-9d0e-1f2a3b4c5d6e', name: 'Storm of the Thursday Table' }

beforeEach(() => {
  // jsdom keeps one cookie jar per document; clear what a previous test wrote.
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; path=/; max-age=0`
  }
})

describe('the campaign chip', () => {
  it('names the active campaign under the title', () => {
    render(<CampaignChip campaign={OPEN} />)

    expect(screen.getByRole('button', { name: `Campaign: ${OPEN.name}` })).toBeInTheDocument()
  })

  it('offers campaign settings, at the campaign’s own door for now', async () => {
    const user = userEvent.setup()

    render(<CampaignChip campaign={OPEN} />)

    await user.click(screen.getByRole('button', { name: `Campaign: ${OPEN.name}` }))

    expect(await screen.findByRole('menuitem', { name: /Campaign settings/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${OPEN.id}`,
    )
  })

  it('switches by writing the cookie the server reads, not by navigating', async () => {
    const user = userEvent.setup()

    render(<CampaignChip campaign={OPEN} others={[OTHER]} />)

    await user.click(screen.getByRole('button', { name: `Campaign: ${OPEN.name}` }))
    await user.click(await screen.findByRole('menuitem', { name: OTHER.name }))

    // The scope changes under the tab you are already on: a cookie the next
    // server render reads, then a refresh — never a route change.
    expect(document.cookie).toContain(`dm_campaign=${OTHER.id}`)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('lists only the other open campaigns — the active one is the chip', async () => {
    const user = userEvent.setup()

    render(<CampaignChip campaign={OPEN} others={[OTHER]} />)

    await user.click(screen.getByRole('button', { name: `Campaign: ${OPEN.name}` }))

    const active = await screen.findByRole('menuitem', { name: OPEN.name })
    expect(active).toHaveAttribute('aria-disabled', 'true')
  })
})
