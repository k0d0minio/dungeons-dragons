import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// The inset grouped list, which is what the DM's tabs are made of
// (`dm-chronology`, D48).
//
// The old DM side was cards: a title, a description, a border and a shadow per
// thing, thirteen of them down one scroll. A card is the right primitive for
// genuinely heterogeneous content and the wrong one for a list of four things
// you tap — it spends a phone's whole width on chrome, and it gives every item
// equal weight, so nothing on the screen says what to do next.
//
// So: one uppercase header per group (Apple HIG's section header — small,
// quiet, and outside the group rather than inside it), and one rounded block
// of rows under it with hairlines between them. A row is either a
// **disclosure** (it goes somewhere, and carries a chevron that says so) or a
// **value** (it states something, and may still be tappable). Both clear 44 px.
//
// Deliberately not a card wrapper with a list inside: the point is the ground
// the rows sit on, and nesting the two puts a border round a border.

/** One group: a quiet uppercase header, then the rows as one rounded block. */
export function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-1.5', className)}>
      <h2 className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <div className="bg-card divide-y overflow-hidden rounded-xl border">{children}</div>
    </section>
  )
}

const ROW_CLASS =
  'hover:bg-accent focus-visible:ring-ring flex w-full min-h-14 items-center gap-3 p-3 text-left focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2'

/** The label and the line under it, shared by both kinds of row. */
function RowBody({ label, detail }: { label: ReactNode; detail?: ReactNode }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium">{label}</span>
      {detail ? <span className="text-muted-foreground block text-xs">{detail}</span> : null}
    </span>
  )
}

/**
 * A row that goes somewhere — a link, or a button that opens a sheet.
 *
 * The chevron is the promise: this row leads on. A row that acts in place
 * (a tick, a switch) is not one of these.
 */
export function DisclosureRow({
  label,
  detail,
  href,
  onClick,
  trailing,
}: {
  label: ReactNode
  detail?: ReactNode
  href?: string
  onClick?: () => void
  /** Anything before the chevron — a count, a badge. */
  trailing?: ReactNode
}) {
  const body = (
    <>
      <RowBody label={label} detail={detail} />
      {trailing ? <span className="text-muted-foreground shrink-0 text-xs">{trailing}</span> : null}
      <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
    </>
  )

  if (href) {
    return (
      <Link href={href} className={ROW_CLASS}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {body}
    </button>
  )
}

/** A row that states something. Tappable when there is something to open. */
export function ValueRow({
  label,
  detail,
  value,
  onClick,
}: {
  label: ReactNode
  detail?: ReactNode
  value: ReactNode
  onClick?: () => void
}) {
  const body = (
    <>
      <RowBody label={label} detail={detail} />
      <span className="shrink-0 text-right text-sm tabular-nums">{value}</span>
    </>
  )

  return onClick ? (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {body}
      <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
    </button>
  ) : (
    <div className={cn(ROW_CLASS, 'hover:bg-transparent')}>{body}</div>
  )
}

/** A line inside a group where a row would be — an empty state, a caveat. */
export function ListNote({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground p-3 text-sm">{children}</p>
}
