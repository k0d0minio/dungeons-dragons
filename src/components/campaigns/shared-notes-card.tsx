import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SharedNote } from '@/lib/db/notes'
import { formatSessionDate } from '@/lib/notes/schema'

/**
 * The notes a DM has shared with the party, as a player reads them (DND-058).
 *
 * **This is the whole player read surface, and that is deliberate.** Players
 * have no campaign screen — the ticket asked for the smallest honest surface
 * rather than an invented one — and their character sheet is where they already
 * are at a table. So a shared note appears at the foot of the sheet of every
 * character in that campaign, labelled with the campaign it came from because a
 * character may sit at more than one table.
 *
 * A server component with no interactivity: there is nothing to do to these but
 * read them, and `listSharedNotesForCharacter` has already refused to return
 * anything the DM has not shared.
 */
export function SharedNotesCard({ notes }: { notes: SharedNote[] }) {
  // Nothing shared is not worth a card telling a player so — it would be a
  // permanent empty box on a sheet that is already several screens long.
  if (notes.length === 0) return null

  // One campaign is the ordinary case; the label only earns its place when a
  // character sits at two tables.
  const multipleCampaigns = new Set(notes.map((note) => note.campaignName)).size > 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notes from your DM</CardTitle>
        <CardDescription>
          Shared with the party. Your DM keeps the rest to themselves.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="space-y-1 rounded-md border p-3">
              <h4 className="text-muted-foreground text-xs tracking-wide uppercase">
                {formatSessionDate(note.sessionDate)}
                {multipleCampaigns ? ` · ${note.campaignName}` : ''}
              </h4>
              {/* Quick capture joins lines with newlines — without pre-wrap a
                  whole session reads as one paragraph. */}
              <p className="text-sm whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
