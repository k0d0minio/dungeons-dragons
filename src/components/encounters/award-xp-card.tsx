'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatReferenceIndex } from '@/lib/characters/display'
import { formatExperience } from '@/lib/characters/experience'
import type { CombatantWithCharacter } from '@/lib/db/encounters'
import { useMonsterDetails } from '@/lib/dnd-api/swr-hooks'
import { encounterExperience } from '@/lib/encounters/experience'

/**
 * Award the fight's XP to the party (DND-055).
 *
 * The end of a fight is the moment every input is already on screen: the
 * tracker knows which monsters were in it and which characters were there to
 * kill them, and the monsters' XP is in the reference data. What the DM
 * otherwise does is division on a phone calculator while five people wait.
 *
 * The split is an *offer*, not a decision. It is pre-filled with total ÷ party
 * and stays editable, because the table's ruling wins over the table in the
 * book — a monster that fled, a character who arrived late, the flat 500 for
 * talking the giant down. Whatever the field says is what each character gets.
 *
 * Writing goes through the character API's version guard by way of `onAward`,
 * the same path the tracker's HP taps take (DND-028): if a player's own phone
 * wrote first, that award 409s and says so rather than trampling it.
 */
export function AwardXpCard({
  rows,
  awarding,
  onAward,
}: {
  rows: readonly CombatantWithCharacter[]
  /** True while awards are in flight — the button says so and cannot re-fire. */
  awarding: boolean
  onAward: (perCharacter: number) => void
}) {
  const [edited, setEdited] = useState<string | null>(null)

  const monsterIndexes = rows
    .map((row) => row.combatant.monsterIndex)
    .filter((index): index is string => index !== null)

  const { details, isLoading } = useMonsterDetails(monsterIndexes)

  const monsterXp: Record<string, number | undefined> = {}
  for (const [index, monster] of Object.entries(details)) monsterXp[index] = monster.xp

  const award = encounterExperience(
    rows.map((row) => ({
      monsterIndex: row.combatant.monsterIndex,
      characterId: row.combatant.characterId,
    })),
    monsterXp,
  )

  // The typed value wins until it is cleared; until then the suggestion tracks
  // the fight, so removing a defeated monster's row updates the offer.
  const value = edited ?? String(award.perCharacter)
  const parsed = Number.parseInt(value.trim(), 10)
  const perCharacter = Number.isFinite(parsed) ? Math.max(0, parsed) : 0

  const summary = isLoading
    ? 'Reading what these monsters are worth…'
    : award.shares === 0
      ? 'Nobody from the party is in this fight yet.'
      : `${formatExperience(award.total)} XP in the fight, split ${award.shares} ${
          award.shares === 1 ? 'way' : 'ways'
        }.`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Award XP</CardTitle>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {award.unknownIndexes.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            No XP could be read for {award.unknownIndexes.map(formatReferenceIndex).join(', ')} —
            they are not in the total. Type over it if they should be.
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <div className="grow space-y-1">
            <Label htmlFor="award-xp-each" className="text-xs">
              XP each
            </Label>
            <Input
              id="award-xp-each"
              type="number"
              inputMode="numeric"
              className="h-11"
              value={value}
              onChange={(event) => setEdited(event.target.value)}
            />
          </div>

          <Button
            type="button"
            className="h-11 shrink-0"
            disabled={awarding || award.shares === 0 || perCharacter === 0}
            onClick={() => {
              onAward(perCharacter)
              // Back to tracking the fight: the next award is a new question,
              // and leaving the last one typed in invites awarding it twice.
              setEdited(null)
            }}
          >
            {awarding ? 'Awarding…' : 'Award to party'}
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Goes to the {award.shares} {award.shares === 1 ? 'character' : 'characters'} in this
          fight. Crossing a level shows up on their sheet — nobody is levelled up for them.
        </p>
      </CardContent>
    </Card>
  )
}
