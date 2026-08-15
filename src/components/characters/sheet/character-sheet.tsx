'use client'

import { useState } from 'react'

import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-sheet'
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
 * *changes* first — hit points, death saves, spell slots, conditions, each
 * persisted the moment it is tapped — then the things a session only *reads*,
 * every one of them computed from the stored row rather than kept in step with
 * it.
 *
 * Within the first half the order is how often a turn touches it, not how the
 * rules book groups it (DND-023). Taking damage and spending a slot happen in
 * the same turn, so they are adjacent; conditions change perhaps twice a
 * session and so follow, rather than sitting between the two and pushing slots
 * a screen and a half down.
 *
 * A save that fails is reported by a toast from `useCombatState` — see the
 * `<Toaster />` in `src/app/providers.tsx`. It has to be readable from wherever
 * the tap happened, and this page is several screens long.
 *
 * The initial state is server-rendered by `/characters/[id]`, so the sheet is
 * on screen with the right numbers before any client fetch resolves.
 */
export function CharacterSheet({ character }: { character: Character }) {
  const { state, saving, apply } = useCombatState(character)
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)
  const { classes } = useClasses()

  const classLabel =
    classes.find((option) => option.index === character.classIndex)?.name ??
    formatReferenceIndex(character.classIndex)

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground h-4 text-right text-xs" aria-live="polite">
        {saving ? 'Saving…' : ''}
      </p>

      <HitPointsCard state={state} maxHitPoints={character.maxHitPoints} apply={apply} />

      {state.currentHitPoints === 0 ? <DeathSavesCard state={state} apply={apply} /> : null}

      <SpellSlotsCard
        state={state}
        classIndex={character.classIndex}
        classLabel={classLabel}
        level={character.level}
        apply={apply}
      />

      <ConditionsCard state={state} apply={apply} />

      <VitalsCard character={character} />
      <AbilitiesCard character={character} />
      <SavingThrowsCard character={character} />

      <SpellListCard
        classIndex={character.classIndex}
        knownSpellIndexes={character.knownSpellIndexes}
        editHref={`/characters/${character.id}/edit`}
        onSelect={(spell) => setSelection({ type: 'spell', index: spell.index, name: spell.name })}
      />

      <SkillsCard character={character} />

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
