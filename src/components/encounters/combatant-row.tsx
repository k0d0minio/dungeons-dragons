'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyDamage, applyHealing, combatStateOf, toggleCondition } from '@/lib/characters/combat'
import { CONDITIONS } from '@/lib/characters/rules'
import type { CombatantPatch, CombatantWithCharacter } from '@/lib/db/encounters'
import { monsterAfterDamage, monsterAfterHealing, rollD20 } from '@/lib/encounters/tracker'

/** The one-tap amounts, matching the sheet's HP card idiom. */
const QUICK_AMOUNTS = [5, 1] as const

/** What a row asks its tracker to do. The row itself never fetches. */
export interface CombatantRowHandlers {
  onPatchCombatant: (combatantId: string, patch: CombatantPatch) => void
  /** Absolute PC combat values, written through the character API (D13). */
  onPatchCharacter: (
    row: CombatantWithCharacter,
    changes: { currentHitPoints?: number; temporaryHitPoints?: number; conditions?: string[] },
  ) => void
  onRemove: (combatantId: string) => void
  onOpenMonster: (monsterIndex: string, label: string) => void
}

/**
 * Initiative as a typed number, committed on blur or Enter rather than every
 * keystroke — "17" must not pass through a sorted-to-the-top "1" first.
 */
function InitiativeInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number | null
  onCommit: (initiative: number | null) => void
}) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  // A poll or a roll can move the stored value under the input. Adjusted
  // during render rather than in an effect, so the stale draft is never
  // painted first (react.dev/learn/you-might-not-need-an-effect).
  const [lastValue, setLastValue] = useState(value)

  if (lastValue !== value) {
    setLastValue(value)
    setDraft(value === null ? '' : String(value))
  }

  function commit() {
    const parsed = Number.parseInt(draft, 10)
    const next = Number.isFinite(parsed) ? Math.max(-99, Math.min(99, parsed)) : null
    if (next !== value) onCommit(next)
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={-99}
      max={99}
      className="h-11 w-16 text-center tabular-nums"
      aria-label={`Initiative for ${label}`}
      placeholder="—"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

/**
 * One combatant in the tracker (DND-031). Monster rows own their HP controls
 * (per-instance, D17); PC rows render the live character and route every
 * write through the character API with its version guard (D13) — the row
 * itself holds no PC state to drift.
 */
export function CombatantRow({
  row,
  active,
  handlers,
}: {
  row: CombatantWithCharacter
  active: boolean
  handlers: CombatantRowHandlers
}) {
  const [picking, setPicking] = useState(false)

  const { combatant, character } = row
  const isCharacter = combatant.characterId !== null

  // The live numbers: a PC's from their sheet row, a monster's from its own.
  const current = isCharacter ? (character?.currentHitPoints ?? null) : combatant.currentHitPoints
  const max = isCharacter ? (character?.maxHitPoints ?? null) : combatant.maxHitPoints
  const temp = isCharacter ? (character?.temporaryHitPoints ?? 0) : combatant.temporaryHitPoints
  const conditions = isCharacter ? (character?.conditions ?? []) : combatant.conditions

  const down = current === 0
  const bloodied = current !== null && max !== null && current > 0 && current * 2 <= max

  function damage(amount: number) {
    if (isCharacter) {
      if (!character) return
      const next = applyDamage(combatStateOf(character), character.maxHitPoints, amount)
      handlers.onPatchCharacter(row, {
        currentHitPoints: next.currentHitPoints,
        temporaryHitPoints: next.temporaryHitPoints,
      })
    } else {
      const next = monsterAfterDamage(combatant, amount)
      if (next.currentHitPoints === null) return
      handlers.onPatchCombatant(combatant.id, {
        currentHitPoints: next.currentHitPoints,
        temporaryHitPoints: next.temporaryHitPoints,
      })
    }
  }

  function heal(amount: number) {
    if (isCharacter) {
      if (!character) return
      const next = applyHealing(combatStateOf(character), character.maxHitPoints, amount)
      handlers.onPatchCharacter(row, { currentHitPoints: next.currentHitPoints })
    } else {
      const next = monsterAfterHealing(combatant, amount)
      if (next.currentHitPoints === null) return
      handlers.onPatchCombatant(combatant.id, { currentHitPoints: next.currentHitPoints })
    }
  }

  function toggle(index: string) {
    if (isCharacter) {
      if (!character) return
      const next = toggleCondition(combatStateOf(character), index)
      handlers.onPatchCharacter(row, { conditions: next.conditions })
    } else {
      const next = conditions.includes(index)
        ? conditions.filter((condition) => condition !== index)
        : [...conditions, index]
      handlers.onPatchCombatant(combatant.id, { conditions: next })
    }
  }

  return (
    <li
      className={`space-y-3 rounded-md border p-3 ${
        active ? 'border-primary ring-primary/40 ring-2' : ''
      }`}
      aria-current={active ? 'true' : undefined}
    >
      <div className="flex items-center gap-2">
        <InitiativeInput
          label={combatant.label}
          value={combatant.initiative}
          onCommit={(initiative) => handlers.onPatchCombatant(combatant.id, { initiative })}
        />

        {!isCharacter ? (
          // A monster's roll is a plain d20: its Dexterity modifier lives in
          // the reference detail, which is a per-row fetch this list refuses
          // to make — the DM adds the modifier out loud, like at any table.
          <Button
            type="button"
            variant="outline"
            className="h-11 px-3"
            aria-label={`Roll initiative for ${combatant.label}`}
            onClick={() => handlers.onPatchCombatant(combatant.id, { initiative: rollD20() })}
          >
            Roll
          </Button>
        ) : null}

        <div className="min-w-0 flex-1">
          {isCharacter ? (
            <Link
              href={`/characters/${combatant.characterId}`}
              className="block truncate font-medium underline-offset-4 hover:underline"
            >
              {combatant.label}
            </Link>
          ) : (
            <button
              type="button"
              className="block max-w-full min-h-11 truncate text-left font-medium underline-offset-4 hover:underline"
              onClick={() =>
                combatant.monsterIndex &&
                handlers.onOpenMonster(combatant.monsterIndex, combatant.label)
              }
            >
              {combatant.label}
            </button>
          )}
          {combatant.initiative === null ? (
            <span className="text-muted-foreground block text-xs">no initiative</span>
          ) : null}
        </div>

        {isCharacter && character ? (
          <span className="shrink-0 text-right tabular-nums">
            <span className="text-muted-foreground block text-[10px] uppercase">AC</span>
            <span className="text-sm font-semibold">{character.armorClass}</span>
          </span>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Remove ${combatant.label}`}
          onClick={() => handlers.onRemove(combatant.id)}
        >
          ✕
        </Button>
      </div>

      {current !== null && max !== null ? (
        <div className="flex items-center gap-2">
          <p className="w-20 shrink-0 text-lg font-semibold tabular-nums">
            <span className={down ? 'text-destructive' : bloodied ? 'text-amber-600' : undefined}>
              {current}
            </span>
            <span className="text-muted-foreground text-sm font-medium">/{max}</span>
            {temp > 0 ? (
              <span className="ml-1 text-sm font-semibold text-sky-600">+{temp}</span>
            ) : null}
          </p>
          <div className="grid flex-1 grid-cols-4 gap-1">
            {QUICK_AMOUNTS.map((quick) => (
              <Button
                key={`damage-${quick}`}
                type="button"
                variant="outline"
                className="h-11 tabular-nums"
                aria-label={`${combatant.label} takes ${quick} damage`}
                onClick={() => damage(quick)}
              >
                −{quick}
              </Button>
            ))}
            {[...QUICK_AMOUNTS].reverse().map((quick) => (
              <Button
                key={`heal-${quick}`}
                type="button"
                variant="outline"
                className="h-11 tabular-nums"
                aria-label={`Heal ${combatant.label} ${quick}`}
                onClick={() => heal(quick)}
              >
                +{quick}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {!isCharacter && current !== null ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Temp HP</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={`Remove a temporary hit point from ${combatant.label}`}
              disabled={temp === 0}
              onClick={() =>
                handlers.onPatchCombatant(combatant.id, { temporaryHitPoints: temp - 1 })
              }
            >
              −
            </Button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">{temp}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={`Add a temporary hit point to ${combatant.label}`}
              onClick={() =>
                handlers.onPatchCombatant(combatant.id, { temporaryHitPoints: temp + 1 })
              }
            >
              +
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        {conditions.map((condition) => (
          <Badge key={condition} variant="secondary" className="text-xs capitalize">
            {condition.replace(/-/g, ' ')}
          </Badge>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-2 text-xs"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        >
          {picking ? 'Done' : 'Conditions'}
        </Button>
      </div>

      {picking ? (
        <div className="flex flex-wrap gap-1">
          {CONDITIONS.map((condition) => {
            const on = conditions.includes(condition.index)

            return (
              <Button
                key={condition.index}
                type="button"
                variant={on ? 'default' : 'outline'}
                className="h-11 px-2.5 text-xs"
                aria-pressed={on}
                onClick={() => toggle(condition.index)}
              >
                {condition.label}
              </Button>
            )
          })}
        </div>
      ) : null}
    </li>
  )
}
