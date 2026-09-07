import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// The inset grouped list, as the DM's tabs are built from it (D48).
//
// The epic's first rail: **lists, not cards**. The DM's side was thirteen
// cards in one scroll, and a card is the wrong primitive for "here are six
// doors, each with a number on it" — it gives every door a title, a
// description and a border of its own, so six doors are a screenful. A
// grouped list gives them one uppercase header between them and one row each,
// which is the Apple HIG structure D39 already committed to and the shape
// every phone-shaped app the research looked at uses for exactly this.
//
// Built here rather than in `src/components/ui/` because it is not a vendored
// shadcn primitive: it is this app's row, at this app's 44 px floor, in this
// app's tokens. `prep-tab` is the first caller; `play-tab` and `sessions-tab`
// are the next two, and the reason it is a component instead of a class name
// copied three times.

/** The geometry every row shares: past the 44 px floor, with room to read. */
const ROW_CLASS =
  'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:ring-ring focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none'

/**
 * How a row's value reads at a dim table.
 *
 * `bloodied` is the HP token, spent here on the one value that is a job rather
 * than a fact — a party with someone not ready for the night. Colour is never
 * the only signal: the value says "1 not ready" in words either way.
 */
export type RowTone = 'muted' | 'bloodied'

const TONE_CLASS: Record<RowTone, string> = {
  muted: 'text-muted-foreground',
  bloodied: 'text-hp-bloodied font-medium',
}

/** One inset group: an uppercase header, the rows, and an optional footnote. */
export function InsetGroup({
  label,
  footer,
  children,
}: {
  label: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
        {label}
      </h2>
      <ul className="bg-card divide-y overflow-hidden rounded-xl border">{children}</ul>
      {footer ? <p className="text-muted-foreground px-1 text-xs">{footer}</p> : null}
    </section>
  )
}

/** What a row says: its label, an optional second line, and its value. */
export interface RowContent {
  label: string
  hint?: string
  value?: string
  tone?: RowTone
}

/**
 * The inside of a row, without the thing that makes it tappable.
 *
 * Exported because "Plan another night" is a row that opens a bottom sheet
 * rather than a row that goes somewhere, and it is a client component: it
 * builds its own button around this so the two rows are the same row.
 */
export function InsetRowBody({ label, hint, value, tone = 'muted' }: RowContent) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {hint ? <span className="text-muted-foreground block text-xs">{hint}</span> : null}
      </span>
      {value ? (
        <span className={cn('shrink-0 text-sm tabular-nums', TONE_CLASS[tone])}>{value}</span>
      ) : null}
    </>
  )
}

/** The chevron that says a row leads somewhere. */
function Chevron() {
  return <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
}

/** A disclosure row: tap it and you are on the page it names. */
export function InsetLinkRow({ href, ...content }: RowContent & { href: string }) {
  return (
    <li>
      <Link href={href} className={cn(ROW_CLASS, 'hover:bg-accent')}>
        <InsetRowBody {...content} />
        <Chevron />
      </Link>
    </li>
  )
}

/** The class and the chevron a client-side row needs to match the rest. */
export { ROW_CLASS as INSET_ROW_CLASS, Chevron as InsetRowChevron }
