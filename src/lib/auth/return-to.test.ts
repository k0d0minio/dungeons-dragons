/**
 * The sanitiser in front of the sign-in wall's return destination
 * (`triage/sign-in-return-destination`).
 *
 * Everything here is the same test twice over: a real destination survives the
 * round trip, and anything that could name a second origin does not. The
 * second half is a phishing checklist, not a formality — the value it guards
 * ends up in the browser's `location` after a successful sign-in, chosen by a
 * query parameter anyone can put on a link that otherwise looks exactly like
 * this app's.
 */
import { RETURN_TO_PARAM, safeReturnPath, signInUrlWithReturnTo } from './return-to'

const SIGN_IN_PATH = '/auth/sign-in'

describe('safeReturnPath', () => {
  it.each([
    ['/campaigns/join/RIME42', 'the campaign join link — the case that matters (DND-046)'],
    ['/characters', 'the list'],
    ['/characters/3dc11dd3-fc15-408b-8701-bd4d991f0e1c', 'a sheet'],
    ['/dm/campaigns/8c1f', 'a DM screen'],
    ['/', 'the front door'],
  ])('keeps %s — %s', (pathname) => {
    expect(safeReturnPath(pathname)).toBe(pathname)
  })

  it('keeps the query, because a shared link without it lands somewhere else', () => {
    expect(safeReturnPath('/library?q=fireball&type=spell')).toBe('/library?q=fireball&type=spell')
  })

  it('drops a fragment: the server never saw one, so it cannot be part of the destination', () => {
    expect(safeReturnPath('/rules/combat#opportunity-attacks')).toBe('/rules/combat')
  })

  it('normalises a traversal rather than trusting how it reads', () => {
    // `/dm/../characters` is `/characters`; what matters is that whatever comes
    // back is the resolved path, so nothing is judged safe on its spelling.
    expect(safeReturnPath('/dm/../characters')).toBe('/characters')
  })

  it.each([
    ['https://evil.example/harvest', 'a whole other origin, spelled out'],
    ['http://evil.example', 'the same, unencrypted'],
    ['//evil.example/harvest', 'scheme-relative — a URL wearing a path costume'],
    ['//evil.example', 'the same, bare'],
    ['/\\evil.example/harvest', 'browsers read the backslash as the second slash'],
    ['\\\\evil.example', 'and both of them'],
    ['/\\\\evil.example', 'and a rooted pair'],
    ['javascript:alert(document.cookie)', 'not a navigation at all'],
    ['data:text/html,<script>fetch("//evil.example")</script>', 'nor this'],
    ['https:/evil.example', 'a scheme with one slash still resolves off-origin'],
    ['/..//evil.example', 'traversal that resolves to an authority'],
  ])('refuses %s — %s', (value) => {
    expect(safeReturnPath(value)).toBeNull()
  })

  it.each([
    ['characters', 'relative: meaningless once the wall has moved you to sign-in'],
    ['', 'empty'],
    ['   ', 'blank'],
    ['?next=/characters', 'a bare query is not a destination'],
    ['#fragment', 'nor a bare fragment'],
  ])('refuses %s — %s', (value) => {
    expect(safeReturnPath(value)).toBeNull()
  })

  it.each([
    ['/characters\nLocation: https://evil.example', 'a newline, the header-splitting classic'],
    ['/characters\r\nSet-Cookie: a=b', 'a full CRLF pair'],
    ['/\tevil.example', 'a tab, which browsers strip before resolving'],
    ['/characters\u0000', 'a NUL'],
    ['/\u0001evil', 'any other control character'],
  ])('refuses %s — %s', (value) => {
    expect(safeReturnPath(value)).toBeNull()
  })

  it('refuses null and undefined — nothing was asked for', () => {
    expect(safeReturnPath(null)).toBeNull()
    expect(safeReturnPath(undefined)).toBeNull()
  })

  it('never returns anything a browser could read as another origin', () => {
    // The property the whole module exists for, asserted over the lot: an
    // answer is either null or a path that resolves back to the origin it is
    // read on.
    const values = [
      '/campaigns/join/RIME42',
      '/library?q=fireball',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/dm/../characters',
      'javascript:alert(1)',
    ]

    for (const value of values) {
      const result = safeReturnPath(value)
      if (result === null) continue

      expect(new URL(result, 'https://companion.example').origin).toBe('https://companion.example')
    }
  })
})

describe('signInUrlWithReturnTo', () => {
  it('hangs the destination off the sign-in path, encoded', () => {
    expect(signInUrlWithReturnTo(SIGN_IN_PATH, '/campaigns/join/RIME42')).toBe(
      `${SIGN_IN_PATH}?${RETURN_TO_PARAM}=%2Fcampaigns%2Fjoin%2FRIME42`,
    )
  })

  it('encodes a query so it survives as one parameter, not several', () => {
    const url = signInUrlWithReturnTo(SIGN_IN_PATH, '/library?q=fireball&type=spell')

    expect(url).toBe(`${SIGN_IN_PATH}?${RETURN_TO_PARAM}=%2Flibrary%3Fq%3Dfireball%26type%3Dspell`)
    expect(new URL(url, 'https://companion.example').searchParams.get(RETURN_TO_PARAM)).toBe(
      '/library?q=fireball&type=spell',
    )
  })

  it('falls back to the bare sign-in path rather than carrying somewhere off-origin', () => {
    expect(signInUrlWithReturnTo(SIGN_IN_PATH, 'https://evil.example')).toBe(SIGN_IN_PATH)
    expect(signInUrlWithReturnTo(SIGN_IN_PATH, '//evil.example')).toBe(SIGN_IN_PATH)
  })

  it('does not point sign-in back at itself', () => {
    expect(signInUrlWithReturnTo(SIGN_IN_PATH, SIGN_IN_PATH)).toBe(SIGN_IN_PATH)
  })
})
