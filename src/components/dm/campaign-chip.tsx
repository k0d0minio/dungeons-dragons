'use client'

import { Check, ChevronsUpDown, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { rememberDmCampaign } from '@/lib/dm/campaign-cookie'

/** What the chip needs of a campaign: which one it is, and what it is called. */
export interface ChipCampaign {
  id: string
  name: string
}

/**
 * The campaign chip — the pill under every DM tab's title (D48).
 *
 * The campaign is scope, not a page: Prep, Play and Sessions are id-less
 * routes about *this* table, and the chip is the one place that says which
 * table that is. It answers a question the old campaign hub answered by being
 * a page you had to walk back to.
 *
 * Rendered from the server with the campaign already resolved — the name is
 * in the first paint, never after a fetch — and it is a client component only
 * for what a menu needs: opening, and remembering a switch.
 *
 * **Switching writes a cookie, not a route.** `dm_campaign` is a preference
 * the server reads on the next request, and it grants nothing: the resolver
 * only ever lets it *select* from the campaigns this DM already runs, so the
 * worst a hand-written cookie can do is be ignored. `router.refresh()` re-runs
 * the server render with the new scope, which leaves the tab you are on where
 * it is — the point being that switching tables is not a navigation.
 *
 * Settings goes to `/dm/campaign` — the grouped between-sessions page
 * (`dm-chronology/campaign-settings`), which resolves the active campaign the
 * same way this chip's server did, so the door needs no id. It carries the tab
 * it was opened from so the page's back link goes back where the DM was, not
 * to whichever stop is the default.
 */
export function CampaignChip({
  campaign,
  others = [],
}: {
  campaign: ChipCampaign
  others?: ChipCampaign[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  function switchTo(id: string) {
    rememberDmCampaign(id)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-ring bg-muted/60 hover:bg-muted text-foreground -mt-1 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Campaign: ${campaign.name}`}
      >
        <span className="min-w-0 truncate">{campaign.name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="max-w-[16rem] min-w-[12rem]">
        <DropdownMenuLabel>Campaign</DropdownMenuLabel>

        <DropdownMenuItem className="gap-2" disabled>
          <Check className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{campaign.name}</span>
        </DropdownMenuItem>

        {others.map((other) => (
          <DropdownMenuItem
            key={other.id}
            className="gap-2 pl-8"
            onSelect={() => switchTo(other.id)}
          >
            <span className="truncate">{other.name}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="gap-2">
          <Link
            href={pathname ? `/dm/campaign?from=${encodeURIComponent(pathname)}` : '/dm/campaign'}
          >
            <Settings className="size-4 shrink-0" aria-hidden="true" />
            Campaign settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
