import { notFound } from 'next/navigation'

import { CampaignGatesForm } from '@/components/campaigns/campaign-gates-form'
import { CampaignMilestoneCard } from '@/components/campaigns/campaign-milestone-card'
import { CampaignNameCard } from '@/components/campaigns/campaign-name-card'
import { CloseCampaignCard } from '@/components/campaigns/close-campaign-card'
import { JoinCodeCard } from '@/components/campaigns/join-code-card'
import { SessionZeroCard } from '@/components/campaigns/session-zero-card'
import { SettingsGroup, SettingsLinkRow, SettingsValueRow } from '@/components/dm/settings-list'
import { SettingsSheetRow } from '@/components/dm/settings-sheet-row'
import { PageHeader } from '@/components/navigation/page-header'
import { requireSessionUser } from '@/lib/auth/server'
import { formatDiscoveredOn } from '@/lib/campaigns/discovered'
import { GATE_KEYS } from '@/lib/campaigns/gates'
import { composeRecapDraft } from '@/lib/campaigns/session-log'
import { formatReferenceIndex } from '@/lib/characters/display'
import { getCampaignForDm, getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { getSessionLog } from '@/lib/db/session-log'
import { getUserName } from '@/lib/db/users'
import { resolveDmScope } from '@/lib/dm/scope'

// Reads the session and the active campaign, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Campaign settings',
}

/**
 * The tabs a DM can arrive from, and what the back link is called from each.
 *
 * A whitelist because `from` comes off a query string: the chip hands in the
 * path it was tapped on, and anything else — a hand-written URL, an old link
 * — falls back to Play rather than becoming a link to wherever the query
 * string says.
 */
const BACK_TO: Record<string, string> = {
  '/dm/prep': 'Prep',
  '/dm/play': 'Play',
  '/dm/sessions': 'Sessions',
}

/**
 * Between-sessions controls for one campaign
 * (`dm-chronology/campaign-settings`, D48).
 *
 * The join link, the feature gates, the milestone, the one page, the roster
 * and the end of the campaign are decisions made on a Tuesday with nobody at
 * the table. They used to sit on the campaign hub, in the same scroll as the
 * party glance and the encounter you are about to run, which is the screen a
 * DM opens mid-fight. Here they are one grouped list reached from the campaign
 * chip, in the idiom every phone owner already knows: **label left, current
 * state right, a chevron into the control**.
 *
 * The controls themselves are the hub's, unchanged and unmoved: each opens in
 * a bottom sheet and posts to the route it posted to before. The one new
 * control is the name, which had no editor anywhere until now.
 *
 * **Scope, resolved twice over.** Normally the campaign is the active one
 * (`resolveDmScope`, the chip's own answer). `?id=` names a specific one —
 * how Sessions reaches a *closed* campaign's settings, which by definition is
 * never active. Either way the read is `campaigns.dm_user_id`-scoped, so
 * another DM's id 404s like it never existed.
 *
 * A closed campaign shows when it ended and offers no join link, because a
 * closed campaign answers no join code (`getCampaignByJoinCode` reads open
 * campaigns alone) and a link that looks live but seats nobody is worse than
 * no link.
 */
