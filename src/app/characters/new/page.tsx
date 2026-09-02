import Link from 'next/link'

import {
  CharacterWizard,
  type WizardCampaign,
} from '@/components/characters/wizard/character-wizard'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { listCampaignsForMember } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'New character',
}

/**
 * Which campaign this character is being made for, if any
 * (`guided-creation/wizard-frame`).
 *
 * Two ways to know, and both are checked against the roster rather than taken
 * on trust. `?campaign=` is how the join flow hands the answer over — a player
 * who has just followed a DM's link is making a character for *that* table, and
 * the id is only honoured if they are actually seated at it. Failing that, a
 * player who sits at exactly one table is making a character for it; at two or
 * more there is a real question, and the wizard does not guess — the sheet's
 * own campaign controls are where that gets answered.
 */
async function campaignContext(
  userId: string,
  requested: string | undefined,
): Promise<WizardCampaign | null> {
  const campaigns = await listCampaignsForMember(userId)

  const chosen = requested
    ? campaigns.find((campaign) => campaign.id === requested)
    : campaigns.length === 1
      ? campaigns[0]
      : undefined

  return chosen ? { id: chosen.id, name: chosen.name } : null
}

export default async function NewCharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>
}) {
  const user = await requireSessionUser()
  const { campaign: requested } = await searchParams

  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <PageHeader title="New character" backHref="/characters" backLabel="Your characters" />
        {/* A twenty-minute flow that cannot save at the end is worse than no
            flow at all: it takes the whole evening and then loses it. */}
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Character creation needs <code>DATABASE_URL</code> to be set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/library" className="text-sm underline underline-offset-4">
              Back to the reference browser
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  const campaign = await campaignContext(user.id, requested)

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="New character"
        subtitle="Answer four questions and we will build one for you, or go straight to the eight steps. Everything is filled in either way."
        backHref="/characters"
        backLabel="Your characters"
      />

      <CharacterWizard campaign={campaign} />
    </main>
  )
}
