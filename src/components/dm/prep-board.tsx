import { NextNightHero } from '@/components/dm/next-night-hero'
import { InsetGroup, InsetLinkRow } from '@/components/dm/inset-list'
import { PlanNightSheet } from '@/components/dm/plan-night-sheet'
import {
  countCampaignEncounters,
  countCampaignHandouts,
  countCampaignLocations,
  countCampaignNpcs,
  countPartyReadiness,
  type FightTally,
  type PartyTally,
  type RevealTally,
} from '@/lib/db/prep'
import type { Campaign } from '@/lib/db/schema'
import { getSessionPlan, listSessionPlans } from '@/lib/db/session-plans'
import { todaySessionDate } from '@/lib/notes/schema'
import { nextPlannedNight } from '@/lib/session-plans/next-night'
import { planReadiness } from '@/lib/session-plans/readiness'

// Everything under the Prep tab's title (`dm-chronology/prep-tab`).
//
// Three things, in the order a night is built: the night you are writing next,
// the door to writing another one, and the world the nights are drawn from.
// Session zero sits last under its own header, because it is written once
// before any of this and then read.
//
// The old campaign hub asked the DM to find four prep links inside a card,
// halfway down a scroll that also held the party, the fights and the join
// code. This is the same four doors with the numbers already on them — how
// many NPCs exist and how many the party has met — so the tab answers "is
// there anything to do here" without being opened.
//
// A server component that does its own reads: every count is a number, none
// of them selects a DM-only column (`src/lib/db/prep.ts` is where that
// property is argued), and so nothing here ships a campaign's prep to the
// browser to render a count of it.

/** "12 · 4 revealed", or the honest nothing. */
function revealValue({ total, revealed }: RevealTally): string {
  return total === 0 ? 'None yet' : `${total} · ${revealed} revealed`
}

/** "2 ready" — a fight built and not yet called over. */
function fightValue({ total, ready }: FightTally): string {
  if (total === 0) return 'None yet'
  return ready === 0 ? 'None ready' : `${ready} ready`
}

/** "5 · 1 not ready" — the character readiness the DM's profile page fixes. */
function partyValue({ total, notReady }: PartyTally): string {
  if (total === 0) return 'Nobody yet'
  return notReady === 0 ? `${total} · all ready` : `${total} · ${notReady} not ready`
}

export async function PrepBoard({ campaign, dmUserId }: { campaign: Campaign; dmUserId: string }) {
  const [plans, npcs, places, handouts, fights, party] = await Promise.all([
    listSessionPlans(dmUserId, campaign.id),
    countCampaignNpcs(dmUserId, campaign.id),
    countCampaignLocations(dmUserId, campaign.id),
    countCampaignHandouts(dmUserId, campaign.id),
    countCampaignEncounters(dmUserId, campaign.id),
    countPartyReadiness(dmUserId, campaign.id),
  ])

  const night = nextPlannedNight(plans ?? [], todaySessionDate())

  // The rail needs the night's scenes, secrets and links, which are three
  // tables the list read does not touch — so one more DM-scoped read, for the
  // one plan the hero is about rather than for every plan in the campaign.
  const detail = night ? await getSessionPlan(dmUserId, campaign.id, night.id) : null

  const base = `/dm/campaigns/${campaign.id}`

  return (
    <div className="space-y-6">
      <NextNightHero
        campaignId={campaign.id}
        night={night}
        readiness={detail ? planReadiness(detail, party) : null}
      />

      <InsetGroup
        label="Nights"
        footer="Nights you have played, and the campaigns you have closed, live under Sessions."
      >
        <PlanNightSheet
          campaignId={campaign.id}
          label="Plan another night"
          hint="A title and, if it is fixed, a date."
        />
      </InsetGroup>

      <InsetGroup label="The world">
        <InsetLinkRow href={`${base}/npcs`} label="NPCs" value={revealValue(npcs)} />
        <InsetLinkRow href={`${base}/locations`} label="Places" value={revealValue(places)} />
        <InsetLinkRow href={`${base}/handouts`} label="Handouts" value={revealValue(handouts)} />
        {/* The builder rather than a list: building a fight is the prep act,
            and running one is the Play tab's. The number is the fights waiting
            there for you. */}
        <InsetLinkRow
          href={`${base}/encounters/new`}
          label="Encounters"
          hint="Build a fight to run later."
          value={fightValue(fights)}
        />
        {/* The Lazy DM's first step — review the characters — and the one row
            here that is a job rather than a count: a character with no weapon
            readied is one the first fight stops on. The same door the plan
            screen's first step opens (`dm-chronology/eight-steps-plan`), so
            the step and the tab agree about where the party lives. */}
        <InsetLinkRow
          href={`${base}/party`}
          label="The party"
          hint="Who is at the table, and whether their sheets are ready."
          value={partyValue(party)}
          tone={party.notReady > 0 ? 'bloodied' : 'muted'}
        />
      </InsetGroup>

      <InsetGroup label="Before the campaign">
        <InsetLinkRow
          href={`${base}#session-zero`}
          label="Session zero"
          hint="The one page your players read: the pitch, the tone, when you play."
          value={campaign.sessionZero?.trim() ? 'Written' : 'Empty'}
        />
      </InsetGroup>
    </div>
  )
}
