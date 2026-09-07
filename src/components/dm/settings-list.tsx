import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The inset grouped list the DM's settings page is built from (D48, and the
 * epic's first rail: lists, not cards).
 *
 * Apple's Settings idiom, which is the one every phone owner already knows:
 * an uppercase section header, then rows on one card — **label left, current
 * state right, a chevron into the control**. It beats a stack of cards here
 * for the reason the research gives: element positions are fixed, so the eye
 * finds "Milestone" in the same place every time, and the value beside it
 * answers the question without opening anything.
 *
 * Deliberately dumb and hook-free, so a server page can render the whole list
 * and only the rows that need a browser (the sheet row next door, the controls
 * behind it) cost any client JavaScript.
 */

/** Every row is at least 44px tall (NFR-002) and lays out the same way. */
const ROW_CLASS = 'flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left'

/** One uppercase-headed group of rows. */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string
  /** An optional line under the header, for a group that needs a sentence. */
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-muted-foreground px-3 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      {description ? <p className="text-muted-foreground px-3 text-xs">{description}</p> : null}
      <div className="bg-card divide-y overflow-hidden rounded-lg border">{children}</div>
    </section>
  )
}

/**
 * The inside of a row: what it is called, what it says underneath, and the
 * current state on the right. Shared by all three row kinds so a link, a
 * sheet and a dead value line up to the same grid.
 */
export function SettingsRowBody({
  label,
  hint,
  value,
  tone = 'default',
  chevron = false,
}: {
  label: ReactNode
  /** The second line — what this row is for, in the DM's words. */
  hint?: ReactNode
  /** The state, on the right: "Level 4", "Written", "3 of 6 on". */
  value?: ReactNode
  tone?: 'default' | 'destructive'
  chevron?: boolean
}) {
  return (
    <>
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate text-sm font-medium',
            tone === 'destructive' && 'text-destructive',
          )}
        >
          {label}
        </span>
        {hint ? <span className="text-muted-foreground block text-xs">{hint}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {value ? (
          <span className="text-muted-foreground max-w-[9rem] truncate text-sm">{value}</span>
        ) : null}
        {chevron ? (
          <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        ) : null}
      </span>
    </>
  )
}

/** A row that goes somewhere: the chevron means a screen, not a sheet. */
export function SettingsLinkRow({
  href,
  label,
  hint,
  value,
  tone,
}: {
  href: string
  label: ReactNode
  hint?: ReactNode
  value?: ReactNode
  tone?: 'default' | 'destructive'
}) {
  return (
    <Link href={href} className={cn(ROW_CLASS, 'hover:bg-accent')}>
      <SettingsRowBody label={label} hint={hint} value={value} tone={tone} chevron />
    </Link>
  )
}

/**
 * A row that only states something — "Closed 7 Sep 2026", a player with no
 * character yet. No chevron, because there is nothing behind it, and no
 * button, because a control that does nothing when tapped is worse than a
 * line of text.
 */
export function SettingsValueRow({
  label,
  hint,
  value,
}: {
  label: ReactNode
  hint?: ReactNode
  value?: ReactNode
}) {
  return (
    <div className={ROW_CLASS}>
      <SettingsRowBody label={label} hint={hint} value={value} />
    </div>
  )
}

export { ROW_CLASS }
