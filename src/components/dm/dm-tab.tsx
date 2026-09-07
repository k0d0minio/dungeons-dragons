import type { ReactNode } from 'react'

import { CreateCampaignForm } from '@/components/campaigns/create-campaign-form'
import { CampaignChip } from '@/components/dm/campaign-chip'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { isDatabaseConfigured } from '@/lib/db/client'
import type { Campaign } from '@/lib/db/schema'
import { resolveDmScope, type DmScope } from '@/lib/dm/scope'

const PAGE_CLASS = 'mx-auto w-full max-w-2xl space-y-4 p-4'

/**
 * The teaching empty state every DM tab shares (D48, and the epic's rail:
 * teach in the empty state, with one call to action, never a tour).
 *
 * There is one thing to do before Prep, Play or Sessions mean anything, so
 * there is one control on this screen: name the table. The carry-forward the
 * form already carries comes with it — a DM who closed the tutorial last week
 * starts the real campaign with the same seats and characters (D47) rather
 * than sending a second join link round.
 */
function NoCampaignYet({ campaigns }: { campaigns: DmScope['carryable'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start with a campaign</CardTitle>
        <CardDescription>
          Everything behind the screen hangs off one campaign — the people at the table, what you
          prepare, the fights you run and the log of the nights you have played. Name yours and the
          tabs fill in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateCampaignForm campaigns={campaigns} />
      </CardContent>
    </Card>
  )
}

/**
 * The shell behind Prep, Play and Sessions (D48).
 *
 * The three tabs are the chronology of a game, and they share everything but
 * their content: the large title, the campaign chip under it naming the scope,
 * and the one empty state for the DM who has no table running yet. Built once
 * here so a tab page is its title and its content and nothing else — the
 * content arrives in `prep-tab`, `play-tab` and `sessions-tab`.
 *
 * Async, and it does its own loading, because the scope is the same question
 * on all three: the session, then the active campaign for it. The DM wall is
 * `src/app/dm/layout.tsx`'s and has already run by the time this renders; the
 * session read here is what names the DM for the query, and every query it
 * reaches still folds in `campaigns.dm_user_id`.
 */
export async function DmTab({
  title,
  subtitle,
  children,
  content,
}: {
  title: string
  subtitle?: ReactNode
  children?: ReactNode
  /**
   * The tab's content, when it needs the campaign it is about.
   *
   * A callback rather than a prop on the page, because the scope is resolved
   * *here* — the page has no campaign to hand down without asking the same
   * three questions a second time. Server-side throughout, so what it returns
   * may be an async component of its own; `prep-tab` returns `PrepBoard`,
   * which does its own DM-scoped reads with the id this hands it.
   */
  content?: (scope: { campaign: Campaign; dmUserId: string }) => ReactNode
}) {
  const user = await requireSessionUser()

  // Reading the flag before querying keeps an unprovisioned deploy on a page
  // that explains itself, the way the DM home did before these tabs replaced it.
  if (!isDatabaseConfigured()) {
    return (
      <main className={PAGE_CLASS}>
        <PageHeader title={title} subtitle={subtitle} />
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              The DM tools need <code>DATABASE_URL</code> to be set. If you run this app, see the
              database runbook in the repo docs.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  const scope = await resolveDmScope(user.id)

  return (
    <main className={PAGE_CLASS}>
      <PageHeader title={title} subtitle={subtitle} />

      {scope.campaign ? (
        <>
          <CampaignChip
            campaign={{ id: scope.campaign.id, name: scope.campaign.name }}
            others={scope.otherCampaigns.map(({ id, name }) => ({ id, name }))}
          />
          {children}
          {content?.({ campaign: scope.campaign, dmUserId: user.id })}
        </>
      ) : (
        <NoCampaignYet campaigns={scope.carryable} />
      )}
    </main>
  )
}
