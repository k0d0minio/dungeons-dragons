'use client'

import { BookOpen, History, NotebookPen, Swords, UserRound } from 'lucide-react'
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
  /** Drawn only when the signed-in user holds the global `dm` role. */
  dmOnly?: boolean
  /** Drawn only for a player — the DM has no character to go to. */
  playerOnly?: boolean
}

/**
 * `/dm/campaigns/<id>/<rest>` → `<rest>`, or `null` for anything else.
 *
 * The prep entities, the party glance and the session log still live under a
 * campaign id (D48 re-homes their doors, not their routes), so the bar has to
 * read the section out of the path to know which stop owns the screen a DM is
 * standing on.
 */
function campaignSection(pathname: string): string | null {
  const match = /^\/dm\/campaigns\/[^/]+\/(.+)$/.exec(pathname)

  return match ? match[1] : null
}

/** True when `pathname` is `prefix` itself or something under it. */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** True when the campaign section of `pathname` is one of `sections`. */
function inCampaignSection(pathname: string, sections: string[]): boolean {
  const section = campaignSection(pathname)

  return section !== null && sections.some((name) => isUnder(section, name))
}

/**
 * The tab destinations (D34: the bar is a signed-in surface now; D48 for the
 * DM's four).
 *
 * A player's bar is Character · Library and has not moved a pixel: two stops,
 * and never a third (D16 — the bar never changes shape under a thumb). The
 * DM's is **Prep · Play · Sessions · Library**, which is the chronology of a
 * game and then the reference: what you do before the night, during it, and
 * after it. It replaced Library · DM, where "DM" was a campaign list that had
 * to serve prep on a Tuesday and a fight on a Thursday from one scroll. Four
 * stops still clear the 44px floor in a 64px bar, so nothing about the bar's
 * geometry changes. The DM does not play a character, so a Character stop
 * would lead to "make your first character", which is the one thing he must
 * not do. The role is decided server-side and handed in as `showDm`.
 *
 * Ordering note: the array is one list for both bars, and filtering it gives
 * Character · Library for a player and Prep · Play · Sessions · Library for
 * the DM — Library last on the DM's bar, where reference belongs after the
 * chronology, and second on the player's, where it always was.
 */
const DESTINATIONS: Destination[] = [
  {
    href: '/characters',
    label: 'Character',
    icon: UserRound,
    isActive: (pathname) => isUnder(pathname, '/characters'),
    playerOnly: true,
  },
  {
    href: '/dm/prep',
    label: 'Prep',
    icon: NotebookPen,
    // Everything written before the night: the world (NPCs, locations,
    // handouts), the plan for a session, and the fight built to be run later.
    // `encounters/new` is prep; `/dm/encounters/[id]` is Play, below.
    isActive: (pathname) =>
      isUnder(pathname, '/dm/prep') ||
      inCampaignSection(pathname, [
        'npcs',
        'locations',
        'handouts',
        'session-plans',
        'encounters/new',
      ]),
    dmOnly: true,
  },
  {
    href: '/dm/play',
    label: 'Play',
    icon: Swords,
    // Everything reached with the table in front of you: the tracker running
    // an encounter, the rules crib mid-ruling, the party at a glance.
    isActive: (pathname) =>
      isUnder(pathname, '/dm/play') ||
      isUnder(pathname, '/dm/encounters') ||
      isUnder(pathname, '/dm/crib') ||
      inCampaignSection(pathname, ['party']),
    dmOnly: true,
  },
  {
    href: '/dm/sessions',
    label: 'Sessions',
    icon: History,
    isActive: (pathname) =>
      isUnder(pathname, '/dm/sessions') || inCampaignSection(pathname, ['sessions', 'session-log']),
    dmOnly: true,
  },
  {
    href: '/library',
    label: 'Library',
    icon: BookOpen,
    isActive: (pathname) => pathname === '/library',
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
          active && 'bg-accent',
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
 * of a phone. Fixed per person — Character · Library for a player, Prep · Play
 * · Sessions · Library for the DM (D48) — so the bar never changes shape under
 * a thumb that has learned where things are; since D34 every one of them is
 * behind the sign-in wall anyway, and sends a signed-out visitor to sign-in.
 * `showDm` is decided server-side in the root layout, from the session and
 * the `user_roles` row, so the bar is right on first paint rather than after
 * a fetch. A DM reading a party member's sheet (D13) has no stop lit, which
 * is the truth: it is not his character — and neither has one on `/dm/users`
 * or a campaign's settings, which are about the table rather than a moment in
 * a game.
 *
 * The Library item is the one that is not a plain link. From anywhere but
 * the library browser itself it opens the lookup overlay, which leaves the
 * page underneath mounted — the point of the ticket was that walking to
 * reference and back cost you your place on the character sheet.
 */
export function BottomNav({ showDm = false }: { showDm?: boolean }) {
  const pathname = usePathname() ?? '/'
  const [lookupOpen, setLookupOpen] = useState(false)
  const destinations = DESTINATIONS.filter((destination) =>
    showDm ? !destination.playerOnly : !destination.dmOnly,
  )

  return (
    <>
      <nav
        aria-label="Primary"
        // z-40 keeps it under the sheet overlay (z-50): while a detail sheet is
        // open the bar dims with the rest of the page instead of floating over it.
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-2xl items-stretch">
          {destinations.map((destination) => {
            const active = destination.isActive(pathname)
            const overlay = destination.href === '/library' && pathname !== '/library'

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
                      lookupOpen ? 'text-foreground' : 'text-muted-foreground',
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
                      active ? 'text-foreground' : 'text-muted-foreground',
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
