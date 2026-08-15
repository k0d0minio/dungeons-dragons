import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JoinCodeCard } from '@/components/campaigns/join-code-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { formatReferenceIndex } from '@/lib/characters/display'
import { getCampaignRoster } from '@/lib/db/campaigns'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Campaign',
}

/**
 * One campaign, as its DM sees it (DND-046): the join link to hand out, and
 * the roster as it stands. DM-scoped in the query — anyone else's campaign id
 * 404s like it never existed. Character rows link to the real sheets, which
 * the DND-027 viewer predicate lets the DM open.
 */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser()
  const { id } = await params

  if (!isDatabaseConfigured()) notFound()

  const roster = await getCampaignRoster(user.id, id)
  if (!roster) notFound()

  const { campaign, members, characters } = roster
  const playerCount = members.filter((member) => member.role === 'player').length

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="space-y-1">
        <Link
          href="/dm"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← DM
        </Link>
        <h2 className="text-2xl font-bold">{campaign.name}</h2>
        <p className="text-muted-foreground text-sm">
          {playerCount} {playerCount === 1 ? 'player' : 'players'} · {characters.length}{' '}
          {characters.length === 1 ? 'character' : 'characters'}
        </p>
      </div>

      <JoinCodeCard campaignId={campaign.id} joinCode={campaign.joinCode} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The party</CardTitle>
          <CardDescription>
            Characters players have attached with the join link. Tap one to open its sheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {characters.length > 0 ? (
            <ul className="space-y-2">
              {characters.map((character) => (
                <li key={character.id}>
                  <Link
                    href={`/characters/${character.id}`}
                    className="hover:bg-accent flex min-h-11 items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{character.name}</span>
                      <span className="text-muted-foreground block truncate text-xs">
                        Level {character.level} {formatReferenceIndex(character.speciesIndex)}{' '}
                        {formatReferenceIndex(character.classIndex)}
                      </span>
                    </span>
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nobody has joined yet. Send the link above to your players.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
