import { DmTab } from '@/components/dm/dm-tab'
import { PlayFights } from '@/components/dm/play-fights'
import { PlayParty } from '@/components/dm/play-party'
import { NoPlanTonight, PlayPlan } from '@/components/dm/play-plan'
import { PlayReveal, PlayRevealProvider } from '@/components/dm/play-reveal'
import { PlayToolbar } from '@/components/dm/play-toolbar'
import { requireSessionUser } from '@/lib/auth/server'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { listOpenFights } from '@/lib/db/encounters'
import { listHiddenReveals } from '@/lib/db/reveals'
import { getSessionPlan, listSessionPlans } from '@/lib/db/session-plans'
import { getUserNames } from '@/lib/db/users'
import { tonightsPlan } from '@/lib/dm/tonight'
import { fightHasStarted } from '@/lib/encounters/fight-status'
import { todaySessionDate } from '@/lib/notes/schema'
import type { Campaign } from '@/lib/db/schema'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Play',
}

/**
 * Play — the screen a DM has open with players either side of him (D48,
 * `dm-chronology/play-tab`), and where `/dm` lands.
 *
 * The order of the four sections is the order a hand reaches for things
 * mid-session: **the fight**, then **the party**, then **tonight's plan**,
 * then **reveal**. It is not a summary of the campaign and it is not the old
 * hub with better spacing — everything between sessions (the join link, the
 * gates, session zero, closing the campaign) is deliberately absent, and
 * arrives on the settings page reached from the chip.
 *
 * **Nothing on this screen changes what six phones show except the reveal
 * switches**, which is their entire job. The party section is read-only, the
 * plan's ticks are the DM's own, the milestone writes one column that no sheet
 * acts on until its player opens it, and the quick note lands in a note only
 * the DM reads.
 *
 * Every read below is DM-scoped in its own query — `campaigns.dm_user_id`,
 * folded in by the data layer, not checked here — and what crosses to the
 * client is the narrowest shape each section needs: names and hit points for
 * the party, labels and initiative for the fights, a kind and a name for
 * anything still hidden. The one DM-only column that reaches the browser is
 * the plan's strong start, which is printed behind `SecretLayer`, the same
 * marking every prep screen gives it.
 */
async function PlayBoard({ campaign }: { campaign: Campaign }) {
  // The asker, not the campaign's own `dm_user_id`: every read below is scoped
  // by who is signed in, so the authority check stays a check rather than a
  // tautology that happens to hold because the scope resolved it.
  const user = await requireSessionUser()
  const today = todaySessionDate()

  const [roster, fights, plans, hidden] = await Promise.all([
    getCampaignRoster(user.id, campaign.id),
    listOpenFights(user.id, campaign.id),
    listSessionPlans(user.id, campaign.id),
    listHiddenReveals(user.id, campaign.id),
  ])

  const tonight = tonightsPlan(plans ?? [], today)

  // The plan's lines are a second read and only for the plan actually on
  // screen: `listSessionPlans` answers the plan rows, and the scenes and
  // secrets hang off one of them.
  const [detail, playedBy] = await Promise.all([
    tonight ? getSessionPlan(user.id, campaign.id, tonight.id) : null,
    getUserNames((roster?.characters ?? []).map((character) => character.ownerId)),
  ])

  // The table screen follows the fight being run, not the newest encounter: a
  // link to a fight nobody is in is a wall display showing an empty order.
  const live = fights.find((fight) => fightHasStarted(fight.encounter, fight.combatants))

  return (
    <PlayRevealProvider campaignId={campaign.id} initialHidden={hidden}>
      <PlayFights campaignId={campaign.id} fights={fights} />

      <PlayParty
        campaignId={campaign.id}
        initialCharacters={roster?.characters ?? []}
        initialArmor={roster?.armor ?? {}}
        playedBy={playedBy}
        milestoneLevel={campaign.milestoneLevel}
      />

      {detail ? (
        <PlayPlan
          campaignId={campaign.id}
          plan={detail.plan}
          initialItems={detail.items}
          today={today}
        />
      ) : (
        <NoPlanTonight campaignId={campaign.id} />
      )}

      <PlayReveal />

      <PlayToolbar
        campaignId={campaign.id}
        tableFight={
          live ? { name: live.encounter.name, shareToken: live.encounter.shareToken } : null
        }
      />
    </PlayRevealProvider>
  )
}

export default async function DmPlayPage() {
  return (
    <DmTab
      title="Play"
      subtitle="Tonight, in front of the table: the fight, the party, and what you reveal."
    >
      {/* Called rather than rendered, so what `DmTab` awaits is the finished
          tree: the board's four reads happen inside the tab's own await
          instead of as a second async component nested in its output. */}
      {(campaign) => PlayBoard({ campaign })}
    </DmTab>
  )
}
