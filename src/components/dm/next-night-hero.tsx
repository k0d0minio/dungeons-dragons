import Link from 'next/link'

import { PlanNightSheet } from '@/components/dm/plan-night-sheet'
import { ProgressRail } from '@/components/dm/progress-rail'
import { formatSessionDate } from '@/lib/notes/schema'
import { stillToDo, type PlanReadiness } from '@/lib/session-plans/readiness'

// The up-next hero row on the Prep tab (`dm-chronology/prep-tab`).
//
// The epic's second rail, borrowed from Calendar's Today and Things' Upcoming:
// above the lists, one row about the one thing to do next. Prep's version of
// "next" is the next night — which plan, and how far through writing it you
// are — because that is the question a DM opens this tab with on a Tuesday.
//
// A row, not a card, for the same reason everything else here is a list: it is
// the *first* row, distinguished by being bigger and having a rail across it,
// not by being a different kind of object.

/** The night the hero is about — the plan's public half is all it prints. */
export interface HeroNight {
  id: string
  title: string
  sessionDate: string | null
}

/**
 * The hero when there is a night to prep: the date as an eyebrow, the title,
 * the rail, and what is left to write. The whole row is the tap target.
 */
function NightHero({
  campaignId,
  night,
  readiness,
}: {
  campaignId: string
  night: HeroNight
  readiness: PlanReadiness
}) {
  const left = stillToDo(readiness)

  return (
    <Link
      href={`/dm/campaigns/${campaignId}/session-plans/${night.id}`}
      className="bg-card hover:bg-accent focus-visible:ring-ring block space-y-2 rounded-xl border p-4 focus-visible:ring-2 focus-visible:outline-none"
    >
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {night.sessionDate
          ? `Next session · ${formatSessionDate(night.sessionDate)}`
          : 'Next session · no date yet'}
      </p>
      <p className="font-serif text-xl leading-tight font-bold">{night.title}</p>
      <ProgressRail readiness={readiness} />
      <p className="text-muted-foreground text-sm">
        {readiness.ready} of {readiness.total} steps ready
        {left ? ` · still to do: ${left}` : ' · ready to run'}
      </p>
    </Link>
  )
}

/**
 * The hero when there is no next night: what a plan is, and one button that
 * makes one.
 *
 * The epic's rail — teach in the empty state, one call to action, never a
 * tour. This is also what a DM whose plans are all in the past sees, which is
 * the honest answer: there is no night coming, and the thing to do about that
 * is name one.
 */
function NoNightYet({ campaignId }: { campaignId: string }) {
  return (
    <div className="bg-card space-y-3 rounded-xl border p-4">
      <h2 className="font-serif text-xl leading-tight font-bold">Plan your next night</h2>
      <p className="text-muted-foreground text-sm">
        A session plan is one night on one screen: how it opens, the scenes that might happen, the
        secrets to drop, what there is to find, and the places, people and fights it leans on. Give
        it a title and fill the rest in over the week.
      </p>
      <PlanNightSheet campaignId={campaignId} label="Plan a night" variant="button" />
    </div>
  )
}

/** The Prep tab's first row: the next night, or the invitation to name one. */
export function NextNightHero({
  campaignId,
  night,
  readiness,
}: {
  campaignId: string
  night: HeroNight | null
  readiness: PlanReadiness | null
}) {
  return night && readiness ? (
    <NightHero campaignId={campaignId} night={night} readiness={readiness} />
  ) : (
    <NoNightYet campaignId={campaignId} />
  )
}
