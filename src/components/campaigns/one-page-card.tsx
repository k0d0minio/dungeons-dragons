import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * The one page the table agreed on, as a player reads it
 * (`first-table/session-zero-one-pager`).
 *
 * **The first card on the campaign page**, above the next night and the recap:
 * the pitch, the tone, how the characters know each other, how deadly, the
 * phone rule and when the table plays — written by the DM as they would say it,
 * and the one thing on this page a player reads *before* the first session
 * rather than after one. It is a column on the campaign row the page already
 * holds (`campaigns.session_zero`), player-facing by design, so there is no
 * reveal and no second read.
 *
 * Paragraphs are blank-line separated, and the line breaks inside one are
 * kept: the DM wrote it on a phone, one heading per paragraph, and a page that
 * re-flowed six headings into one block would not be the page they wrote.
 *
 * Renders nothing while the DM has not written it.
 */
export function OnePageCard({ body }: { body: string | null }) {
  const paragraphs = (body ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)

  if (paragraphs.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">The one page</CardTitle>
        <CardDescription>What the table agreed on, in your DM’s words.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}
