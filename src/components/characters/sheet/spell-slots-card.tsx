'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MAX_SLOTS_PER_LEVEL,
  regainSlot,
  setSlotMax,
  setSpellSlots,
  slotLevelsOf,
  spendSlot,
  SPELL_LEVELS,
  type CombatState,
} from '@/lib/characters/combat'
import { formatReferenceIndex } from '@/lib/characters/display'
import { standardSpellSlots } from '@/lib/characters/rules'
import { cn } from '@/lib/utils'

/**
 * One level's slots as a row of pips: filled is available, hollow is spent.
 *
 * Tapping an available pip spends it and tapping a spent one gives it back, so
 * both directions are one tap and neither needs a mode.
 */
function SlotRow({
  level,
  max,
  used,
  apply,
}: {
  level: number
  max: number
  used: number
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const available = max - used

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-14 shrink-0 text-xs font-medium tracking-wide uppercase">
        Lvl {level}
      </span>

      <div className="flex flex-wrap items-center gap-0.5">
        {Array.from({ length: max }, (_, offset) => {
          const spent = offset >= available

          return (
            <Button
              key={offset}
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={spent ? `Regain a level ${level} slot` : `Spend a level ${level} slot`}
              onClick={() =>
                apply((current) => (spent ? regainSlot(current, level) : spendSlot(current, level)))
              }
            >
              <span
                className={cn(
                  'size-5 rounded-full border-2 transition-colors',
                  spent ? 'border-muted-foreground/40' : 'border-primary bg-primary',
                )}
              />
            </Button>
          )
        })}
      </div>

      <span className="text-muted-foreground ml-auto shrink-0 text-sm tabular-nums">
        {available}/{max}
      </span>
    </div>
  )
}

/** The max-per-level editor, for pact magic, multiclassing and a DM's ruling. */
function SlotEditor({
  state,
  apply,
}: {
  state: CombatState
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  return (
    <div className="space-y-1">
      {SPELL_LEVELS.map((level) => {
        const max = state.spellSlots[String(level)]?.max ?? 0

        return (
          <div key={level} className="flex items-center gap-2">
            <span className="text-muted-foreground w-14 shrink-0 text-xs font-medium tracking-wide uppercase">
              Lvl {level}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={`One fewer level ${level} slot`}
              disabled={max === 0}
              onClick={() => apply((current) => setSlotMax(current, level, max - 1))}
            >
              −
            </Button>
            <span className="w-8 text-center text-base font-semibold tabular-nums">{max}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={`One more level ${level} slot`}
              disabled={max >= MAX_SLOTS_PER_LEVEL}
              onClick={() => apply((current) => setSlotMax(current, level, max + 1))}
            >
              +
            </Button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Spell slots, tracked per level (DND-009).
 *
 * Maxima are stored rather than derived (see `SpellSlotState` in
 * `src/lib/db/schema.ts`) — pact magic, multiclassing and homebrew all leave
 * the standard tables behind. So a sheet whose slots have never been set up
 * *offers* the standard table for the character's class and level as a single
 * tap, and the editor is there for everyone the tables do not describe.
 */
export function SpellSlotsCard({
  state,
  classIndex,
  classLabel,
  level,
  apply,
}: {
  state: CombatState
  classIndex: string
  /** The class's display name when the reference API has been asked for it. */
  classLabel?: string
  level: number
  apply: (transition: (state: CombatState) => CombatState) => void
}) {
  const [editing, setEditing] = useState(false)

  const levels = slotLevelsOf(state.spellSlots)
  const standard = standardSpellSlots(classIndex, level)
  const hasStandard = Object.keys(standard).length > 0
  const label = classLabel || formatReferenceIndex(classIndex)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Spell slots</CardTitle>
        {levels.length > 0 || editing ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 px-3"
            aria-pressed={editing}
            onClick={() => setEditing((open) => !open)}
          >
            {editing ? 'Done' : 'Adjust'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <SlotEditor state={state} apply={apply} />
            <p className="text-muted-foreground text-xs">
              How many slots of each level you have in total. Spending them is the tap you make in
              play.
            </p>
          </>
        ) : levels.length > 0 ? (
          <div className="space-y-1">
            {levels.map((slotLevel) => {
              const slot = state.spellSlots[String(slotLevel)]

              return (
                <SlotRow
                  key={slotLevel}
                  level={slotLevel}
                  max={slot.max}
                  used={slot.used}
                  apply={apply}
                />
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {hasStandard
                ? `No slots set up yet. A level ${level} ${label} gets the standard table.`
                : `A ${label} has no spell slots by default — add them if your build says otherwise.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {hasStandard ? (
                <Button
                  type="button"
                  className="h-11"
                  onClick={() => apply((current) => setSpellSlots(current, standard))}
                >
                  Use the standard slots
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setEditing(true)}
              >
                Set them by hand
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
