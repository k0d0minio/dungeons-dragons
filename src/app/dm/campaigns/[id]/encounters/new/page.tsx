import { notFound } from 'next/navigation'

import { EncounterBuilder } from '@/components/encounters/encounter-builder'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getSessionPlan } from '@/lib/db/session-plans'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Build an encounter',
}

/**
 * The encounter builder (`dm-prep-suite/encounter-builder`) — the door every
 * new encounter now comes through.
 *
 * A page rather than a card on the Play tab, for the same reason prep is:
 * Play is what gets opened mid-session, and assembling a fight is a different
 * visit from running one — so the builder belongs to Prep, and its back link
 * goes there. DM-scoped in the query — anyone else's campaign id 404s like it
 * never existed.
 *
 * The roster is served with levels, because levels are the budget. Nothing else
 * about a character reaches the client here.
 *
 * **`?plan=` is where the fight came from** (`dm-chronology/eight-steps-plan`):
 * the Monsters step of a night's prep opens the builder carrying the plan's
 * id, and what the builder makes is linked straight back to that night. The
 * plan is read here rather than trusted from the query string — through the
 * same DM-scoped read every other plan screen uses — so a plan id belonging to
 * somebody else's table is simply not a plan, and the page builds a fight for
 * the campaign as if the parameter were absent.
 */
export default async function NewEncounterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ plan?: string | string[] }>
}) {
  const user = await requireSessionUser()
  const [{ id }, query] = await Promise.all([params, searchParams])

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const asked = typeof query.plan === 'string' ? query.plan : null
  const plan = asked ? await getSessionPlan(user.id, id, asked) : null

  const attendees = roster.characters.map((character) => ({
    id: character.id,
    name: character.name,
    level: character.level,
  }))

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Build an encounter"
        subtitle={
          plan
            ? `For ${plan.plan.title} — it will be linked to the night`
            : 'Monsters, and what they cost the people who turn up.'
        }
        backHref={plan ? `/dm/campaigns/${id}/session-plans/${plan.plan.id}` : '/dm/prep'}
        backLabel={plan ? plan.plan.title : 'Prep'}
      />

      <EncounterBuilder campaignId={id} roster={attendees} planId={plan?.plan.id} />
    </main>
  )
}
