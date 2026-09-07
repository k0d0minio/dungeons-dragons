'use client'

import { UserButton } from '@neondatabase/auth/react/ui'
import { useSyncExternalStore } from 'react'

/** Nothing to subscribe to: the value flips once, when hydration is over. */
const neverChanges = () => () => {}

/**
 * The signed-in account menu, drawn only once React has hydrated
 * (`triage/edit-page-hydration-error`).
 *
 * `UserButton` decides what to draw from Neon Auth's client-side session
 * store, which starts out pending and resolves when `/api/auth/get-session`
 * answers. A server render only ever sees it pending, so whether the menu
 * appeared in the first client render was a race against that request — and
 * when the request won, React found markup it had not rendered and threw the
 * page's whole tree away (React #418, once per load).
 *
 * `useSyncExternalStore` is the primitive that settles it: React is required
 * to use the server snapshot for the hydrating render and the client one
 * afterwards, so the server renders nothing, the first client render renders
 * nothing, and the menu arrives on the render after that. The slot is the
 * same width either way, so nothing moves.
 */
export function AccountButton() {
  const hydrated = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  )

  if (!hydrated) return null

  return <UserButton />
}
