'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CombatState } from '@/lib/characters/combat'
import { hitDiceRemaining, longRest, shortRest, type RestFields } from '@/lib/characters/rests'
import { hitDie, spellcastingKind, spellPreparationModel } from '@/lib/characters/rules'
import type { Character } from '@/lib/db/schema'

import { AdvancedDetail } from './advanced-detail'

/** The die faces a blank roll counts as: the die's average, rounded down. */
function averageRoll(die: number | null): number {
  return die === null ? 1 : Math.floor((die + 1) / 2)
}

/**
 * Rests and recovery (DND-033): a long rest in two taps, a short rest that
 * spends hit dice as part of the flow rather than after it.
 *
 * Both rests are computed by `src/lib/characters/rests.ts` and land through
 * the same `apply()` pipeline as every other tap, so they persist and roll
 * back exactly like a hit point change. The long rest is confirmed rather
 * than undoable — it rewrites half the sheet, and "one tap too many" must not
 * wipe a session's state.
 *
 * The beginner surface is the two buttons: take a breather, or sleep. Hit dice
 * — how many are left, and what a short rest spends — are the advanced half,
 * folded away until some have been spent or a short rest is actually being
 * taken (beginner mode: the `AdvancedDetail` rule).
 */
export function RestsCard({
  character,
  state,
  apply,
}: {
  character: Character
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [shortOpen, setShortOpen] = useState(false)
  const [rolls, setRolls] = useState<string[]>([])

  const remaining = hitDiceRemaining({ level: character.level, hitDiceUsed: state.hitDiceUsed })
  const die = hitDie(character.classIndex)
  const pactCaster = spellcastingKind(character.classIndex) === 'pact'
  const preparedCaster = spellPreparationModel(character.classIndex) !== null

  /** The live-state slice of the rest input; the build columns come off the row. */
  function restFields(current: CombatState): RestFields {
    return {
      classIndex: character.classIndex,
      level: character.level,
      constitution: character.constitution,
      maxHitPoints: character.maxHitPoints,
      currentHitPoints: current.currentHitPoints,
      hitDiceUsed: current.hitDiceUsed,
      exhaustion: current.exhaustion,
      spellSlots: current.spellSlots,
      classResources: current.classResources,
    }
  }

  function takeLongRest() {
    apply((current) => ({ ...current, ...longRest(restFields(current)) }))

    if (preparedCaster) {
      toast.info('Long rest taken — a new day. Review your prepared spells.', {
        id: `long-rest-${character.id}`,
        duration: 8000,
      })
    }
  }

  function takeShortRest() {
    const spent = rolls.map((typed) => {
      const parsed = Number.parseInt(typed, 10)
      return { rolled: Number.isFinite(parsed) && parsed >= 1 ? parsed : averageRoll(die) }
    })

    apply((current) => ({ ...current, ...shortRest(restFields(current), spent) }))
    setShortOpen(false)
    setRolls([])
  }

  function setDiceCount(count: number) {
    const bounded = Math.max(0, Math.min(remaining, count))
    setRolls((current) => Array.from({ length: bounded }, (_, position) => current[position] ?? ''))
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Rests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {shortOpen ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="short-rest-dice" className="text-sm">
                Hit dice to spend
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label="Spend one fewer hit die"
                  disabled={rolls.length === 0}
                  onClick={() => setDiceCount(rolls.length - 1)}
                >
                  −
                </Button>
                <span
                  id="short-rest-dice"
                  className="w-8 text-center text-lg font-semibold tabular-nums"
                >
                  {rolls.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label="Spend one more hit die"
                  disabled={rolls.length >= remaining}
                  onClick={() => setDiceCount(rolls.length + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {rolls.map((typed, position) => (
              <div key={position} className="flex items-center gap-2">
                <Label
                  htmlFor={`short-rest-roll-${position + 1}`}
                  className="w-14 shrink-0 text-xs"
                >
                  Roll {position + 1}
                </Label>
                <Input
                  id={`short-rest-roll-${position + 1}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={die ?? 20}
                  className="h-11 tabular-nums"
                  placeholder={String(averageRoll(die))}
                  value={typed}
                  onChange={(event) =>
                    setRolls((current) =>
                      current.map((value, index) =>
                        index === position ? event.target.value : value,
                      ),
                    )
                  }
                />
              </div>
            ))}

            {rolls.length > 0 ? (
              <p className="text-muted-foreground text-xs">
                Each die heals what it rolled plus your Constitution modifier. A blank roll counts
                as the average ({averageRoll(die)}).
              </p>
            ) : null}

            {pactCaster ? (
              <p className="text-muted-foreground text-xs">
                Warlock pact slots return on a short rest.
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" className="h-11 flex-1" onClick={takeShortRest}>
                Take the short rest
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => {
                  setShortOpen(false)
                  setRolls([])
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              onClick={() => {
                setShortOpen(true)
                setRolls(remaining > 0 ? [''] : [])
              }}
            >
              Short rest
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" className="h-11 flex-1">
                  Long rest
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Take a long rest?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Restores HP and spell slots, returns half your hit dice, removes one level of
                    exhaustion.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11">Not yet</AlertDialogCancel>
                  <AlertDialogAction className="h-11" onClick={takeLongRest}>
                    Rest
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <AdvancedDetail
          label="Hit dice"
          summary="What a short rest spends to heal. Yours are all unspent."
          relevant={state.hitDiceUsed > 0 || shortOpen}
        >
          <p className="text-sm">
            <span className="font-semibold tabular-nums">
              {remaining} of {character.level}
            </span>{' '}
            <span className="text-muted-foreground">left</span>
            {die !== null ? <span className="text-muted-foreground"> (d{die})</span> : null}
          </p>
          <p className="text-muted-foreground text-xs">
            You get half of them back on a <GlossaryTerm index="long-rest">long rest</GlossaryTerm>.
          </p>
        </AdvancedDetail>
      </CardContent>
    </Card>
  )
}
