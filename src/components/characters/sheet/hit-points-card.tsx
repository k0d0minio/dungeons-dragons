'use client'

import { useState } from 'react'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  applyDamage,
  applyHealing,
  setTemporaryHitPoints,
  type CombatState,
} from '@/lib/characters/combat'

import { AdvancedDetail } from './advanced-detail'

/** The one-tap amounts. Anything else goes through the number field. */
const QUICK_AMOUNTS = [5, 1] as const

/**
 * Hit points, the number this app exists to keep (DND-009).
 *
 * Laid out so nothing above a control ever changes size when you use it: the
 * totals sit in a fixed-height row with tabular figures and the bar is a
 * percentage width. Tapping "−5" in a dim room must not move the button you
 * are about to tap again.
 *
 * Damage and healing are the whole card for a player who has never held a
 * sheet before. DND-038's typed temporary hit points — set outright, stepped
 * by one — are the advanced half, folded away behind one row until the
 * character actually has some, and then simply open (beginner mode: the
 * `AdvancedDetail` rule).
 */
export function HitPointsCard({
  state,
  maxHitPoints,
  apply,
}: {
  state: CombatState
  maxHitPoints: number
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [amount, setAmount] = useState('')

  const parsed = Number.parseInt(amount, 10)
  const custom = Number.isFinite(parsed) && parsed > 0 ? parsed : null

  const total = state.currentHitPoints + state.temporaryHitPoints
  const filled = maxHitPoints > 0 ? Math.min(100, (total / maxHitPoints) * 100) : 0
  const bloodied = state.currentHitPoints > 0 && state.currentHitPoints * 2 <= maxHitPoints
  const down = state.currentHitPoints === 0

  function spend(transition: (state: CombatState) => CombatState) {
    apply(transition)
    setAmount('')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <GlossaryTerm index="hit-points">Hit points</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p
            className="flex items-baseline gap-1.5 text-4xl font-bold tabular-nums"
            aria-live="polite"
          >
            <span
              className={down ? 'text-destructive' : bloodied ? 'text-hp-bloodied' : undefined}
              // The screen reader gets the whole sentence; the eye gets the number.
              aria-label={`${state.currentHitPoints} of ${maxHitPoints} hit points`}
            >
              {state.currentHitPoints}
            </span>
            <span className="text-muted-foreground text-xl font-medium">/ {maxHitPoints}</span>
            {state.temporaryHitPoints > 0 ? (
              <span className="ml-auto text-xl font-semibold text-hp-temp">
                +{state.temporaryHitPoints}
              </span>
            ) : null}
          </p>

          <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-[width] ${
                down ? 'bg-destructive' : bloodied ? 'bg-hp-bloodied' : 'bg-hp-healthy'
              }`}
              style={{ width: `${filled}%` }}
            />
          </div>
        </div>

        {/* Damage on the left, healing on the right — the same order every
            time, so the tap becomes muscle memory rather than a decision. */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((quick) => (
            <Button
              key={`damage-${quick}`}
              type="button"
              variant="outline"
              className="h-12 text-base tabular-nums"
              aria-label={`Take ${quick} damage`}
              onClick={() => spend((current) => applyDamage(current, maxHitPoints, quick))}
            >
              −{quick}
            </Button>
          ))}
          {[...QUICK_AMOUNTS].reverse().map((quick) => (
            <Button
              key={`heal-${quick}`}
              type="button"
              variant="outline"
              className="h-12 text-base tabular-nums"
              aria-label={`Heal ${quick}`}
              onClick={() => spend((current) => applyHealing(current, maxHitPoints, quick))}
            >
              +{quick}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hp-amount" className="text-xs">
            Amount
          </Label>
          <Input
            id="hp-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            className="h-11 w-24 tabular-nums"
            placeholder="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          {/* Two ways to spend the one typed number. The third — DND-038's
              typed temp HP, where False Life's 1d4+4 lands in one entry rather
              than eight taps — is down in the advanced section, because a
              player who does not yet know what temporary hit points are should
              not be choosing between three buttons here. */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              disabled={custom === null}
              onClick={() =>
                custom && spend((current) => applyDamage(current, maxHitPoints, custom))
              }
            >
              Damage
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              disabled={custom === null}
              onClick={() =>
                custom && spend((current) => applyHealing(current, maxHitPoints, custom))
              }
            >
              Heal
            </Button>
          </div>
        </div>

        <AdvancedDetail
          label="Temporary HP"
          summary="A cushion some spells and features give you."
          relevant={state.temporaryHitPoints > 0}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Spent before real hit points. Setting replaces what is there — they never stack.
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Remove a temporary hit point"
                disabled={state.temporaryHitPoints === 0}
                onClick={() =>
                  apply((current) => setTemporaryHitPoints(current, current.temporaryHitPoints - 1))
                }
              >
                −
              </Button>
              <span className="w-8 text-center text-lg font-semibold tabular-nums">
                {state.temporaryHitPoints}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Add a temporary hit point"
                onClick={() =>
                  apply((current) => setTemporaryHitPoints(current, current.temporaryHitPoints + 1))
                }
              >
                +
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full"
            disabled={custom === null}
            onClick={() => custom && spend((current) => setTemporaryHitPoints(current, custom))}
          >
            Set temp HP
          </Button>
          <p className="text-muted-foreground text-xs">Uses the amount typed above.</p>
        </AdvancedDetail>
      </CardContent>
    </Card>
  )
}
