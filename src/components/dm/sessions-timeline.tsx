import Link from 'next/link'

import { InsetGroup, InsetLinkRow, InsetRowChevron } from '@/components/dm/inset-list'
import { NightNotes } from '@/components/dm/night-notes'
import type { CampaignNote } from '@/lib/db/schema'
import type { SessionNight } from '@/lib/db/session-log'
import type { PlanTally } from '@/lib/db/session-plans'
import { formatSessionDate } from '@/lib/notes/schema'
import {
  beforeLabel,
  nightChips,
  nightDetail,
  nightHref,
  nightLabel,
  nightTitle,
  type NightChip,
} from '@/lib/sessions/timeline'
import { cn } from '@/lib/utils'

// The Sessions tab's timeline (`dm-chronology/sessions-tab`).
//
// **The order is time.** The DM asked to see the sessions and the notes in a
// logical order, and for a table the logical order is the one the nights
// happened in — newest at the top, because the night you want is almost always
// the last one or the next one. Every other grouping the mockups tried (by
// plan, by kind of thing, by campaign) put two rows about the same evening in
// two different places.
//
// A rail of dots down the left rather than a plain list, because the state of
// a night is the thing being read and a rail is what makes "these three
// happened, this one is happening, that one has not" legible at a glance. The
// state is in words on every row as well — colour is never the only signal.
//
// A presentational server component: what a night *is* comes from `listNights`
// and what a row *says* comes from `src/lib/sessions/timeline.ts`, so this file
// is the arrangement and nothing else, and the reads live in `SessionsBoard`.

/** A chip under a night's row: the next act, at a 44 px target. */
function Chip({ chip }: { chip: NightChip }) {
  return (
    <Link
      href={chip.href}
      className={cn(
        'focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none',
        chip.primary
          ? 'border-primary text-primary hover:bg-primary/10'
          : 'text-muted-foreground hover:bg-accent',
      )}
    >
      {chip.label}
    </Link>
  )
}

/** One night: the label, the inset row, and the chips for what to do next. */
function NightRow({
  campaignId,
  night,
  tally,
  readOnly,
}: {
  campaignId: string
  night: SessionNight
  tally: PlanTally | null
  readOnly: boolean
}) {
  const tonight = night.kind === 'tonight'
  const chips = nightChips(night, campaignId, { readOnly })

  return (
    <li className="relative space-y-1.5 pl-8">
      <span
        aria-hidden
        className={cn(
          'bg-background absolute top-1 left-0 size-3.5 rounded-full border-2',
          tonight ? 'border-primary' : 'border-muted-foreground/40',
        )}
      />

      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {nightLabel(night)}
      </h3>

      <div
        className={cn(
          'bg-card overflow-hidden rounded-xl border',
          // Tonight is the one row you are looking for while the table waits,
          // so it is the one row with the accent on it.
          tonight && 'border-primary',
        )}
      >
        <Link
          href={nightHref(night, campaignId)}
          className="focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{nightTitle(night)}</span>
            <span className="text-muted-foreground block text-xs">{nightDetail(night, tally)}</span>
          </span>
          <InsetRowChevron />
        </Link>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t px-4 py-2">
            {chips.map((chip) => (
              <Chip key={chip.label} chip={chip} />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}

/**
 * The row for what came before the first night: session zero.
 *
 * On the rail rather than in a group of its own, because it is where it is in
 * time — the bottom — and a DM scrolling back through a campaign should reach
 * it by scrolling back rather than by knowing to look elsewhere.
 */
function BeforeRow({
  campaignId,
  date,
  written,
}: {
  campaignId: string
  date: string
  written: boolean
}) {
  return (
    <li className="relative space-y-1.5 pl-8">
      <span
        aria-hidden
        className="bg-background border-muted-foreground/40 absolute top-1 left-0 size-3.5 rounded-full border-2"
      />
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {beforeLabel(date)}
      </h3>
      <ul className="bg-card divide-y overflow-hidden rounded-xl border">
        <InsetLinkRow
          href={`/dm/campaigns/${campaignId}#session-zero`}
          label="Session zero"
          hint="The page the table read before the first night."
          value={written ? 'Written' : 'Empty'}
        />
      </ul>
    </li>
  )
}

/** A closed campaign, as a row into its own timeline. */
export interface EarlierTable {
  id: string
  name: string
  /** When the DM closed it, `YYYY-MM-DD`. */
  closedOn: string
  nights: number
}

/**
 * The timeline: every night of this campaign in order, then the notes that
 * belong to no night, then the tables that are already behind you.
 */
export function SessionsTimeline({
  campaignId,
  nights,
  tallies,
  orphanNotes,
  sessionZero,
  earlier = [],
  readOnly = false,
}: {
  campaignId: string
  nights: SessionNight[]
  /** Keyed by plan id — a night with no plan has no tally. */
  tallies: Record<string, PlanTally>
  orphanNotes: CampaignNote[]
  /** When the campaign started, and whether its one page was written. */
  sessionZero: { date: string; written: boolean } | null
  earlier?: EarlierTable[]
  /** A closed campaign is read: no chips, and nothing to press. */
  readOnly?: boolean
}) {
  return (
    <div className="space-y-6">
      {nights.length > 0 || sessionZero ? (
        <ol className="relative space-y-5">
          {/* The rail itself, behind the dots. Inset by half a dot so it runs
              through their centres. */}
          <span aria-hidden className="bg-border absolute top-3 bottom-3 left-[7px] w-px" />

          {nights.map((night) => (
            <NightRow
              key={night.id}
              campaignId={campaignId}
              night={night}
              tally={night.plan ? (tallies[night.plan.id] ?? null) : null}
              readOnly={readOnly}
            />
          ))}

          {sessionZero ? (
            <BeforeRow
              campaignId={campaignId}
              date={sessionZero.date}
              written={sessionZero.written}
            />
          ) : null}
        </ol>
      ) : (
        // Teach in the empty state, one call to action, never a tour: a
        // timeline fills itself in as nights are planned and closed, so the
        // thing to do about an empty one is plan the first night.
        <div className="bg-card space-y-3 rounded-xl border p-4">
          <h2 className="font-serif text-xl leading-tight font-bold">No nights yet</h2>
          <p className="text-muted-foreground text-sm">
            Every night you plan appears here, and stays here once you have played it — with what
            happened, the recap your players read, and the notes you wrote that evening.
          </p>
          {readOnly ? null : (
            <Link
              href="/dm/prep"
              className="text-primary inline-flex min-h-11 items-center text-sm font-medium"
            >
              Plan your first night ›
            </Link>
          )}
        </div>
      )}

      {orphanNotes.length > 0 ? (
        <InsetGroup
          label="Notes without a night"
          footer="Written for a date no session was played on. Open one and change its date to file it."
        >
          {/* Editable in place, and the date is the editable field: filing one
              of these is changing its date to a night that exists. */}
          <NightNotes
            campaignId={campaignId}
            notes={orphanNotes}
            fixedDate={false}
            readOnly={readOnly}
          />
        </InsetGroup>
      ) : null}

      {earlier.length > 0 ? (
        <InsetGroup
          label="Earlier tables"
          footer="Campaigns you have closed. You can read them; the tabs stay on the table you are running."
        >
          {earlier.map((table) => (
            <InsetLinkRow
              key={table.id}
              href={`/dm/campaigns/${table.id}/sessions`}
              label={table.name}
              hint={`Closed ${formatSessionDate(table.closedOn)}`}
              value={`${table.nights} ${table.nights === 1 ? 'night' : 'nights'}`}
            />
          ))}
        </InsetGroup>
      ) : null}
    </div>
  )
}
