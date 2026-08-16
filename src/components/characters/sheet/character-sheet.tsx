'use client'

import { useState } from 'react'

import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-sheet'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { Character } from '@/lib/db/characters'
import type { CharacterItem } from '@/lib/db/schema'
import { useClasses, useEquipmentDetails } from '@/lib/dnd-api/swr-hooks'

import { AttacksCard } from './attacks-card'
import { CharacterNotesCard } from './character-notes-card'
import { ClassResourcesCard } from './class-resources-card'
import { ConcentrationCard } from './concentration-card'
import { ConditionsCard } from './conditions-card'
import { DeathSavesCard } from './death-saves-card'
import { ExperienceCard } from './experience-card'
import { HitPointsCard } from './hit-points-card'
import { InventoryCard } from './inventory-card'
import { RestsCard } from './rests-card'
import { SpellListCard } from './spell-list-card'
import { SpellSlotsCard } from './spell-slots-card'
import {
  abilityScoresOf,
  AbilitiesCard,
  SavingThrowsCard,
  SkillsCard,
  VitalsCard,
} from './stats-cards'
import { useCombatState } from './use-combat-state'

/**
 * The combat-core character sheet (DND-009, extended by the DND-033/034/035/
 * 036/038 slice).
 *
 * Two halves, in the order a phone is used at a table: the things a session
 * *changes* first — hit points, attacks (read every turn, so beside them),
 * spell slots, rests, class resources, conditions with exhaustion, inventory —
 * then the things a session only *reads*, every one of them computed from the
 * stored row rather than kept in step with it.
 *
 * Within the first half the order is how often a turn touches it, not how the
 * rules book groups it (DND-023): damage and slots are same-turn neighbours,
 * rests and resources follow, conditions change perhaps twice a session, and
 * the inventory is a between-fights surface. The DND-023 invariant stands:
 * spell slots stay above conditions.
 *
 * Items arrive server-rendered from `/characters/[id]` and live in local state
 * here: their mutations go through `/api/characters/[id]/items` inside the
 * inventory card and land back via `setItems`, not through the combat-state
 * pipeline — an item row has no version column to guard (DND-035).
 *
 * A save that fails is reported by a toast from `useCombatState` — see the
 * `<Toaster />` in `src/app/providers.tsx`. It has to be readable from wherever
 * the tap happened, and this page is several screens long.
 */
export function CharacterSheet({
  character,
  items: initialItems = [],
  notes = null,
}: {
  character: Character
  items?: CharacterItem[]
  /**
   * The owner's private notes (DND-058), or `null` when the viewer is not the
   * owner — a DM opening a party member's sheet gets no notes card at all, and
   * gets it as `null` rather than `''` so "nobody may see this" and "nothing
   * written yet" cannot be confused.
   */
  notes?: string | null
}) {
  const { state, saving, apply } = useCombatState(character)
  const [items, setItems] = useState<CharacterItem[]>(initialItems)
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)
  const { classes } = useClasses()

  const classLabel =
    classes.find((option) => option.index === character.classIndex)?.name ??
    formatReferenceIndex(character.classIndex)

  // One fetch for everything equipped: the attack rows and the derived AC read
  // the same reference details at the same moment.
  const equippedIndexes = items
    .filter((item) => item.equipped && item.equipmentIndex)
    .map((item) => item.equipmentIndex as string)
  const { details: equippedDetails, isLoading: detailsLoading } =
    useEquipmentDetails(equippedIndexes)

  const equippedArmor = equippedIndexes
    .map((index) => equippedDetails[index])
    .filter((detail) => detail !== undefined && detail.armor_class !== undefined)

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground h-4 text-right text-xs" aria-live="polite">
        {saving ? 'Saving…' : ''}
      </p>

      <HitPointsCard state={state} maxHitPoints={character.maxHitPoints} apply={apply} />

      <AttacksCard
        character={character}
        items={items}
        details={equippedDetails}
        detailsLoading={detailsLoading}
      />

      {state.currentHitPoints === 0 ? <DeathSavesCard state={state} apply={apply} /> : null}

      <SpellSlotsCard
        state={state}
        classIndex={character.classIndex}
        classLabel={classLabel}
        level={character.level}
        apply={apply}
      />

      {/* Concentration (DND-049) sits with the slots because it is a
          spellcasting state and it is consulted every time this character takes
          a hit. Rendered for every character, not just casters: a wand, a
          readied spell and a DM's amulet all need concentrating on, and hiding
          the card from a fighter hides it from the player likeliest to forget. */}
      <ConcentrationCard
        classIndex={character.classIndex}
        knownSpellIndexes={character.knownSpellIndexes}
        state={state}
        apply={apply}
        onSelect={(spell) => setSelection({ type: 'spell', index: spell.index, name: spell.name })}
      />

      <RestsCard character={character} state={state} apply={apply} />

      <ClassResourcesCard state={state} apply={apply} />

      <ConditionsCard state={state} apply={apply} />

      <InventoryCard
        characterId={character.id}
        items={items}
        onItemsChange={setItems}
        state={state}
        apply={apply}
      />

      {/* The read half opens here (DND-055). XP is between-fights content, so
          it sits below everything a turn touches — but ahead of the derived
          numbers, because it is the only card down here that ever has news:
          a level waiting to be taken. */}
      <ExperienceCard
        characterId={character.id}
        level={character.level}
        state={state}
        apply={apply}
      />

      <VitalsCard character={character} equippedArmor={equippedArmor} />
      <AbilitiesCard character={character} />
      <SavingThrowsCard character={character} />

      <SpellListCard
        classIndex={character.classIndex}
        level={character.level}
        scores={abilityScoresOf(character)}
        knownSpellIndexes={character.knownSpellIndexes}
        state={state}
        apply={apply}
        editHref={`/characters/${character.id}/edit`}
        onSelect={(spell) => setSelection({ type: 'spell', index: spell.index, name: spell.name })}
      />

      <SkillsCard character={character} />

      {/* Last on the read half: the one card whose contents nobody else may
          see, and the only one a session never has to consult mid-turn. */}
      {notes === null ? null : <CharacterNotesCard characterId={character.id} notes={notes} />}

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
