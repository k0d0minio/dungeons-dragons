// Which session plan the Play tab is about (`dm-chronology/play-tab`).
//
// "Tonight's plan" is derived, not stored. There is no `is_tonight` column and
// there will not be one: a column would need clearing, and the thing it would
// be cleared by is the DM remembering to. The date on the plan already says
// which night it is for, so the question is only how to read it, and this is
// the one place that reads it.
import type { CampaignSessionPlan } from '@/lib/db/schema'

/** The two columns the choice is made on — every plan row has them. */
export interface DatedPlan {
  sessionDate: string | null
  createdAt: Date | string
}

/** Newest first, for the tiebreaks below. */
function byNewest(a: DatedPlan, b: DatedPlan): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

/**
 * The plan a DM has open with the table in front of him, or `null`.
 *
 * Three tiers, in the order a DM would point at them:
 *
 * 1. **Tonight** — a plan dated today. Two plans on the same night is not a
 *    shape this app makes, but if it ever holds one, the newer is the one the
 *    DM just wrote.
 * 2. **The next night** — the soonest plan dated later than today. A DM who
 *    opens Play on a Tuesday to check something is shown Thursday's, not a
 *    blank screen.
 * 3. **The newest undated plan** — for the DM who never fills the date in.
 *
 * A plan dated *before* today wins nothing. Last Thursday's plan is history,
 * and Sessions is where history lives (D48); showing it here would put ticked
 * secrets from a night already played on the screen of a night about to
 * start. When only past plans exist this answers `null` and the tab says so.
 *
 * `today` is `YYYY-MM-DD` in UTC — the one clock every session date in this
 * app is on (`todaySessionDate`) — and it is a parameter rather than a call so
 * a test can ask about a Thursday.
 */
export function tonightsPlan<Plan extends DatedPlan>(
  plans: readonly Plan[],
  today: string,
): Plan | null {
  const dated = plans.filter((plan): plan is Plan & { sessionDate: string } => {
    return plan.sessionDate !== null
  })

  const tonight = dated.filter((plan) => plan.sessionDate === today).sort(byNewest)
  if (tonight.length > 0) return tonight[0]

  const upcoming = dated
    .filter((plan) => plan.sessionDate > today)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || byNewest(a, b))
  if (upcoming.length > 0) return upcoming[0]

  const undated = plans.filter((plan) => plan.sessionDate === null).sort(byNewest)

  return undated[0] ?? null
}

/** True when `plan` is the night happening now rather than one still ahead. */
export function isTonight(plan: Pick<CampaignSessionPlan, 'sessionDate'>, today: string): boolean {
  return plan.sessionDate === today
}
