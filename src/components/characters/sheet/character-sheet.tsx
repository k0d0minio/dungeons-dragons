'use client'

import { useState } from 'react'

import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-sheet'
import { Button } from '@/components/ui/button'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { Character } from '@/lib/db/characters'
import { useClasses } from '@/lib/dnd-api/swr-hooks'

import { ConditionsCard } from './conditions-card'
import { DeathSavesCard } from './death-saves-card'
import { HitPointsCard } from './hit-points-card'
import { SpellListCard } from './spell-list-card'
import { SpellSlotsCard } from './spell-slots-card'
import { AbilitiesCard, SavingThrowsCard, SkillsCard, VitalsCard } from './stats-cards'
import { useCombatState } from './use-combat-state'

/**
 * The combat-core character sheet (DND-009).
 *
 * Two halves, in the order a phone is used at a table: the things a session
 * *changes* first — hit points, death saves, conditions, spell slots, each
 * persisted the moment it is tapped — then the things a session only *reads*,
 * every one of them computed from the stored row rather than kept in step with
 * it.
 *
 * The initial state is server-rendered by `/characters/[id]`, so the sheet is
 * on screen with the right numbers before any client fetch resolves.
 */
export function CharacterSheet({ character }: { character: Character }) {
  const { state, saving, error, apply, dismissError } = useCombatState(character)
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)
  const { classes } = useClasses()

  const classLabel =
    classes.find((option) => option.index === character.classIndex)?.name ??
    formatReferenceIndex(character.classIndex)

  return (
    <div className="space-y-4">
      {/* A save that failed has to be visible without hunting for it: the sheet
          has already rolled back to the last stored values by this point. */}
      {error ? (
        <div
          role="alert"
          className="border-destructive/50 text-destructive flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive h-8 shrink-0 px-2"
            onClick={dismissError}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <p className="text-muted-foreground h-4 text-right text-xs" aria-live="polite">
        {saving ? 'Saving…' : ''}
      </p>

      <HitPointsCard state={state} maxHitPoints={character.maxHitPoints} apply={apply} />

      {state.currentHitPoints === 0 ? <DeathSavesCard state={state} apply={apply} /> : null}

      <ConditionsCard state={state} apply={apply} />

      <SpellSlotsCard
        state={state}
        classIndex={character.classIndex}
        classLabel={classLabel}
        level={character.level}
        apply={apply}
      />

      <VitalsCard character={character} />
      <AbilitiesCard character={character} />
      <SavingThrowsCard character={character} />

      <SpellListCard
        classIndex={character.classIndex}
        knownSpellIndexes={character.knownSpellIndexes}
        onSelect={(spell) => setSelection({ type: 'spell', index: spell.index, name: spell.name })}
      />

      <SkillsCard character={character} />

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