export default async function CampaignSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; from?: string }>
}) {
  const user = await requireSessionUser()
  const { id, from } = await searchParams

  if (!isDatabaseConfigured()) notFound()

  const campaign = id
    ? await getCampaignForDm(user.id, id)
    : (await resolveDmScope(user.id)).campaign

  // No campaign is not an empty state here: the only doors to this page are
  // the chip and a closed campaign in Sessions, and both name one.
  if (!campaign) notFound()

  const roster = await getCampaignRoster(user.id, campaign.id)
  if (!roster) notFound()

  const backHref = from && from in BACK_TO ? from : '/dm/play'

  // Aliased so the closed branch below knows it has a date, not a `null`.
  const closedAt = campaign.closedAt
  const open = closedAt === null

  // The recap the close card opens with, composed exactly as the session log
  // composes it (`first-table/one-night-campaign`). A closed campaign has
  // nothing left to close, so it is not read for one.
  const log = open ? await getSessionLog(user.id, campaign.id) : null
  const recapDraft = log
    ? composeRecapDraft({ entries: log.entries, capturedNotes: log.note?.body ?? null })
    : ''

  // Who sits at the table, with the account name beside the character — the
  // DM's actual question is "which of my friends is Wobbles". One read per
  // seat, on a page nothing polls, rather than folded into the roster the
  // glance re-reads every fifteen seconds.
  const players = roster.members.filter((member) => member.role === 'player')
  const names = await Promise.all(players.map((member) => getUserName(member.userId)))

  const seats = players
    .map((member, index) => ({
      userId: member.userId,
      name: names[index] ?? 'This account no longer exists',
      characters: roster.characters.filter((character) => character.ownerId === member.userId),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const gatesOn = GATE_KEYS.filter((key) => campaign.gates?.[key] === true).length

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4">
      <PageHeader
        title="Campaign"
        subtitle={open ? campaign.name : `${campaign.name} · Closed`}
        backHref={backHref}
        backLabel={BACK_TO[backHref] ?? 'Play'}
      />

      <SettingsGroup title="Campaign">
        <SettingsSheetRow label="Name" value={campaign.name} description="Rename this campaign.">
          <CampaignNameCard campaignId={campaign.id} name={campaign.name} />
        </SettingsSheetRow>

        <SettingsSheetRow
          label="Session zero"
          hint="The one page your players read."
          value={campaign.sessionZero ? 'Written' : 'Empty'}
          description="Write the one page the table agreed on."
        >
          <SessionZeroCard campaignId={campaign.id} body={campaign.sessionZero} />
        </SettingsSheetRow>

        <SettingsSheetRow
          label="Milestone"
          hint="The level you have called."
          value={campaign.milestoneLevel === null ? 'Not set' : `Level ${campaign.milestoneLevel}`}
          description="Say when the party levels up."
        >
          <CampaignMilestoneCard
            campaignId={campaign.id}
            milestoneLevel={campaign.milestoneLevel}
            initialCharacters={roster.characters}
          />
        </SettingsSheetRow>

        <SettingsSheetRow
          label="Player features"
          hint="How much of the sheet they get."
          value={`${gatesOn} of ${GATE_KEYS.length} on`}
          description="Switch parts of the character sheet on as the table is ready for them."
        >
          <CampaignGatesForm campaignId={campaign.id} gates={campaign.gates} />
        </SettingsSheetRow>
      </SettingsGroup>

      <SettingsGroup title="Players">
        {seats.length === 0 ? (
          <SettingsValueRow
            label="Nobody has joined yet"
            hint="Send the join link below, or invite someone who has no account."
          />
        ) : (
          seats.map((seat) =>
            seat.characters.length === 0 ? (
              <SettingsValueRow key={seat.userId} label={seat.name} hint="No character yet" />
            ) : (
              // One row per character rather than per seat once someone plays
              // two: the row leads somewhere, and "which of them" is not a
              // question a chevron can ask.
              seat.characters.map((character) => (
                <SettingsLinkRow
                  key={character.id}
                  href={`/dm/campaigns/${campaign.id}/party/${character.id}`}
                  label={seat.name}
                  hint={`${character.name} · Level ${character.level} ${formatReferenceIndex(character.classIndex)}`}
                />
              ))
            ),
          )
        )}

        {/* The row `one-link-invite` makes real — one link that both creates
            the account and seats the person. Until then it goes to the page
            that can already do the first half. */}
        <SettingsLinkRow
          href="/dm/users"
          label="Invite someone"
          hint="For a friend who has no account yet."
        />

        {open ? (
          <SettingsSheetRow
            label="Join link"
            hint="For someone who already has an account."
            description="Copy the join link, or make a new one and kill the old."
          >
            <JoinCodeCard campaignId={campaign.id} joinCode={campaign.joinCode} />
          </SettingsSheetRow>
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="Accounts">
        <SettingsLinkRow
          href="/dm/users"
          label="Everyone with an account"
          hint="Roles, invites out, and accounts to remove."
        />
      </SettingsGroup>

      <SettingsGroup title="The end">
        {open ? (
          <SettingsSheetRow
            label="Close this campaign"
            hint="Publishes the recap and takes it off their sheets."
            tone="destructive"
            description="Publish the recap and close this campaign for good."
          >
            <CloseCampaignCard
              campaignId={campaign.id}
              draft={recapDraft}
              closedAt={campaign.closedAt}
            />
          </SettingsSheetRow>
        ) : (
          <SettingsValueRow
            label="Closed"
            hint="Your players have the recap; everything here is still yours to read."
            value={closedAt === null ? '' : formatDiscoveredOn(closedAt)}
          />
        )}
      </SettingsGroup>
    </main>
  )
}
