'use client'

import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Beginner mode: an advanced control that stays folded away until it matters.
 *
 * The sheet's rule for this is the one death saves already follow — they
 * appear at 0 hit points and not before, and nobody has to switch a mode on to
 * get them. So this is not a preference: `relevant` is the card's own answer to
 * "is this happening right now", and while it is true the section is simply
 * open, with no toggle to fumble mid-combat. While it is false the section is a
 * single quiet row a player can tap open — the control is never *gone*, because
 * the player who has just been handed a level of exhaustion needs to set it
 * from zero, and a beginner mode you cannot get out of is a worse sheet.
 *
 * Once opened by hand it stays open for the life of the card, even after
 * `relevant` goes back to false: the temporary hit points you just spent are
 * the ones you are about to be given again.
 */
export function AdvancedDetail({
  label,
  summary,
  relevant,
  children,
  className,
}: {
  /** What the folded row says, and what the open section is titled. */
  label: string
  /** One quiet line under the label while the section is folded away. */
  summary: string
  /** The card's own "this is happening now" — while true, the section is open. */
  relevant: boolean
  children: ReactNode
  className?: string
}) {
  const [opened, setOpened] = useState(false)
  const open = relevant || opened

  return (
    <div className={cn('border-t pt-3', className)}>
      {open ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{label}</p>
          {children}
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-11 w-full justify-start px-2 py-2 text-left font-normal whitespace-normal"
          aria-expanded={false}
          onClick={() => setOpened(true)}
        >
          <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="text-sm font-medium">{label}</span>
            <span className="text-muted-foreground block text-xs">{summary}</span>
          </span>
        </Button>
      )}
    </div>
  )
}
