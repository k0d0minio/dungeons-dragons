'use client'

import { BookOpen, Swords, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ComponentType } from 'react'

import { cn } from '@/lib/utils'

import { ReferenceLookupSheet } from './reference-lookup-sheet'

/**
 * 64px of bar, which is what makes every target comfortably past the 44px
 * floor. Kept in step with `--bottom-nav-height` in `globals.css`, which is
 * what everything else pinned to the bottom of the viewport clears itself by.
 */
const BAR_HEIGHT = 'h-16'

const ITEM_CLASS =
  'focus-visible:ring-ring flex w-full flex-col items-center justify-center gap-1 px-1 focus-visible:ring-2 focus-visible:outline-none'

interface Destination {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  /** True when the current path belongs to this destination. */
  isActive: (pathname: string) => boolean
}

const DESTINATIONS: Destination[] = [
  {
    href: '/',
    label: 'Reference',
    icon: BookOpen,
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/characters',
    label: 'Characters',
    icon: Users,
    isActive: (pathname) => pathname === '/characters' || pathname.startsWith('/characters/'),
  },
  {
    href: '/dm',
    label: 'DM',
    icon: Swords,
    isActive: (pathname) => pathname === '/dm' || pathname.startsWith('/dm/'),
  },
]

function ItemBody({
  icon: Icon,
  label,
  active,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  active: boolean
}) {
  return (
    <>
      {/* Colour alone is not enough at a dim table, so the active destination
          also carries a filled pill behind its icon. */}
      <span
        className={cn(
          'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
          active && 'bg-accent'
        )}
      >
        <Icon className="size-5 shrink-0" />
      </span>
      <span className="max-w-full truncate text-[0.7rem] leading-none font-medium">{label}</span>
    </>
  )
}

/**
 * The app's primary navigation (DND-029, register decision D16).
 *
 * A bottom bar rather than a header switcher because this app is held in one
 * hand at a table: the destinations belong in the thumb's arc, not at the top
 * of a phone. Three destinations, fixed for signed-in and signed-out alike, so
 * the bar never changes shape under a thumb that has learned where things are;
 * `/characters` and `/dm` are behind the proxy's auth check anyway and send a
 * signed-out visitor to sign-in.
 *
 * The Reference item is the one that is not a plain link. From anywhere but
 * the reference browser itself it opens the lookup overlay, which leaves the
 * page underneath mounted — the point of the ticket was that walking to
 * reference and back cost you your place on the character sheet.
 */
export function BottomNav() {
  const pathname = usePathname() ?? '/'
  const [lookupOpen, setLookupOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="Primary"
        // z-40 keeps it under the sheet overlay (z-50): while a detail sheet is
        // open the bar dims with the rest of the page instead of floating over it.
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-2xl items-stretch">
          {DESTINATIONS.map((destination) => {
            const active = destination.isActive(pathname)
            const overlay = destination.href === '/' && pathname !== '/'

            return (
              <li key={destination.href} className="min-w-0 flex-1">
                {overlay ? (
                  <button
                    type="button"
                    onClick={() => setLookupOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={lookupOpen}
                    className={cn(
                      ITEM_CLASS,
                      BAR_HEIGHT,
                      lookupOpen ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <ItemBody
                      icon={destination.icon}
                      label={destination.label}
                      active={lookupOpen}
                    />
                  </button>
                ) : (
                  <Link
                    href={destination.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      ITEM_CLASS,
                      BAR_HEIGHT,
                      active ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <ItemBody icon={destination.icon} label={destination.label} active={active} />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <ReferenceLookupSheet open={lookupOpen} onOpenChange={setLookupOpen} />
    </>
  )
}
