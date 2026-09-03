'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { BottomNav } from './bottom-nav'

/**
 * Where the bottom bar makes no sense. Sign-in, sign-up and the rest of the
 * Neon Auth views are a single task with one exit, and a bar offering three
 * destinations mid-sign-up is an invitation to abandon it.
 */
function hidesNavigation(pathname: string): boolean {
  return pathname === '/auth' || pathname.startsWith('/auth/')
}

/**
 * Page shell that carries the DND-029 bottom bar and the clearance it needs.
 *
 * The padding lives here rather than on each page: the bar is fixed, so
 * without it the last card on every screen sits under the bar with no way to
 * scroll it clear. `showDm` is passed down from the root layout, which is the
 * server component that can read the role; this shell is a client component
 * and only forwards it.
 */
export function AppShell({ children, showDm = false }: { children: ReactNode; showDm?: boolean }) {
  const pathname = usePathname() ?? '/'
  const showNavigation = !hidesNavigation(pathname)

  return (
    <>
      <div className={showNavigation ? 'pb-[var(--bottom-nav-height)]' : undefined}>{children}</div>
      {showNavigation ? <BottomNav showDm={showDm} /> : null}
    </>
  )
}
