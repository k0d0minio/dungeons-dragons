import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CampaignMilestoneCard } from '@/components/campaigns/campaign-milestone-card'
import { CampaignNotesCard } from '@/components/campaigns/campaign-notes-card'
import { CloseCampaignCard } from '@/components/campaigns/close-campaign-card'
import { JoinCodeCard } from '@/components/campaigns/join-code-card'
import { PartyGlance } from '@/components/campaigns/party-glance'
import { SessionZeroCard } from '@/components/campaigns/session-zero-card'
import { EncountersCard } from '@/components/encounters/encounters-card'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { composeRecapDraft } from '@/lib/campaigns/session-log'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'
import { listEncounters } from '@/lib/db/encounters'
import { listCampaignNotes } from '@/lib/db/notes'
import { getSessionLog } from '@/lib/db/session-log'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Campaign',
}

/** The DM's prep tools, in the order a session is built (`dm-prep-suite`). */
const PREP_TOOLS = [
  {
    slug: 'npcs',
    label: 'NPCs',
    blurb: 'Everyone the party might meet, with a half they never see.',
  },
  {
    slug: 'locations',
    label: 'Places',
    blurb: 'Everywhere they might go, and what is really going on there.',
  },
  {
    slug: 'handouts',
    label: 'Handouts',
    blurb: 'Letters, maps and symbols, staged before the session.',
  },
  {
    slug: 'session-plans',
    label: 'Session plans',
    blurb: 'One night at a time: a strong start, scenes, secrets, treasure.',
  },
]

/**
 * One campaign, as its DM sees it (DND-046, DND-030, DND-031): the join link
 * to hand out, the party at a glance — live HP, AC, passive Perception and
 * conditions, polling every ~15 s (D25) — and the campaign's encounters. DM-
 * scoped in the query; anyone else's campaign id 404s like it never existed.
 * Glance rows link to the real sheets, which the DND-027 viewer predicate
 * lets the DM open.
 */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  // The log rides with the notes for the close-campaign card
  // (`first-table/one-night-campaign`): closing publishes the recap the
  // session log drafts, so the draft is composed here exactly as the log page
  // composes it, and the card opens with it in the box.
  const [encounters, notes, log] = await Promise.all([
    listEncounters(user.id, id),
    listCampaignNotes(user.id, id),
    getSessionLog(user.id, id),
  ])

  const { campaign, members, characters } = roster
  const playerCount = members.filter((member) => member.role === 'player').length

  const recapDraft = log
    ? composeRecapDraft({ entries: log.entries, capturedNotes: log.note?.body ?? null })
    : ''

  const headcount = `${playerCount} ${playerCount === 1 ? 'player' : 'players'} · ${characters.length} ${characters.length === 1 ? 'character' : 'characters'}`

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title={campaign.name}
        subtitle={campaign.closedAt !== null ? `${headcount} · Closed` : headcount}
        backHref="/dm"
        backLabel="DM"
      />

      <PartyGlance
        campaignId={campaign.id}
        initialCharacters={characters}
        initialArmor={roster.armor}
      />

      {/* Directly under the glance, because it is read against it: the DM
          decides the party has levelled while looking at the party, and the
          card's own line — who has taken it — is the same roster one card up
          (D35, `dm-run-suite/milestone-leveling`). It is one write to the
          campaign; no character is touched by it. */}
      <CampaignMilestoneCard
        campaignId={campaign.id}
        milestoneLevel={campaign.milestoneLevel}
        initialCharacters={characters}
      />

      <EncountersCard campaignId={campaign.id} encounters={encounters} />

      {/* The one page the table agreed on (`first-table/session-zero-one-pager`)
          — the only thing the DM writes that the players read directly, so it
          sits above the prep rather than inside it: prep is yours until
          revealed, and this never was. */}
      <SessionZeroCard campaignId={campaign.id} body={campaign.sessionZero} />

      {/* Prep is a different visit from running the table, so it gets a link
          rather than a card of its own here — the roster is long, and this page
          is what gets opened mid-session. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prep</CardTitle>
          <CardDescription>
            What you write before the session. Yours until you reveal it.
          </CardDescription>
        </CardHeader>
        {/* One row per prep tool, from a list rather than three copies of the
            same markup — `dm-prep-suite` has five stubs and this card is where
            each one arrives. */}
        <CardContent className="space-y-2">
          {PREP_TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/dm/campaigns/${campaign.id}/${tool.slug}`}
              className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{tool.label}</span>
                <span className="text-muted-foreground block text-xs">{tool.blurb}</span>
              </span>
              <span aria-hidden className="text-muted-foreground">
                →
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* The log is a link rather than a card for the prep card's reason: it
          is a screenful of what already happened, read twice an evening, on a
          page that gets opened mid-session to see the party or start a fight
          (`dm-run-suite/session-log-recap`). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session log</CardTitle>
          <CardDescription>
            What the app recorded tonight — fights you ended, what you revealed, secrets ticked off
            — and where you close the session and publish the recap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/dm/campaigns/${campaign.id}/session-log`}
            className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">Tonight so far</span>
              <span className="text-muted-foreground block text-xs">
                Close the session to publish &ldquo;previously on…&rdquo; to your players.
              </span>
            </span>
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          </Link>
        </CardContent>
      </Card>

      {/* How much of the sheet this table's players get
          (`dm-prep-suite/campaign-feature-gates`). Last of the three link
          cards, and deliberately below the log: this is a between-sessions
          decision, and the page a DM opens mid-fight should not lead with a
          control that changes what six phones are showing. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Player features</CardTitle>
          <CardDescription>
            How much of the character sheet your players see. Everything starts off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/dm/campaigns/${campaign.id}/settings`}
            className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">Switch parts of the sheet on</span>
              <span className="text-muted-foreground block text-xs">
                Spell preparation, conditions, coins, class resources, XP — as the group is ready.
              </span>
            </span>
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          </Link>
        </CardContent>
      </Card>

      {/* Notes sit below the party and the fights: at a table you open this
          page to see the party or start an encounter, and you write the note
          up afterwards. Mid-session capture does not come through here at all
          — it is the quick-note field on the tracker (DND-058). */}
      <CampaignNotesCard campaignId={campaign.id} notes={notes ?? []} />

      {/* A closed campaign answers no join code (`getCampaignByJoinCode`
          reads open campaigns alone), so the card that copies one goes with
          it rather than handing the DM a working-looking dead link. */}
      {campaign.closedAt === null ? (
        <JoinCodeCard campaignId={campaign.id} joinCode={campaign.joinCode} />
      ) : null}

      {/* Last, below the join link it kills (`first-table/one-night-campaign`):
          the end of the campaign is the one control on this page pressed once,
          and it should be the last thing a thumb reaches, not the first. */}
      <CloseCampaignCard campaignId={campaign.id} draft={recapDraft} closedAt={campaign.closedAt} />
    </main>
  )
}
