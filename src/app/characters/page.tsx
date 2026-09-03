import Link from 'next/link'

import { PageHeader } from '@/components/navigation/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireSessionUser } from '@/lib/auth/server'
import { formatReferenceIndex } from '@/lib/characters/display'
import { listCharacters, type Character } from '@/lib/db/characters'
import { isDatabaseConfigured } from '@/lib/db/client'

// Reads the session, so it can't be prerendered.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Characters',
}

/** HP / AC / Speed, the three numbers you check first at a table. */
function StatRow({ character }: { character: Character }) {
  const stats = [
    { label: 'HP', value: `${character.currentHitPoints}/${character.maxHitPoints}` },
    { label: 'AC', value: character.armorClass },
    { label: 'Speed', value: `${character.speed} ft.` },
  ]

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">{stat.label}</dt>
          <dd className="font-medium">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CharacterCard({ character }: { character: Character }) {
  return (
    <Card className="hover:bg-accent/40 transition-colors">
      <CardHeader>
        <CardTitle className="text-lg">{character.name}</CardTitle>
        <CardDescription>
          Level {character.level} {formatReferenceIndex(character.speciesIndex)}{' '}
          {formatReferenceIndex(character.classIndex)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatRow character={character} />
        {character.knownSpellIndexes.length > 0 ? (
          <Badge variant="secondary">
            {character.knownSpellIndexes.length}{' '}
            {character.knownSpellIndexes.length === 1 ? 'spell' : 'spells'}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default async function CharactersPage() {
  const user = await requireSessionUser()

  // Reading the flag before querying keeps an unprovisioned deploy on an
  // explanation instead of a 500 — same call the API route makes.
  const databaseReady = isDatabaseConfigured()
  const characters = databaseReady ? await listCharacters(user.id) : []

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <PageHeader
        title="Your characters"
        subtitle={`Signed in as ${user.name || user.email}`}
        actions={
          databaseReady ? (
            <Button asChild className="h-11 shrink-0">
              <Link href="/characters/new">New</Link>
            </Button>
          ) : null
        }
      />

      {!databaseReady ? (
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Characters need <code>DATABASE_URL</code> to be set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/library" className="text-sm underline underline-offset-4">
              Back to the reference browser
            </Link>
          </CardContent>
        </Card>
      ) : characters.length === 0 ? (
        // Written for someone who has never played (`guided-creation/wizard-frame`).
        // What was here — "a build you have already rolled up… name, class,
        // race" — assumed a finished character on paper and used 2014 words for
        // it, which is precisely backwards for the person this app is for: a
        // friend of Jamie's who has been sent a link and has never opened a
        // rulebook. So the card says what happens next, not what you should
        // already have.
        <Card>
          <CardHeader>
            <CardTitle>Let&rsquo;s make your first character</CardTitle>
            <CardDescription>
              Eight quick questions — what kind of hero you want to play, and what they are good at.
              Every answer is suggested for you, so you can tap through it in a couple of minutes
              and change anything later. No rulebook needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild className="h-11">
              <Link href="/characters/new">Start</Link>
            </Button>
            {/* Offered beside "Start", not instead of it: somebody who has
                never played is readier to make a character than they think,
                and the six pages are for the one who would rather read first
                (`learn-to-play/learn-chapters`). */}
            <Button asChild variant="outline" className="h-11">
              <Link href="/learn">Never played? Read this first</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {characters.map((character) => (
            <li key={character.id}>
              {/* The whole card opens the sheet — at a table you are tapping
                  this one-handed, not aiming at a link. */}
              <Link href={`/characters/${character.id}`} className="block">
                <CharacterCard character={character} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* The nearest thing this app has to a welcome screen after sign-in: `/`
          sends a signed-in player here or straight to their sheet, and D34
          keeps `/learn` behind the wall, so this is where the teaching tier
          gets offered rather than on the signed-out door. */}
      <Link
        href="/learn"
        className="hover:bg-accent focus-visible:ring-ring block rounded-lg border border-dashed px-4 py-3 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="block font-medium">Learn to play</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          Six short pages that teach the game from nothing — what a turn is, what the d20 is asking,
          and what every number on your sheet means.
        </span>
      </Link>
    </main>
  )
}
