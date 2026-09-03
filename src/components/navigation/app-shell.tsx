'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { BottomNav } from './bottom-nav'

/**
 * Where the whole shell comes off — header, tab bar and legal footer alike.
 *
 * The shared table screen (D24) is a wall display: it sits in front of the
 * table on a device nobody is driving, and every piece of chrome around it is
 * either a mis-tap waiting to happen (Sign in / Sign up and the three tab
 * destinations are live controls on a screen the party leans over mid-fight)
 * or vertical space the sixth player's initiative row needs
 * (`dm-run-suite/table-screen-legibility`). Dropping the footer costs no
 * attribution: the screen distributes no SRD text — condition names are
 * labels on a combatant, and D24's projection carries no description, stat
 * block or rules prose for CC-BY §3(a) to attach to.
 */
function hidesChrome(pathname: string): boolean {
  return pathname === '/table' || pathname.startsWith('/table/')
}

/**
 * Where the bottom bar makes no sense. Sign-in, sign-up and the rest of the
 * Neon Auth views are a single task with one exit, and a bar offering three
 * destinations mid-sign-up is an invitation to abandon it. The chromeless
 * table screen is the other case, for the reasons above.
 */
function hidesNavigation(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/') || hidesChrome(pathname)
}

/**
 * Page shell that carries the DND-029 bottom bar and the clearance it needs.
 *
 * The padding lives here rather than on each page: the bar is fixed, so
 * without it the last card on every screen sits under the bar with no way to
 * scroll it clear.
 *
 * `header` and `footer` arrive as props rather than as part of `children` so
 * that this — the one component that already knows the path — decides whether
 * they render, while they stay server components in the root layout. `showDm`
 * comes the same way: the root layout is the server component that can read
 * the role, and this shell only forwards it to the bar.
 */
export function AppShell({
  header,
  footer,
  children,
  showDm = false,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  showDm?: boolean
}) {
  const pathname = usePathname() ?? '/'
  const showChrome = !hidesChrome(pathname)
  const showNavigation = !hidesNavigation(pathname)

  return (
    <>
      {showChrome ? header : null}
      <div className={showNavigation ? 'pb-[var(--bottom-nav-height)]' : undefined}>
        {children}
        {showChrome ? footer : null}
      </div>
      {showNavigation ? <BottomNav showDm={showDm} /> : null}
    </>
  )
}
