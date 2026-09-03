/**
 * `localStorage`, or `null` where there isn't one.
 *
 * Server rendering has no `window`, and a browser in private mode can throw on
 * the *property access* rather than on the call — so both are guarded, and a
 * refusal to remember is never a refusal to work.
 *
 * Shared rather than copied, because there are now two things the app keeps on
 * the device — the wizard's draft and the welcome hand-off — and the reason the
 * guard has two arms is not obvious enough to survive being written twice.
 */
export function localStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** What is stored under `key`, or `null` — missing, or a store that refused. */
export function readLocal(key: string): string | null {
  const store = localStore()
  if (!store) return null

  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

/** Write `value`, or do nothing at all if the browser will not have it. */
export function writeLocal(key: string, value: string): void {
  const store = localStore()
  if (!store) return

  try {
    store.setItem(key, value)
  } catch {
    // A full quota — or a browser that refuses to store anything — costs the
    // player a convenience, never the thing they were doing.
  }
}

/** Forget `key`. Nothing depends on it having worked. */
export function removeLocal(key: string): void {
  const store = localStore()
  if (!store) return

  try {
    store.removeItem(key)
  } catch {
    // Nothing to do about it.
  }
}
