import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatLogMoment, formatLogTime, sessionLogLabel } from '@/lib/campaigns/session-log'
import type { SessionLogEntry } from '@/lib/db/session-log'
import { formatSessionDate } from '@/lib/notes/schema'

/**
 * What the app remembered of tonight (`dm-run-suite/session-log-recap`).
 *
 * Read forwards, oldest first, because it is a log of an evening rather than a
 * feed — the DM scanning it is reconstructing the order the night went in, and
 * newest-first would put the last fight above the scene that led to it.
 *
 * A server component with nothing to do to it. Every line here was written by
 * an act somewhere else — a fight ended, a reveal switched, a secret ticked —
 * so there is nothing to edit here that would not be editing the wrong thing;
 * the place to change any of it is the screen where it happened.
 */
export function SessionLogCard({
  entries,
  since,
  capturedNotes,
  capturedOn,
}: {
  entries: SessionLogEntry[]
  /** When the last session closed, or null if none ever has. */
  since: Date | null
  /** The DM's own quick-captured lines for tonight, when there are any. */
  capturedNotes: string | null
  /** The date of the note those lines are in, `YYYY-MM-DD`. */
  capturedOn: string | null
}) {
  const captured = capturedNotes?.trim() ?? ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tonight so far</CardTitle>
        <CardDescription>
          {since === null
            ? 'Everything the app has recorded — this table has not closed a session yet.'
            : `Everything since you closed the last session, ${formatLogMoment(since)}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length > 0 ? (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={`${entry.kind}-${entry.id}`}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <Badge variant="secondary" className="shrink-0">
                  {sessionLogLabel(entry.kind)}
                </Badge>
                <span className="min-w-0 flex-1 text-sm">{entry.title}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatLogTime(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          // Not an apology: a log is empty until the session starts producing
          // one, and the DM opening this before a game should read that as
          // normal rather than as something to fix.
          <p className="text-muted-foreground text-sm">
            Nothing yet. Ending a fight, revealing an NPC, a place or a handout, and ticking a scene
            or a secret off a session plan all land here on their own.
          </p>
        )}

        {captured ? (
          <div className="space-y-1 rounded-md border p-3">
            <h4 className="text-muted-foreground text-xs tracking-wide uppercase">
              Your notes{capturedOn ? ` · ${formatSessionDate(capturedOn)}` : ''}
            </h4>
            {/* Quick capture joins lines with newlines — without pre-wrap a
                whole evening reads as one paragraph. */}
            <p className="text-sm whitespace-pre-wrap">{captured}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
