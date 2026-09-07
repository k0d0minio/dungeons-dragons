// What every DM tab is scoped to, resolved once per render (D48).
//
// The campaign stopped being a page and became scope: Prep, Play and Sessions
// are id-less routes, and the campaign they are about is worked out here, on
// the server, before anything paints. The rule itself lives in
// `getActiveCampaignForDm`; this is the request-shaped wrapper around it —
// the cookie read, the chip's menu, and the list the empty state's
// carry-forward offers.
import { cookies } from 'next/headers'

import type { CarryableCampaign } from '@/components/campaigns/create-campaign-form'
import {
  getActiveCampaignForDm,
  listCampaignsForDm,
  listOpenCampaignsForDm,
  type Campaign,
} from '@/lib/db/campaigns'

import { DM_CAMPAIGN_COOKIE } from './campaign-cookie'

export interface DmScope {
  /** The campaign the tabs are about, or `null` when no table is running. */
  campaign: Campaign | null
  /**
   * The other campaigns still running, for the chip's menu. Empty for the DM
   * who runs one table, which is the shape this app is built for.
   */
  otherCampaigns: Campaign[]
  /**
   * Every campaign this DM has ever run, closed ones included, for the empty
   * state's carry-forward — a closed tutorial is exactly the table most worth
   * carrying (D47). Only loaded when there is nothing active, because that is
   * the only screen that offers it.
   */
  carryable: CarryableCampaign[]
}

/**
 * Resolve the active campaign for `dmUserId` from the request.
 *
 * Two small statements: `getActiveCampaignForDm` owns the rule and answers
 * "which one", and the chip's menu then asks for the rest of the open list.
 * Deliberately not folded into one query — the rule for what is active is
 * worth having in exactly one place more than this page is worth one fewer
 * round trip against a table that holds a handful of rows.
 */
export async function resolveDmScope(dmUserId: string): Promise<DmScope> {
  const preferred = (await cookies()).get(DM_CAMPAIGN_COOKIE)?.value ?? null
  const campaign = await getActiveCampaignForDm(dmUserId, preferred)

  if (!campaign) {
    const all = await listCampaignsForDm(dmUserId)

    return {
      campaign: null,
      otherCampaigns: [],
      carryable: all.map(({ id, name }) => ({ id, name })),
    }
  }

  const open = await listOpenCampaignsForDm(dmUserId)

  return {
    campaign,
    otherCampaigns: open.filter((other) => other.id !== campaign.id),
    carryable: [],
  }
}
