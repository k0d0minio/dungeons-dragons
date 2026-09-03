/**
 * The destination a signed-out visitor asked for, carried across the sign-in
 * wall (`triage/sign-in-return-destination`).
 *
 * `src/proxy.ts` writes it onto the sign-in URL; `src/app/auth/[path]/page.tsx`
 * reads it back and hands it to `<AuthView redirectTo>`, which is where the
 * player lands once the form succeeds. The one case that matters is a campaign
 * join link (`/campaigns/join/[code]`, DND-046): a DM sends it to someone who
 * is by definition signed out, and before this the wall dropped it on the floor.
 *
 * **The whole point of this module is the sanitiser.** Whatever lands in the
 * browser's `location` after sign-in is chosen by a query parameter anyone can
 * write, so it must never be able to name another origin — `?redirectTo=
 * https://dnd-companion.evil.example` on an otherwise genuine sign-in link is a
 * phishing page wearing this app's URL. `safeReturnPath` is the only way that
 * value is ever read: it returns a path on this origin or `null`, never a URL.
 *
 * The parameter is called `redirectTo` because that is the name the Neon Auth
 * UI already uses — its own sign-in ⇄ sign-up footer link copies
 * `window.location.search` verbatim, so a visitor who needs to register instead
 * keeps the destination for free.
 */

/** The query parameter carrying the destination on the sign-in URL. */
export const RETURN_TO_PARAM = 'redirectTo'

/**
 * Where sign-in lands when nothing asked for anywhere in particular. Shared by
 * `src/app/providers.tsx` (the Neon Auth UI context default) and
 * `src/app/auth/[path]/page.tsx`, which must always pass an explicit
 * destination — see the note there — and so needs the same fallback.
 */
export const DEFAULT_SIGNED_IN_PATH = '/characters'

/**
 * A same-origin path, or `null`.
 *
 * Rejects everything that is not a plain rooted path: absolute URLs
 * (`https://evil.example`), scheme-relative ones (`//evil.example`, and the
 * backslash spellings browsers normalise to it), anything carrying a scheme
 * (`javascript:`, and `data:`), control characters that could smuggle a header
 * break, and relative paths, which have no fixed meaning once the wall has
 * moved the visitor to `/auth/sign-in`.
 *
 * A fragment is dropped: it never reaches the server, so it cannot have been
 * part of what the wall saw, and keeping one would only be a place to hide a
 * second target.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.length === 0) return null

  // Control characters (including CR/LF, tab and NUL) never appear in a real
  // path, and are the classic way to smuggle something past a naive check:
  // browsers strip them before resolving, so a value carrying one is not the
  // path it looks like.
  if (/[\u0000-\u001f\u007f]/.test(value)) return null

  // Must be rooted, and the second character must not turn it into an
  // authority. Browsers treat `\` as `/` in this position, so both spellings
  // of `//host` are rejected.
  if (value[0] !== '/') return null
  if (value[1] === '/' || value[1] === '\\') return null

  // Parsing against a throwaway base is what actually settles the question: a
  // value that names any origin at all resolves away from the base and is
  // rejected. `new URL` also normalises `/foo/../..//evil` down to something we
  // can check, which string tests alone do not.
  let parsed: URL
  try {
    parsed = new URL(value, 'https://return-to.invalid')
  } catch {
    return null
  }

  if (parsed.origin !== 'https://return-to.invalid') return null
  if (parsed.pathname[0] !== '/' || parsed.pathname[1] === '/') return null

  return `${parsed.pathname}${parsed.search}`
}

/**
 * The sign-in URL that carries `destination` home again — or the bare sign-in
 * path when the destination is not somewhere this app can send anyone.
 *
 * `destination` is a pathname plus its query, as `src/proxy.ts` reads it off
 * the request; sending someone back to `/library?q=fireball` without the query
 * would be landing them somewhere else.
 */
export function signInUrlWithReturnTo(signInPath: string, destination: string): string {
  const safe = safeReturnPath(destination)
  if (!safe || safe === signInPath) return signInPath

  return `${signInPath}?${RETURN_TO_PARAM}=${encodeURIComponent(safe)}`
}
