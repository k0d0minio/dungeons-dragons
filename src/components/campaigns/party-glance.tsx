'use client'

import Link from 'next/link'
import useSWR from 'swr'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { derivedArmorClass, type ArmorDetails } from '@/lib/characters/attacks'
import { formatReferenceIndex } from '@/lib/characters/display'
import { CONDITIONS, passivePerception } from '@/lib/characters/rules'
import type { Character } from '@/lib/db/schema'
import { fetcher } from '@/lib/srd/hooks'

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
 * on the sheet. Each row opens the DM's page for that character
 * (`first-table/dm-character-profile`): who plays it, whether it is ready for
 * the night, and the sheet one tap further. Passive Perception is the real
 * number: `rules.passivePerception` folds in the character's stored skill
 * proficiencies and expertise (DND-015 landed), so no caveat is needed.
 *
 * AC is the number the sheet prints (`first-table/glance-derived-ac`): the
 * roster carries each character's worn armour, and `derivedArmorClass` — the
 * sheet's own function, never a second formula — turns it into the AC a
 * goblin has to beat. On production the glance used to print the stored
 * column, which is the *unarmoured* number: 10 for a paladin whose sheet said
 * 18. Nothing is stored; a shield equipped from the sheet shows here within a
 * poll.
 */
export function PartyGlance({
  campaignId,
  initialCharacters,
  initialArmor = {},
}: {
  campaignId: string
  initialCharacters: Character[]
  /** Worn armour by character id, off the same roster read. */
  initialArmor?: Record<string, ArmorDetails[]>
}) {
  const { data } = useSWR<{ characters: Character[]; armor?: Record<string, ArmorDetails[]> }>(
    `/api/campaigns/${campaignId}`,
    fetcher,
    {
      refreshInterval: REFRESH_INTERVAL_MS,
      fallbackData: { characters: initialCharacters, armor: initialArmor },
    },
  )

  const characters = data?.characters ?? initialCharacters
  const armor = data?.armor ?? initialArmor

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Party at a glance</CardTitle>
        <CardDescription>
          Live HP, AC, passive Perception, concentration and conditions. Tap a row for who plays
          them, whether they are ready, and their sheet.
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
              const armorClass = derivedArmorClass(character, armor[character.id] ?? []).value

              return (
                <li key={character.id}>
                  <Link
                    href={`/dm/campaigns/${campaignId}/party/${character.id}`}
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
                              down ? 'text-destructive' : bloodied ? 'text-hp-bloodied' : ''
                            }`}
                          >
                            {character.currentHitPoints}/{character.maxHitPoints}
                          </span>
                          {character.temporaryHitPoints > 0 ? (
                            <span className="ml-1 text-xs font-semibold text-hp-temp">
                              +{character.temporaryHitPoints}
                            </span>
                          ) : null}
                        </span>
                        <span>
                          <span className="text-muted-foreground block text-[10px] uppercase">
                            AC
                          </span>
                          <span className="text-sm font-semibold">{armorClass}</span>
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
                    {character.concentration ||
                    character.conditions.length > 0 ||
                    character.exhaustion > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {/* Concentration leads the row (DND-049): it is the one
                            piece of party state the DM acts on — "you took 9,
                            that's a DC 10 Con save" — rather than merely reads. */}
                        {character.concentration ? (
                          <Badge className="text-xs">
                            Concentrating: {character.concentration.name}
                          </Badge>
                        ) : null}
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
