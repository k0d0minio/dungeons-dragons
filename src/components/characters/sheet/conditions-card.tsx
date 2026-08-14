'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toggleCondition, type CombatState } from '@/lib/characters/combat'
import { CONDITIONS } from '@/lib/characters/rules'
import { formatReferenceIndex } from '@/lib/characters/display'

/**
 * The fifteen SRD conditions as on/off chips (DND-009).
 *
 * Active ones are repeated above the grid with what they actually do, because
 * the question at a table is never "am I frightened" — it is "so what happens
 * when I attack". Anything stored that this app does not recognise still gets a
 * chip, so a condition written by an older build can at least be switched off.
 */
export function ConditionsCard({
  state,
  apply,
}: {
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const active = new Set(state.conditions)
  const known = new Set(CONDITIONS.map((condition) => condition.index))
  const unrecognised = state.conditions.filter((index) => !known.has(index))

  const explained = CONDITIONS.filter((condition) => active.has(condition.index))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Conditions
          {active.size > 0 ? (
            <span className="text-muted-foreground ml-2 text-sm font-normal">{active.size}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {explained.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Active conditions">
            {explained.map((condition) => (
              <li key={condition.index} className="text-sm">
                <span className="font-medium">{condition.label}</span>{' '}
                <span className="text-muted-foreground">{condition.summary}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None.</p>
        )}

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

          {unrecognised.map((index) => (
            <Button
              key={index}
              type="button"
              variant="secondary"
              className="h-11 px-3 text-sm"
              aria-pressed
              onClick={() => apply((current) => toggleCondition(current, index))}
            >
              {formatReferenceIndex(index)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
