'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** The player rail (D25) — the same beat as the sheet and the party glance. */
const REFRESH_INTERVAL_MS = 15_000

/**
 * Keeps the player's campaign view current, so a reveal lands without anyone
 * reloading (`dm-run-suite/reveal-controls`).
 *
 * The page it sits on is a server component whose three queries already carry
 * membership, `revealed_at is not null` and a public-column selection. So this
 * asks the *page* to run again — `router.refresh()`, on the 15 s rail — rather
 * than fetching a new endpoint. That is the whole reason it is written this
 * way: a JSON route for "what has my DM shown me" would be a fourth
 * player-facing surface to hold the three arms up on, and this way there is
 * nothing new to leak from. The cost is an RSC payload every 15 s per player at
 * a table of five, which at this app's scale is not a cost.
 *
 * Paused while the tab is hidden, like the table screen: a phone in a pocket
 * mid-combat should not be polling.
 *
 * Renders nothing. It is mounted for its effect, and the page reads exactly the
 * same with it removed — just staler.
 */
export function DiscoveredRefresh() {
  const router = useRouter()

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      router.refresh()
    }

    const interval = setInterval(tick, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [router])

  return null
}
