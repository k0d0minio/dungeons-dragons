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

// The four routes, each with its header, its chip and its empty state (D48).
// What the shell draws is `dm-tab.test.tsx`'s and what a tab is *about* is its
// own component's (`prep-board.test.tsx`) — this pins that each route is the
// shell under the right name, which is the whole of a tab page until its
// content lands.
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

it('Prep hands the shell its content, which needs the campaign in scope', async () => {
  // `dm-chronology/prep-tab` is the first tab with something under the chip,
  // and it is drawn from the campaign the shell resolved — so the page passes
  // a callback rather than a node, and the two never resolve the scope twice.
  const element = (await DmPrepPage()) as ReactElement<{ content?: unknown }>

  expect(element.props.content).toEqual(expect.any(Function))
})
