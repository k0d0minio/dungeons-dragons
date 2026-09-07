import DmHomePage from './page'

// D48: `/dm` stopped being the campaign list and became a door. The front
// door still sends the `dm` role here, and installed shortcuts still point at
// it, so what matters is where it lands.
jest.mock('next/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

import { redirect } from 'next/navigation'

describe('/dm', () => {
  it('sends the DM to Play — opening the app puts the table in front of you', async () => {
    await expect(DmHomePage()).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/dm/play')
  })
})
