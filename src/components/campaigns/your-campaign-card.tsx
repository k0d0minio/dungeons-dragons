import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Campaign } from '@/lib/db/schema'

/**
 * The way from a character sheet to the table it is played at
 * (`dm-run-suite/player-campaign-view`).
 *
 * **This is the only route to the campaign page**, and that is the ticket's
 * decision rather than an oversight: Jamie chose character-first as the front
 * door, so the campaign view is not a tab and not on the home screen. A player
 * gets there from the character that is on it.
 *
 * At the foot of the sheet, beside the shared notes, because that is where
 * everything campaign-shaped already lives on a sheet (DND-058) — and because
 * the top of the sheet is the combat core, which is what a player opens the
 * page for mid-fight.
 *
 * Renders nothing for a character on no campaign, which is most of them, and
 * nothing for a DM reading a party member's sheet — `listCampaignsForCharacter`
 * returns an empty list unless the reader owns the character *and* sits at the
 * table, so "your campaign" is only ever said to someone whose campaign it is.
 */
export function YourCampaignCard({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {campaigns.length === 1 ? 'Your campaign' : 'Your campaigns'}
        </CardTitle>
        <CardDescription>The party, and what your DM has shown you.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={`/campaigns/${campaign.id}`}
                className="hover:bg-accent flex min-h-11 items-center rounded-md border p-3 font-medium"
              >
                {campaign.name}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
