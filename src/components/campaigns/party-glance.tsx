'use client'

import Link from 'next/link'
import useSWR from 'swr'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatReferenceIndex } from '@/lib/characters/display'
import { CONDITIONS, passivePerception } from '@/lib/characters/rules'
import { fetcher } from '@/lib/dnd-api/swr-hooks'
import type { Character } from '@/lib/db/schema'

/** How often the glance re-reads the party (D25) — same beat as the sheet. */
const REFRESH_INTERVAL_MS = 15_000

const CONDITION_LABELS = new Map(CONDITIONS.map((condition) => [condition.index, condition.label]))

function conditionLabel(index: string): string {
  return CONDITION_LABELS.get(index) ?? formatReferenceIndex(index)
}

/**
 * Every character in the campaign, vitals on one screen (DND-030): HP, AC,
 * passive Perception and live conditions, refreshed every ~15 seconds so a
 * player's own tap reaches the DM's screen without anyone refreshing (D25).
 *
 * Read-only by design — the DM's ability to *edit* is DND-027/028, exercised
 * on the sheet each row links to. Passive Perception is the real number:
 * `rules.passivePerception` folds in the character's stored skill
 * proficiencies and expertise (DND-015 landed), so no caveat is needed.
 */
export function PartyGlance({
  campaignId,
  initialCharacters,
}: {
  campaignId: string
  initialCharacters: Character[]
}) {
  const { data } = useSWR<{ characters: Character[] }>(`/api/campaigns/${campaignId}`, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    fallbackData: { characters: initialCharacters },
  })

  const characters = data?.characters ?? initialCharacters

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Party at a glance</CardTitle>
        <CardDescription>
          Live HP, AC, passive Perception and conditions. Tap a row to open the sheet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {characters.length > 0 ? (
          <ul className="space-y-2">
            {characters.map((character) => {
              const down = character.currentHitPoints === 0
              const bloodied =
                character.currentHitPoints > 0 &&
                character.currentHitPoints * 2 <= character.maxHitPoints

              return (
                <li key={character.id}>
                  <Link
                    href={`/characters/${character.id}`}
                    className="hover:bg-accent flex min-h-11 flex-col gap-2 rounded-md border p-3"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{character.name}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          Level {character.level} {formatReferenceIndex(character.classIndex)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-right tabular-nums">
                        <span>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            HP
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              down ? 'text-destructive' : bloodied ? 'text-amber-600' : ''
                            }`}
                          >
                            {character.currentHitPoints}/{character.maxHitPoints}
                          </span>
                          {character.temporaryHitPoints > 0 ? (
                            <span className="ml-1 text-xs font-semibold text-sky-600">
                              +{character.temporaryHitPoints}
                            </span>
                          ) : null}
                        </span>
                        <span>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            AC
                          </span>
                          <span className="text-sm font-semibold">{character.armorClass}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            PP
                          </span>
                          <span className="text-sm font-semibold">
                            {passivePerception(character, character.classIndex, character)}
                          </span>
                        </span>
                      </span>
                    </span>
                    {character.conditions.length > 0 || character.exhaustion > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {character.conditions.map((condition) => (
                          <Badge key={condition} variant="secondary" className="text-xs">
                            {conditionLabel(condition)}
                          </Badge>
                        ))}
                        {character.exhaustion > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            Exhaustion {character.exhaustion}
                          </Badge>
                        ) : null}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nobody has joined yet. Send the join link to your players.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
