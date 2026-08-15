'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleCondition, type CombatState } from '@/lib/characters/combat'
import { CONDITIONS } from '@/lib/characters/rules'
import { formatReferenceIndex } from '@/lib/characters/display'

/**
 * The fifteen SRD conditions as on/off chips (DND-009), with the picker folded
 * away until it is asked for (DND-023).
 *
 * What a session *reads* is which conditions are on and what they actually do,
 * because the question at a table is never "am I frightened" — it is "so what
 * happens when I attack". So the active ones stay open, each row clearing in
 * one tap. What a session *writes* is the fifteen-chip grid, and that is a
 * twice-a-session question: expanded it is ~400px of card sitting between hit
 * points and spell slots, which are used in the same turn. It opens on a tap.
 *
 * Anything stored that this app does not recognise is listed with the active
 * ones rather than in the picker, so a condition written by an older build can
 * still be switched off but does not pretend to be a condition you can add.
 */
export function ConditionsCard({
  state,
  apply,
}: {
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [picking, setPicking] = useState(false)

  const active = new Set(state.conditions)
  const known = new Set(CONDITIONS.map((condition) => condition.index))

  const activeRows = [
    ...CONDITIONS.filter((condition) => active.has(condition.index)),
    ...state.conditions
      .filter((index) => !known.has(index))
      .map((index) => ({
        index,
        label: formatReferenceIndex(index),
        summary: 'Not a condition this app knows about. Tap to clear it.',
      })),
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          Conditions
          {active.size > 0 ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">{active.size}</span>
          ) : null}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          {picking ? 'Done' : 'Change'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeRows.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Active conditions">
            {activeRows.map((condition) => (
              <li key={condition.index}>
                {/* The row is the toggle: an active condition comes off in one
                    tap without opening the picker to find its chip. */}
                <Button
                  type="button"
                  variant="secondary"
                  aria-pressed
                  className="h-auto min-h-11 w-full justify-start px-3 py-2 text-left text-sm whitespace-normal"
                  onClick={() => apply((current) => toggleCondition(current, condition.index))}
                >
                  <span>
                    <span className="font-medium">{condition.label}</span>{' '}
                    <span className="text-muted-foreground">{condition.summary}</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None.</p>
        )}

        {picking ? (
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((condition) => {
              const on = active.has(condition.index)

              return (
                <Button
                  key={condition.index}
                  type="button"
                  variant={on ? 'default' : 'outline'}
                  className="h-11 px-3 text-sm"
                  aria-pressed={on}
                  onClick={() => apply((current) => toggleCondition(current, condition.index))}
                >
                  {condition.label}
                </Button>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
