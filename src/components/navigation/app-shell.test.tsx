import { render, screen } from '@testing-library/react'

import { AppShell } from './app-shell'

let pathname = '/'

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
}))

jest.mock('./bottom-nav', () => ({
  BottomNav: () => <nav aria-label="Primary" />,
}))

function renderShell(current: string) {
  pathname = current

  return render(
    <AppShell>
      <p>page</p>
    </AppShell>,
  )
}

describe('AppShell', () => {
  it.each(['/', '/characters', '/characters/abc-123/edit', '/dm'])(
    'carries the bottom bar on %s',
    (current) => {
      renderShell(current)

      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    },
  )

  it.each(['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password'])(
    'keeps out of the way on %s',
    (current) => {
      renderShell(current)

      expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
      expect(screen.getByText('page')).toBeInTheDocument()
    },
  )

  it('pads the page clear of the bar only where the bar renders', () => {
    const { container } = renderShell('/characters')

    expect(container.firstChild).toHaveClass('pb-[var(--bottom-nav-height)]')

    const auth = renderShell('/auth/sign-in')

    expect(auth.container.firstChild).not.toHaveClass('pb-[var(--bottom-nav-height)]')
  })
})
