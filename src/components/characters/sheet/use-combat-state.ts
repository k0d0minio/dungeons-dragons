'use client'

import { useCallback, useRef, useState } from 'react'

import { combatStateOf, type CombatState } from '@/lib/characters/combat'
import type { Character } from '@/lib/db/characters'

export interface CombatStateController {
  /** What the sheet renders: the optimistic state, ahead of the server. */
  state: CombatState
  /** True while a change is on its way to Neon. */
  saving: boolean
  /** Set when a change could not be saved and the sheet was rolled back. */
  error: string | null
  /** Apply a transition from `@/lib/characters/combat` and persist the result. */
  apply: (transition: (state: CombatState) => CombatState) => void
  dismissError: () => void
}

function messageForStatus(status: number): string {
  if (status === 401) return 'You have been signed out. Sign in again to keep tracking.'
  if (status === 404) return 'This character is no longer there. Reload the page.'
  return 'That change did not save. The sheet is showing the last saved values.'
}

/**
 * Combat state that renders instantly and persists in the background
 * (DND-009).
 *
 * The sheet is used mid-combat on a phone, so a tap paints immediately and the
 * request follows. Three things keep that honest:
 *
 * - **Absolute values.** Every request carries the whole tracked state, so two
 *   requests arriving out of order settle on the later one rather than
 *   compounding into a wrong hit point total.
 * - **One request at a time.** Sends are chained, and a tap made while one is
 *   in flight does not queue a second send behind an existing one — the already
 *   queued send picks up whatever the state has become by the time it runs. Ten
 *   rapid taps cost two requests, not ten.
 * - **Rollback, not silence.** A failed save puts the sheet back to the last
 *   value the server acknowledged and says so, because a hit point total that
 *   is only true on this phone is worse than one that is visibly stale.
 */
export function useCombatState(character: Character): CombatStateController {
  const initial = combatStateOf(character)

  const [state, setState] = useState<CombatState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** What the screen currently shows. */
  const latest = useRef(initial)
  /** The last state the server confirmed — where a failed save rolls back to. */
  const confirmed = useRef(initial)
  const chain = useRef<Promise<void>>(Promise.resolve())
  const queued = useRef(false)

  const characterId = character.id

  const apply = useCallback(
    (transition: (state: CombatState) => CombatState) => {
      const next = transition(latest.current)

      // A tap that changes nothing — spending a slot pool that is already
      // empty — should not cost a request.
      if (next === latest.current) return

      latest.current = next
      setState(next)
      setError(null)

      if (queued.current) return

      queued.current = true
      setSaving(true)

      chain.current = chain.current.then(async () => {
        // Claim the slot before reading the state, so a tap landing during the
        // request below queues a fresh send rather than riding on this one.
        queued.current = false
        const payload = latest.current

        try {
          const response = await fetch(`/api/characters/${characterId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            throw new Error(messageForStatus(response.status))
          }

          const body = (await response.json()) as { character: Character }
          const stored = combatStateOf(body.character)
          confirmed.current = stored

          // Only adopt the server's copy when nothing has been tapped since
          // this request left; otherwise the queued send is the current truth
          // and overwriting now would flicker the number back.
          if (latest.current === payload) {
            latest.current = stored
            setState(stored)
          }
        } catch (cause) {
          latest.current = confirmed.current
          setState(confirmed.current)
          setError(
            cause instanceof Error && cause.message
              ? cause.message
              : 'That change did not save. Check your connection.'
          )
        } finally {
          if (!queued.current) setSaving(false)
        }
      })
    },
    [characterId]
  )

  const dismissError = useCallback(() => setError(null), [])

  return { state, saving, error, apply, dismissError }
}
