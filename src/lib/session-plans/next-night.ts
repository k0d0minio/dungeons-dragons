// Which plan the Prep tab leads with (`dm-chronology/prep-tab`).
//
// The tab's hero row answers one question — *what am I writing next?* — and
// this is the rule that picks the night it is about. Pure and given the day,
// so a test can ask about a Thursday and the server does not have to be one.
//
// Deliberately **not** `nextNight` in `src/lib/campaigns/discovered.ts`, which
// answers the player-facing version of the same question. That one falls back
// to the most recently *announced* night, because a player whose DM announced
// last Thursday should still see last Thursday rather than a blank card. This
// one falls back to the newest *undated* plan, because a DM who has started
// writing a night without fixing the date is exactly the DM this hero is for,
// and a night already played is not something to prep again.

/** The two columns the rule reads. `CampaignSessionPlan` satisfies it. */
export interface PlannedNight {
  sessionDate: string | null
  createdAt: Date | string
}

/**
 * The next night to prep: the earliest plan dated today or later, else the
 * newest plan with no date on it yet, else `null`.
 *
 * `today` is `YYYY-MM-DD` in UTC — `todaySessionDate()` — which is the clock
 * every session date in this app is on, so the comparison is a string one and
 * needs no timezone of its own.
 *
 * `null` covers both a campaign with no plans and one whose plans are all in
 * the past: neither has a next night, and the hero teaches instead.
 */
export function nextPlannedNight<Plan extends PlannedNight>(
  plans: readonly Plan[],
  today: string,
): Plan | null {
  const upcoming = plans
    .filter((plan): plan is Plan & { sessionDate: string } => plan.sessionDate !== null)
    .filter((plan) => plan.sessionDate >= today)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))

  if (upcoming.length > 0) return upcoming[0]

  const undated = plans
    .filter((plan) => plan.sessionDate === null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return undated[0] ?? null
}
