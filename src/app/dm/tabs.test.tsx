import type { ReactElement } from 'react'

// The shell reaches Neon Auth, which throws at import without its env; nothing
// here calls it, but importing the shell to compare against does load it.
jest.mock('@/lib/auth/server', () => ({
  requireSessionUser: jest.fn(),
}))

import { DmTab } from '@/components/dm/dm-tab'

import DmPlayPage from './play/page'
import DmPrepPage from './prep/page'
import DmSessionsPage from './sessions/page'

// The four routes exist after this stub, each with its header, its chip and
// its empty state (D48); their content arrives in `prep-tab`, `play-tab` and
// `sessions-tab`. What the shell draws is `dm-tab.test.tsx`'s — this pins that
// each route is the shell under the right name, which is the whole of a tab
// page until its content lands.
describe.each([
  ['Prep', DmPrepPage],
  ['Play', DmPlayPage],
  ['Sessions', DmSessionsPage],
])('the %s tab', (title, Page) => {
  it('is the shared DM shell, titled for its place in the night', async () => {
    const element = (await Page()) as ReactElement<{ title: string; subtitle?: string }>

    expect(element.type).toBe(DmTab)
    expect(element.props.title).toBe(title)
    expect(element.props.subtitle).toEqual(expect.any(String))
  })
})
