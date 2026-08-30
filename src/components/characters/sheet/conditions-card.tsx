'use client'

import { Info } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MAX_EXHAUSTION,
  setExhaustion,
  toggleCondition,
  type CombatState,
} from '@/lib/characters/combat'
import { CONDITIONS, isKnownCondition } from '@/lib/characters/rules'
import { formatReferenceIndex } from '@/lib/characters/display'
import { cn } from '@/lib/utils'

import { AdvancedDetail } from './advanced-detail'

/**
 * The chips the picker offers. Exhaustion is filtered out, not deleted from
 * `CONDITIONS` (DND-038): it has six levels and lives in its own column now —
 * the boolean chip could not say whether the character was winded or dying —
 * but the reference entry stays for the quick-reference prose (DND-037).
 */
const TOGGLEABLE_CONDITIONS = CONDITIONS.filter((condition) => condition.index !== 'exhaustion')

/**
 * What each exhaustion level adds, per `docs/rules/09-adventuring.md` —
 * cumulative, so a character at level 3 suffers rows 1 through 3.
 */
const EXHAUSTION_EFFECTS = [
  'Disadvantage on ability checks',
  'Speed halved',
  'Disadvantage on attack rolls and saving throws',
  'Hit point maximum halved',
  'Speed reduced to 0',
  'Dead',
] as const

/**
 * The fifteen SRD conditions as on/off chips (DND-009), with the picker folded
 * away until it is asked for (DND-023), and exhaustion as the one condition
 * tracked by level rather than as a boolean (DND-038).
 *
 * What a session *reads* is which conditions are on and what they actually do,
 * because the question at a table is never "am I frightened" — it is "so what
 * happens when I attack". So the active ones stay open, each row clearing in
 * one tap. What a session *writes* is the chip grid, and that is a
 * twice-a-session question: it opens on a tap.
 *
 * Anything stored that this app does not recognise is listed with the active
 * ones rather than in the picker, so a condition written by an older build can
 * still be switched off but does not pretend to be a condition you can add.
 *
 * Exhaustion is folded away behind one row until the character has a level of
 * it (beginner mode: the `AdvancedDetail` rule). Most tables go a whole
 * campaign without touching it, and a six-step counter beside the fifteen
 * conditions is the sort of thing that makes a first sheet look like a tax
 * return.
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

  const exhaustion = state.exhaustion
  const dead = exhaustion >= MAX_EXHAUSTION

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
              <li key={condition.index} className="flex items-stretch gap-1.5">
                {/* The row is the toggle: an active condition comes off in one
                    tap without opening the picker to find its chip. */}
                <Button
                  type="button"
                  variant="secondary"
                  aria-pressed
                  className="h-auto min-h-11 min-w-0 flex-1 justify-start px-3 py-2 text-left text-sm whitespace-normal"
                  onClick={() => apply((current) => toggleCondition(current, condition.index))}
                >
                  <span>
                    <span className="font-medium">{condition.label}</span>{' '}
                    <span className="text-muted-foreground">{condition.summary}</span>
                  </span>
                </Button>
                {/* Full rules text is one tap away (DND-037), on its own
                    target so the toggle tap stays the toggle. The anchor is
                    the condition index — the chapter's heading ids match. */}
                {isKnownCondition(condition.index) ? (
                  <Link
                    href={`/rules/conditions#${condition.index}`}
                    aria-label={`${condition.label} rules`}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring flex min-h-11 w-11 shrink-0 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Info className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">None.</p>
        )}

        {picking ? (
          <div className="flex flex-wrap gap-2">
            {TOGGLEABLE_CONDITIONS.map((condition) => {
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

        {/* Exhaustion, by level (DND-038). A stepper rather than a chip: the
            level is the information, and six of them is death. */}
        <AdvancedDetail
          label="Exhaustion"
          summary="Six levels of getting worse. Most tables never reach for it."
          relevant={exhaustion > 0}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Cumulative penalties by level. Six is death.
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Reduce exhaustion one level"
                disabled={exhaustion === 0}
                onClick={() => apply((current) => setExhaustion(current, current.exhaustion - 1))}
              >
                −
              </Button>
              <span
                className={cn(
                  'w-8 text-center text-lg font-semibold tabular-nums',
                  dead && 'text-destructive',
                )}
                aria-label={`Exhaustion level ${exhaustion}`}
              >
                {exhaustion}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Increase exhaustion one level"
                disabled={exhaustion >= MAX_EXHAUSTION}
                onClick={() => apply((current) => setExhaustion(current, current.exhaustion + 1))}
              >
                +
              </Button>
            </div>
          </div>

          {dead ? (
            <p className="text-destructive text-sm font-medium" role="status">
              Level 6 — your character is dead.
            </p>
          ) : exhaustion > 0 ? (
            <ul
              className="text-muted-foreground space-y-0.5 text-xs"
              aria-label="Exhaustion effects"
            >
              {EXHAUSTION_EFFECTS.slice(0, exhaustion).map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          ) : null}
        </AdvancedDetail>
      </CardContent>
    </Card>
  )
}
