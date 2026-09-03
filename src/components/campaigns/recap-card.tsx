import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { CampaignRecap } from '@/lib/db/notes'
import { formatSessionDate } from '@/lib/notes/schema'

/**
 * "Previously on…" — the first thing a player sees
 * (`dm-run-suite/session-log-recap`).
 *
 * **At the top of the campaign view, above the party**, because it is the one
 * thing on this page that is read at a fixed moment: the start of the next
 * session, by someone who was here a fortnight ago and remembers three names
 * and a door. Everything below it is reference the party browses; this is the
 * bit that gets read out loud.
 *
 * **The latest recap in full, the earlier ones as a list of dates.** A player
 * catching up wants last session, and a campaign twenty sessions in would
 * otherwise open on twenty of them. The older bodies are rendered too, under
 * their dates and below the fold of the newest — nothing is hidden behind a
 * request, because this page has no client-side data and adding some to save
 * scrolling would be a fourth player-facing surface to defend.
 *
 * A server component, and `listCampaignRecaps` has already refused to return
 * anything unshared or unclosed — a DM's working notes are not recaps and
 * never reach this card.
 */
export function RecapCard({ recaps }: { recaps: CampaignRecap[] }) {
  // A campaign before its first close has no recaps, and a card explaining
  // that to a player would be a permanent empty box above the party.
  if (recaps.length === 0) return null

  const [latest, ...earlier] = recaps

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Previously on…</CardTitle>
        <CardDescription>
          {formatSessionDate(latest.sessionDate)}, as your DM tells it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pre-wrap: a recap is written as lines, and without it a session
            reads as one paragraph. */}
        <p className="text-sm whitespace-pre-wrap">{latest.body}</p>

        {earlier.length > 0 ? (
          <div className="space-y-3 border-t pt-3">
            <h4 className="text-muted-foreground text-xs tracking-wide uppercase">
              Earlier sessions
            </h4>
            <ul className="space-y-3">
              {earlier.map((recap) => (
                <li key={recap.id} className="space-y-1">
                  <h5 className="text-muted-foreground text-xs">
                    {formatSessionDate(recap.sessionDate)}
                  </h5>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">{recap.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
