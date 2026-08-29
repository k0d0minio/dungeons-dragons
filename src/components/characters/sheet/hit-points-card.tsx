'use client'

import { useState } from 'react'

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

/** The one-tap amounts. Anything else goes through the number field. */
const QUICK_AMOUNTS = [5, 1] as const

/**
 * Hit points, the number this app exists to keep (DND-009).
 *
 * Laid out so nothing above a control ever changes size when you use it: the
 * totals sit in a fixed-height row with tabular figures, the bar is a
 * percentage width, and the temporary hit point row is always present rather
 * than appearing when it becomes non-zero. Tapping "−5" in a dim room must not
 * move the button you are about to tap again.
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
        <CardTitle className="text-base">Hit points</CardTitle>
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
          {/* Three ways to spend the one typed number — the third is DND-038's
              typed temp HP: False Life's 1d4+4 lands in one entry, not eight
              taps, and setting outright is the 5e no-stacking rule. */}
          <div className="grid grid-cols-3 gap-2">
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
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              disabled={custom === null}
              onClick={() => custom && spend((current) => setTemporaryHitPoints(current, custom))}
            >
              Set temp HP
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <div>
            <p className="text-sm font-medium">Temporary HP</p>
            <p className="text-muted-foreground text-xs">Spent before real hit points.</p>
          </div>
          <div className="flex items-center gap-1">
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
      </CardContent>
    </Card>
  )
}
