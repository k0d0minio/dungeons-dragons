import { PlayFights } from '@/components/dm/play-fights'
import { PlayParty } from '@/components/dm/play-party'
import { NoPlanTonight, PlayPlan } from '@/components/dm/play-plan'
import { PlayReveal, PlayRevealProvider } from '@/components/dm/play-reveal'
import { PlayToolbar } from '@/components/dm/play-toolbar'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { listOpenFights } from '@/lib/db/encounters'
import { listHiddenReveals } from '@/lib/db/reveals'
import type { Campaign } from '@/lib/db/schema'
import { getSessionPlan, listSessionPlans } from '@/lib/db/session-plans'
import { getUserNames } from '@/lib/db/users'
import { fightHasStarted } from '@/lib/encounters/fight-status'
import { todaySessionDate } from '@/lib/notes/schema'
import { nextPlannedNight } from '@/lib/session-plans/next-night'

// Everything under the Play tab's title (`dm-chronology/play-tab`).
//
// Four sections, in the order a hand reaches for things with players either
// side of you: **the fight**, **the party**, **tonight's plan**, **reveal**.
// It is not a summary of the campaign and it is not the old hub with better
// spacing — everything between sessions (the join link, the gates, session
// zero, closing the campaign) is on `/dm/campaign`, reached from the chip.
//
// **Nothing here changes what six phones show except the reveal switches**,
// which is their entire job. The party section is read-only, the plan's ticks
// are the DM's own, the milestone writes one column that no sheet acts on
// until its player opens it, and the quick note lands in a note only the DM
// reads.
//
// A server component that does its own reads, like `PrepBoard`: every one is
// scoped to `dmUserId` in its own query, and what crosses to the client is the
// narrowest shape each section needs — names and hit points for the party,
// labels and initiative for the fights, a kind and a name for anything still
// hidden. The one DM-only column that reaches a browser is the plan's strong
// start, printed behind `SecretLayer`, the same marking every prep screen
// gives it.
export async function PlayBoard({ campaign, dmUserId }: { campaign: Campaign; dmUserId: string }) {
  const today = todaySessionDate()

  const [roster, fights, plans, hidden] = await Promise.all([
    getCampaignRoster(dmUserId, campaign.id),
    listOpenFights(dmUserId, campaign.id),
    listSessionPlans(dmUserId, campaign.id),
    listHiddenReveals(dmUserId, campaign.id),
  ])

  // The same rule the Prep tab's hero uses, because Play and Prep ask the plan
  // list the same question — the night dated today, else the soonest ahead,
  // else the newest undated — and answer it for different reasons. A night
  // already played wins nothing either way: on Prep because there is nothing
  // left to write, here because a night's secrets were ticked off on it.
  const tonight = nextPlannedNight(plans ?? [], today)

  // The plan's lines are a second read and only for the plan on screen:
  // `listSessionPlans` answers the plan rows, and the scenes and secrets hang
  // off one of them.
  const [detail, playedBy] = await Promise.all([
    tonight ? getSessionPlan(dmUserId, campaign.id, tonight.id) : null,
    getUserNames((roster?.characters ?? []).map((character) => character.ownerId)),
  ])

  // The table screen follows the fight being run, not the newest encounter: a
  // link to a fight nobody is in is a wall display showing an empty order.
  const live = fights.find((fight) => fightHasStarted(fight.encounter, fight.combatants))

  return (
    <PlayRevealProvider campaignId={campaign.id} initialHidden={hidden}>
      <div className="space-y-6">
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
      </div>

      <PlayToolbar
        campaignId={campaign.id}
        tableFight={
          live ? { name: live.encounter.name, shareToken: live.encounter.shareToken } : null
        }
      />
    </PlayRevealProvider>
  )
}
