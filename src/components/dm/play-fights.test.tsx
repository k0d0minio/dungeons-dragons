import { render, screen, within } from '@testing-library/react'

import type { PlayFight } from '@/lib/db/encounters'

import { PlayFights } from './play-fights'

// The first two groups on the Play tab (`dm-chronology/play-tab`). What these
// pin is the split: a fight with initiative rolled is on the table and says
// whose turn it is; one built and never rolled for is waiting to be started.

const CAMPAIGN_ID = '7b2e4f1a-3c5d-4e6f-8a9b-0c1d2e3f4a5b'

function fight(overrides: Partial<PlayFight['encounter']>, combatants: PlayFight['combatants']) {
  return {
    encounter: {
      id: 'enc-1',
      campaignId: CAMPAIGN_ID,
      name: 'Ambush at the bridge',
      round: 1,
      activeTurn: 0,
      shareToken: 'kfEbCq3vX9pLm2Rt8sWz1A',
      completedAt: null,
      createdAt: new Date('2026-09-07T18:00:00.000Z'),
      updatedAt: new Date('2026-09-07T18:00:00.000Z'),
      ...overrides,
    },
    combatants,
  }
}

const LIVE = fight({ id: 'live', name: 'Ambush at the bridge', round: 2, activeTurn: 1 }, [
  { label: 'Aldric', initiative: 18 },
  { label: 'Goblin 1', initiative: 12 },
])

const BUILT = fight({ id: 'built', name: 'The crypt' }, [{ label: 'Skeleton 1', initiative: null }])

describe('PlayFights', () => {
  it('leads with the fight on the table, saying the round and whose turn it is', () => {
    render(<PlayFights campaignId={CAMPAIGN_ID} fights={[LIVE, BUILT]} />)

    const onTheTable = screen.getByRole('heading', { name: 'The fight' }).parentElement!
    const row = within(onTheTable).getByRole('link', { name: /Ambush at the bridge/ })

    expect(row).toHaveAttribute('href', '/dm/encounters/live')
    expect(within(onTheTable).getByText('Round 2 · Goblin 1’s turn')).toBeInTheDocument()
    expect(within(onTheTable).queryByText('The crypt')).not.toBeInTheDocument()
  })

  it('lists two open fights as two rows rather than picking one', () => {
    const second = fight({ id: 'second', name: 'The chase', round: 3 }, [
      { label: 'Cart', initiative: 20 },
    ])

    render(<PlayFights campaignId={CAMPAIGN_ID} fights={[LIVE, second]} />)

    const onTheTable = screen.getByRole('heading', { name: 'The fight' }).parentElement!
    expect(within(onTheTable).getAllByRole('link')).toHaveLength(2)
  })

  it('puts a fight built and never rolled for under Start a fight', () => {
    render(<PlayFights campaignId={CAMPAIGN_ID} fights={[BUILT]} />)

    const start = screen.getByRole('heading', { name: 'Start a fight' }).parentElement!
    expect(within(start).getByRole('link', { name: /The crypt/ })).toHaveAttribute(
      'href',
      '/dm/encounters/built',
    )
    expect(screen.getByText(/No fight on the table/)).toBeInTheDocument()
  })

  it('always offers the builder, and says so when nothing is waiting', () => {
    render(<PlayFights campaignId={CAMPAIGN_ID} fights={[]} />)

    expect(screen.getByRole('link', { name: /Build an encounter/ })).toHaveAttribute(
      'href',
      `/dm/campaigns/${CAMPAIGN_ID}/encounters/new`,
    )
    expect(screen.getByText('Nothing built and waiting.')).toBeInTheDocument()
  })
})
