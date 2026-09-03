import { render, screen } from '@testing-library/react'

import { SiteHeader } from './site-header'

// The slim top bar (DND-029). It carries only what is not a tab destination —
// the app's name and the account controls — and the shell decides where it
// renders at all (`navigation/app-shell.tsx`).

describe('SiteHeader', () => {
  it('takes the app name home', () => {
    render(<SiteHeader />)

    expect(screen.getByRole('link', { name: 'D&D 5e Companion' })).toHaveAttribute('href', '/')
  })

  it('keeps the signed-out door open', () => {
    // The auth UI is mocked to render both branches (jest.setup.js), so this
    // asserts the signed-out entry exists, not which branch the viewer is in.
    render(<SiteHeader />)

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/sign-in')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/auth/sign-up')
  })
})
