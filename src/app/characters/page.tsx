import Link from 'next/link'

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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Your characters</h2>
          <p className="text-muted-foreground text-sm">Signed in as {user.name || user.email}</p>
        </div>
        {databaseReady ? (
          <Button asChild className="h-11 shrink-0">
            <Link href="/characters/new">New</Link>
          </Button>
        ) : null}
      </div>

      {!databaseReady ? (
        <Card>
          <CardHeader>
            <CardTitle>Not connected to a database yet</CardTitle>
            <CardDescription>
              Characters need <code>DATABASE_URL</code>. The runbook is{' '}
              <code>.icm/docs/neon-database-setup.md</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/" className="text-sm underline underline-offset-4">
              Back to the reference browser
            </Link>
          </CardContent>
        </Card>
      ) : characters.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No characters yet</CardTitle>
            <CardDescription>
              Make one from a build you have already rolled up — name, class, species, scores and
              spells, on one page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-11">
              <Link href="/characters/new">Create a character</Link>
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
    </main>
  )
}
