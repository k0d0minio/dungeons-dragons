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
    <AppShell header={<header>site header</header>} footer={<footer>site footer</footer>}>
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

  it.each(['/', '/characters', '/auth/sign-in'])(
    'carries the header and footer on %s',
    (current) => {
      renderShell(current)

      expect(screen.getByText('site header')).toBeInTheDocument()
      expect(screen.getByText('site footer')).toBeInTheDocument()
    },
  )

  it.each(['/table/kfEbCq3vX9pLm2Rt8sWz1A', '/table'])(
    'takes the whole shell off on %s',
    (current) => {
      renderShell(current)

      // The table screen is a wall display: no header to sign out of, no tab
      // bar to mis-tap over, no footer eating the sixth player's row
      // (`dm-run-suite/table-screen-legibility`).
      expect(screen.queryByText('site header')).not.toBeInTheDocument()
      expect(screen.queryByText('site footer')).not.toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument()
      expect(screen.getByText('page')).toBeInTheDocument()
    },
  )

  it('pads the page clear of the bar only where the bar renders', () => {
    // The header renders first now, so the padded wrapper is the second child.
    const { container } = renderShell('/characters')

    expect(container.children[1]).toHaveClass('pb-[var(--bottom-nav-height)]')

    const auth = renderShell('/auth/sign-in')

    expect(auth.container.children[1]).not.toHaveClass('pb-[var(--bottom-nav-height)]')

    // Chromeless: nothing before the wrapper, and nothing to clear.
    const table = renderShell('/table/kfEbCq3vX9pLm2Rt8sWz1A')

    expect(table.container.firstChild).not.toHaveClass('pb-[var(--bottom-nav-height)]')
  })
})
