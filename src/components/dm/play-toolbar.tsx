'use client'

import { BookOpen, Eye, MonitorSmartphone, PenLine } from 'lucide-react'
import Link from 'next/link'
import { useState, type ComponentType } from 'react'
import { toast } from 'sonner'

import { QuickNoteForm } from '@/components/campaigns/quick-note-form'
import { useRevealSheet } from '@/components/dm/play-reveal'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

/** The fight whose table screen is live, as the toolbar names it. */
export interface TableScreenFight {
  name: string
  shareToken: string | null
}

/**
 * The Play tab's toolbar (Apple HIG's toolbar, 52 px, sitting on the tab bar).
 *
 * The epic's rail is "one tap in, never two", and these are the four things a
 * DM reaches for without meaning to leave the screen he is on:
 *
 * - **Quick note** — the innkeeper is called Bram, and it has to be written
 *   down before the sentence finishes. The same `QuickNoteForm` the tracker
 *   carries, landing in the same note, decided server-side by date.
 * - **Crib** — the rules crib, which is a page rather than a sheet because it
 *   is several screens of rows (`dm-run-suite/dm-rules-crib`), so this one is
 *   a plain link and the back arrow returns.
 * - **Reveal** — the sheet the Reveal section opens, from the thumb's arc.
 * - **Table screen** — the live fight's link to copy onto the TV.
 *
 * A toolbar rather than four more rows: rows are read top to bottom and these
 * are reached for mid-sentence, without looking. It is fixed above the tab bar
 * and the page clears both (`app-shell.tsx`).
 */
export function PlayToolbar({
  campaignId,
  tableFight,
}: {
  campaignId: string
  /** The open fight whose screen the table is showing, or `null` for none. */
  tableFight: TableScreenFight | null
}) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)
  const reveal = useRevealSheet()

  const tablePath = tableFight?.shareToken ? `/table/${tableFight.shareToken}` : null

  async function copyTableLink() {
    if (!tablePath) return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${tablePath}`)
      toast.success('Table screen link copied. Open it on the shared screen.')
    } catch {
      toast.error('Could not copy. Long-press the link text instead.')
    }
  }

  return (
    <>
      {/* z-40, the bar's own layer: while a sheet is open (z-50) the toolbar
          dims with the page under it rather than floating over the sheet. */}
      <div className="bg-background/95 fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-40 border-t backdrop-blur">
        <div className="mx-auto flex h-13 w-full max-w-2xl items-stretch">
          <ToolbarButton icon={PenLine} label="Quick note" onClick={() => setNoteOpen(true)} />
          <ToolbarLink icon={BookOpen} label="Crib" href="/dm/crib" />
          <ToolbarButton icon={Eye} label="Reveal" onClick={reveal.open} />
          <ToolbarButton
            icon={MonitorSmartphone}
            label="Table screen"
            onClick={() => setTableOpen(true)}
          />
        </div>
      </div>

      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Quick note</SheetTitle>
            <SheetDescription>
              One line, on the end of tonight’s note. It becomes the recap when you close the
              session.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <QuickNoteForm
              campaignId={campaignId}
              autoFocus
              onCaptured={() => setNoteOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={tableOpen} onOpenChange={setTableOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Table screen</SheetTitle>
            <SheetDescription>
              Initiative order, the round and player hit points — never monster hit points. No
              sign-in needed.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-6">
            {tablePath ? (
              <>
                <p className="text-sm">
                  Showing <span className="font-medium">{tableFight?.name}</span>.
                </p>
                <p className="bg-muted text-muted-foreground rounded-md p-2 font-mono text-xs break-all select-all">
                  {tablePath}
                </p>
                <Button type="button" className="h-11 w-full" onClick={() => void copyTableLink()}>
                  Copy link
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No fight on the table, so there is nothing for the shared screen to show. Start one
                and its link appears here.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

const ITEM_CLASS =
  'focus-visible:ring-ring text-muted-foreground hover:text-foreground flex w-full flex-col items-center justify-center gap-0.5 px-1 focus-visible:ring-2 focus-visible:outline-none'

function ToolbarBody({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="max-w-full truncate text-[0.65rem] leading-none font-medium">{label}</span>
    </>
  )
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <div className="min-w-0 flex-1">
      <button type="button" onClick={onClick} className={`${ITEM_CLASS} h-full`}>
        <ToolbarBody icon={icon} label={label} />
      </button>
    </div>
  )
}

function ToolbarLink({
  icon,
  label,
  href,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  href: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <Link href={href} className={`${ITEM_CLASS} h-full`}>
        <ToolbarBody icon={icon} label={label} />
      </Link>
    </div>
  )
}
