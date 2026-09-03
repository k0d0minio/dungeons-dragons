/**
 * The sign-in page's half of the return destination
 * (`triage/sign-in-return-destination`).
 *
 * The proxy writes `?redirectTo=` onto the sign-in URL; this page is what
 * decides where the form actually lands the player. It must hand `AuthView` an
 * explicit destination every single time — with no prop the component reads
 * `redirectTo` off `window.location` itself, and that value is whatever the
 * link said, which is how a sign-in URL on this app's own domain would become
 * a launch pad for someone else's page.
 */
import { cleanup, render, screen } from '@testing-library/react'

import AuthPage from './page'

let signupOpen = true
let presentedCookie: string | undefined

jest.mock('@neondatabase/auth/react/ui', () => ({
  // Stand in for the real view and record the destination it was given.
  AuthView: ({ path, redirectTo }: { path: string; redirectTo?: string }) => (
    <div data-testid="auth-view" data-path={path} data-redirect-to={redirectTo ?? '(none)'} />
  ),
}))

jest.mock('@neondatabase/auth/react/ui/server', () => ({
  authViewPaths: { SIGN_IN: 'sign-in', SIGN_UP: 'sign-up' },
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: () => (presentedCookie ? { value: presentedCookie } : undefined),
  })),
}))

// The gate's own behaviour is `invite-gate.test.tsx`'s subject; here it only
// has to be distinguishable from the sign-up view it stands in front of, and
// it pulls in the app router, which no server-component render provides.
jest.mock('@/components/auth/invite-gate', () => ({
  InviteGate: () => <div data-testid="invite-gate" />,
}))

jest.mock('@/lib/auth/invite', () => ({
  INVITE_COOKIE: 'invite',
  isSignupOpen: jest.fn(() => signupOpen),
  isValidInviteCode: jest.fn((value?: string) => value === 'right'),
}))

beforeEach(() => {
  signupOpen = true
  presentedCookie = 'right'
})

async function renderAuthPage(
  path: string,
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  cleanup()
  render(
    await AuthPage({
      params: Promise.resolve({ path }),
      searchParams: Promise.resolve(searchParams),
    }),
  )

  return screen.getByTestId('auth-view')
}

describe('where sign-in lands you', () => {
  it('returns a player to the campaign join link they opened (DND-046)', async () => {
    const view = await renderAuthPage('sign-in', { redirectTo: '/campaigns/join/RIME42' })

    expect(view).toHaveAttribute('data-redirect-to', '/campaigns/join/RIME42')
  })

  it('keeps the destination across the hop to sign-up, which is where an invited player goes', async () => {
    const view = await renderAuthPage('sign-up', { redirectTo: '/campaigns/join/RIME42' })

    expect(view).toHaveAttribute('data-redirect-to', '/campaigns/join/RIME42')
  })

  it('falls back to the default when nothing asked for anywhere', async () => {
    const view = await renderAuthPage('sign-in')

    expect(view).toHaveAttribute('data-redirect-to', '/characters')
  })

  it.each([
    ['https://evil.example/harvest', 'an absolute URL'],
    ['//evil.example', 'the scheme-relative spelling'],
    ['/\\evil.example', 'the backslash spelling'],
    ['javascript:alert(document.cookie)', 'not a navigation at all'],
  ])('refuses to land anyone on %s — %s', async (redirectTo) => {
    const view = await renderAuthPage('sign-in', { redirectTo })

    // The default, not the hostile value — and crucially not *absent*, which
    // would send the component back to `window.location` to find it again.
    expect(view).toHaveAttribute('data-redirect-to', '/characters')
  })

  it('always passes a destination, so the component never reads the URL itself', async () => {
    for (const redirectTo of [undefined, '/dm', 'https://evil.example', '']) {
      const view = await renderAuthPage('sign-in', { redirectTo })

      expect(view.getAttribute('data-redirect-to')).not.toBe('(none)')
    }
  })

  it('takes the first of a repeated parameter rather than choking on the array', async () => {
    const view = await renderAuthPage('sign-in', {
      redirectTo: ['/campaigns/join/RIME42', 'https://evil.example'],
    })

    expect(view).toHaveAttribute('data-redirect-to', '/campaigns/join/RIME42')
  })
})

describe('the invite gate still stands in front of sign-up (D20)', () => {
  it('shows the code form instead of the sign-up view when the cookie is wrong', async () => {
    presentedCookie = 'wrong'

    render(
      await AuthPage({
        params: Promise.resolve({ path: 'sign-up' }),
        searchParams: Promise.resolve({ redirectTo: '/campaigns/join/RIME42' }),
      }),
    )

    expect(screen.queryByTestId('auth-view')).not.toBeInTheDocument()
    expect(screen.getByTestId('invite-gate')).toBeInTheDocument()
  })

  it('says sign-up is closed when no code is configured, whatever the destination', async () => {
    signupOpen = false

    render(
      await AuthPage({
        params: Promise.resolve({ path: 'sign-up' }),
        searchParams: Promise.resolve({ redirectTo: '/campaigns/join/RIME42' }),
      }),
    )

    expect(screen.queryByTestId('auth-view')).not.toBeInTheDocument()
    expect(screen.getByText('Sign-up is closed')).toBeInTheDocument()
  })
})
