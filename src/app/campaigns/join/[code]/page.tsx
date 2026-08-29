import { notFound } from 'next/navigation'

import { JoinCampaignForm } from '@/components/campaigns/join-campaign-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { formatReferenceIndex } from '@/lib/characters/display'
import { getCampaignByJoinCode } from '@/lib/db/campaigns'
import { listCharacters } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Join campaign',
}

/**
 * Where a campaign join link lands (DND-046). Sign-in is required first —
 * `src/proxy.ts` denies by default (D34), so a signed-out player is sent to
 * sign-in (or invite-gated sign-up, D20) and has to open the link again
 * afterwards: the wall redirects to `/auth/sign-in` flat, with no return
 * destination. A dead code 404s: whether it was regenerated or never real is
 * not distinguishable, on purpose.
 */
export default async function JoinCampaignPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireSessionUser()
  const { code } = await params

  if (!isDatabaseConfigured()) notFound()

  const campaign = await getCampaignByJoinCode(code)
  if (!campaign) notFound()

  const characters = await listCharacters(user.id)

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {campaign.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to a campaign. Pick which of your characters play at this
            table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinCampaignForm
            code={code}
            campaignName={campaign.name}
            characters={characters.map((character) => ({
              id: character.id,
              name: character.name,
              summary: `Level ${character.level} ${formatReferenceIndex(
                character.speciesIndex,
              )} ${formatReferenceIndex(character.classIndex)}`,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  )
}
