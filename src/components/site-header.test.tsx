import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'

// Neon Auth's session store, as the auth UI sees it: pending until
// `/api/auth/get-session` answers. `sessionResolved` is the switch this file
// flips to put a server render and a client render on opposite sides of that
// answer — which is exactly the race that used to break hydration
// (`triage/edit-page-hydration-error`).
let sessionResolved = false

jest.mock('@neondatabase/auth/react/ui', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => (sessionResolved ? children : null),
  SignedOut: ({ children }: { children: React.ReactNode }) => (sessionResolved ? children : null),
  UserButton: () => <button type="button">Account</button>,
}))

import { SiteHeader } from './site-header'

// The slim top bar (DND-029). It carries only what is not a tab destination —
// the app's name and the account controls — and the shell decides where it
// renders at all (`navigation/app-shell.tsx`).

beforeEach(() => {
  sessionResolved = false
})

describe('SiteHeader', () => {
  it('takes the app name home', () => {
    render(<SiteHeader />)

    expect(screen.getByRole('link', { name: 'D&D 5e Companion' })).toHaveAttribute('href', '/')
  })

  it('keeps the signed-out door open without waiting on the client session', () => {
    // The session store is still pending — the state a server render always
    // sees. The door has to be in that markup regardless: which branch to draw
    // is the layout's answer, not the store's.
    render(<SiteHeader signedIn={false} />)

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/sign-in')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/auth/sign-up')
  })

  it('drops the signed-out door for a signed-in viewer', () => {
    sessionResolved = true
    render(<SiteHeader signedIn />)

    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument()
  })

  it('leaves the account menu out of the server render, so the two sides agree', () => {
    // Mounted is the one moment both sides agree on, so the account menu
    // arrives after hydration rather than in the markup React has to match.
    sessionResolved = true

    expect(renderToString(<SiteHeader signedIn />)).not.toContain('Account')
  })

  it('brings the account menu in once mounted', () => {
    sessionResolved = true
    render(<SiteHeader signedIn />)

    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument()
  })
})

// The bug itself (`triage/edit-page-hydration-error`): the server renders the
// bar while Neon Auth's session store is pending, the session request answers
// before React hydrates, and the first client render therefore draws a
// different bar. That used to throw React #418 once per page load and cost the
// page its whole hydrated tree.
describe.each([
  ['signed out', false],
  ['signed in', true],
])('SiteHeader hydration, %s', (_label, signedIn) => {
  it('hydrates cleanly when the session resolves before React does', async () => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true

    const bar = <SiteHeader signedIn={signedIn} />

    // Server: the session request has not answered yet.
    sessionResolved = false
    const container = document.createElement('div')
    container.innerHTML = renderToString(bar)
    document.body.appendChild(container)

    // Client: it answered while the bundle was still loading.
    sessionResolved = true

    const errors: string[] = []
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) =>
        errors.push(typeof args[0] === 'string' ? args[0] : String(args[0])),
      )

    await act(async () => {
      hydrateRoot(container, bar)
    })

    consoleError.mockRestore()
    container.remove()

    expect(errors.filter((message) => /hydrat/i.test(message))).toEqual([])
  })
})
