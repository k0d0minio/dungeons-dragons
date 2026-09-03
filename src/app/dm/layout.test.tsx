import { render, screen } from '@testing-library/react'

import DmLayout from './layout'

// The wall around `/dm/*` (`user-management/invites-and-roles`). What
// `requireDmUser` decides is `dm.test.ts`'s; this pins that every DM page
// sits behind it, and renders through once it answers.
jest.mock('@/lib/auth/dm', () => ({
  requireDmUser: jest.fn(async () => ({ id: 'user-1' })),
}))

import { requireDmUser } from '@/lib/auth/dm'

describe('the DM layout', () => {
  it('asks for the DM before rendering anything under it', async () => {
    render(await DmLayout({ children: <p>behind the screen</p> }))

    expect(requireDmUser).toHaveBeenCalledTimes(1)
    expect(screen.getByText('behind the screen')).toBeInTheDocument()
  })

  it('renders nothing when the gate throws — a redirect is a throw', async () => {
    ;(requireDmUser as jest.Mock).mockRejectedValueOnce(new Error('NEXT_REDIRECT:/characters'))

    await expect(DmLayout({ children: <p>behind the screen</p> })).rejects.toThrow(
      'NEXT_REDIRECT:/characters',
    )
  })
})
