'use client'

import type { ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

import { ROW_CLASS, SettingsRowBody } from './settings-list'

/**
 * A settings row whose control opens in a bottom sheet (D48; the epic's rail
 * "bottom sheets for quick edits").
 *
 * The between-sessions controls are the cards the campaign hub stacked — the
 * one page, the milestone, the gates, the join link, the close — and this stub
 * re-homes their doors without touching a line of them: each one is handed in
 * as `children` and posts to the route it posted to before. A sheet rather
 * than a route per control because there are five of them, they are read
 * against the list they sit in, and a screen per switch is the two-level
 * disclosure NN/g warns about.
 *
 * Radix unmounts closed sheet content, so a card that polls — the milestone's
 * SWR key, shared with the party glance — costs nothing until the row is
 * tapped.
 *
 * The header is screen-reader only on purpose: every control handed in is a
 * `Card` that already carries its own title and description, and two headings
 * saying the same thing is worse on a phone than one. Radix still needs a
 * title and a description, and a blind user still needs to be told which row
 * opened.
 */
export function SettingsSheetRow({
  label,
  hint,
  value,
  tone = 'default',
  description,
  children,
}: {
  label: string
  hint?: ReactNode
  value?: ReactNode
  tone?: 'default' | 'destructive'
  /** The sheet's accessible description — what this control does. */
  description: string
  children: ReactNode
}) {
  return (
    <Sheet>
      <SheetTrigger className={cn(ROW_CLASS, 'hover:bg-accent focus-visible:bg-accent')}>
        <SettingsRowBody label={label} hint={hint} value={value} tone={tone} chevron />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        // Enlarge the sheet's built-in close button to a 44px touch target
        // (NFR-002), as the reference and combatant sheets do.
        className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-xl p-4 pt-8 sm:mx-auto sm:max-w-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
