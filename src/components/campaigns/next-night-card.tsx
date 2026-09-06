import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAnnouncedNight } from '@/lib/campaigns/discovered'
import type { PublicSessionPlan } from '@/lib/db/discovered'

/**
 * The next session, as the DM announced it (`first-table/announce-the-night`).
 *
 * On 2026-09-05 the only place Thursday's date existed was the DM's screen.
 * This is the other place: the top of the player's campaign page, under the
 * one page and above the recap, because "when" is the question a player opens
 * this page with in the week before a session.
 *
 * **The title and the date, and nothing else.** `night` is a
 * `PublicSessionPlan` — the data layer selected the public columns and the
 * type has no strong start on it to print. A night announced without a date is
 * the title alone. A server component: it rides the page's 15 s refresh like
 * every other reveal, so an announcement lands without anyone reloading.
 *
 * Renders nothing when nothing is announced — most campaigns, most weeks.
 */
export function NextNightCard({ night }: { night: PublicSessionPlan | null }) {
  if (!night) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Next session</CardTitle>
        <CardDescription>As your DM announced it.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium">{formatAnnouncedNight(night)}</p>
      </CardContent>
    </Card>
  )
}
