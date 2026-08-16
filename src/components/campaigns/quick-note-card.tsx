'use client'

import { QuickNoteForm } from '@/components/campaigns/quick-note-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Quick capture on the encounter tracker (DND-058).
 *
 * The tracker is the screen the DM holds open for three hours, so it is where
 * the thing worth writing down actually happens — "the goblin chief surrendered",
 * "they let the cultist go". Sending them to the campaign page to write that
 * would mean leaving the initiative order mid-fight, which is exactly the
 * friction that has kept campaign notes on paper.
 *
 * The line lands in the same note the campaign page shows, and this card
 * deliberately does not list the notes back: mid-combat the tracker below is
 * what the DM needs to see, and the toast is enough to say the line landed.
 */
export function QuickNoteCard({ campaignId }: { campaignId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick note</CardTitle>
        <CardDescription>
          Goes on the end of tonight&apos;s session note, on the campaign page. Yours unless you
          share it there.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QuickNoteForm campaignId={campaignId} />
      </CardContent>
    </Card>
  )
}
