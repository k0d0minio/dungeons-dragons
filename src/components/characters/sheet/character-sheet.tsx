'use client'

import { useState } from 'react'

import {
  ReferenceDetailSheet,
  type ReferenceSelection,
} from '@/components/reference/reference-detail-sheet'
import {
  SegmentedControl,
  SegmentedControlItem,
  SegmentedControlList,
  SegmentedControlPanel,
} from '@/components/ui/segmented-control'
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
import { AbilitiesCard, SavingThrowsCard, SkillsCard, VitalsCard } from './stats-cards'
import { useCombatState } from './use-combat-state'

/**
 * The four segments, in the order they sit on the control. Fixed for every
 * character, caster or not: the position of a segment is how a player finds it
 * without reading it, and a Spells segment that comes and goes by class would
 * move Gear under a different thumb on someone else's phone. A fighter's
 * Spells segment is not empty either — slots take a DM's ruling, an item or a
 * multiclass the tables do not describe, and concentration was never
 * caster-only (DND-049).
 */
const SEGMENTS = [
  { value: 'play', label: 'Play' },
  { value: 'spells', label: 'Spells' },
  { value: 'gear', label: 'Gear' },
  { value: 'me', label: 'Me' },
] as const

/**
 * The combat-core character sheet (DND-009, extended by the DND-033/034/035/
 * 036/038 slice), as four segments of an iOS segmented control.
 *
 * The fifteen cards used to be one column several screens long; they are now
 * four short screens nothing is more than a swipe away from
 * (`apple-redesign/sheet-segments`):
 *
 * - **Play** — what a turn touches: hit points, attacks, death saves at zero,
 *   concentration, rests, class resources, conditions.
 * - **Spells** — slots, preparation and the class list.
 * - **Gear** — the derived numbers equipping something changes, then the
 *   inventory and the purse that change them.
 * - **Me** — the character record: abilities, saves, skills, level, notes.
 *
 * Within Play the order is still how often a turn touches it, not how the
 * rules book groups it (DND-023): damage first, attacks beside it because they
 * are read every turn, then the once-a-fight things, and conditions last
 * because they change perhaps twice a session. DND-023's "spell slots above
 * conditions" invariant was about their distance apart in one long column;
 * the column is gone, and slots are now a segment of their own.
 *
 * Only the open segment is mounted, and nothing is lost by that: every
 * mutable value lives in `useCombatState` and in the `items` state here, both
 * above the control. The fifteen-second poll and the DND-028 conflict guard
 * run for the whole sheet regardless of which segment is showing, so a DM's
 * edit to a spell slot lands while the player is looking at their inventory.
 *
 * Items arrive server-rendered from `/characters/[id]` and live in local state
 * here: their mutations go through `/api/characters/[id]/items` inside the
 * inventory card and land back via `setItems`, not through the combat-state
 * pipeline — an item row has no version column to guard (DND-035).
 *
 * A save that fails is reported by a toast from `useCombatState` — see the
 * `<Toaster />` in `src/app/providers.tsx`. It has to be readable from
 * wherever the tap happened, and the tap may have been in a segment the toast
 * does not belong to.
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
  // the same reference details at the same moment. It stays here rather than
  // in either segment, so switching between Play and Gear does not refetch.
  const equippedIndexes = items
    .filter((item) => item.equipped && item.equipmentIndex)
    .map((item) => item.equipmentIndex as string)
  const { details: equippedDetails, isLoading: detailsLoading } =
    useEquipmentDetails(equippedIndexes)

  const equippedArmor = equippedIndexes
    .map((index) => equippedDetails[index])
    .filter((detail) => detail !== undefined && detail.armor_class !== undefined)

  const down = state.currentHitPoints === 0

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground h-4 text-right text-xs" aria-live="polite">
        {saving ? 'Saving…' : ''}
      </p>

      <SegmentedControl defaultValue="play">
        <SegmentedControlList aria-label="Character sheet sections">
          {SEGMENTS.map((segment) => (
            <SegmentedControlItem key={segment.value} value={segment.value}>
              {segment.label}
              {/* Dropping to 0 is the one thing that can happen in a segment
                  you are not looking at and needs you back in Play — the death
                  saves card is there and nowhere else. A dot, not a number:
                  the segment says where to go, the card says what to do. */}
              {segment.value === 'play' && down ? (
                <>
                  <span
                    className="bg-destructive size-2 shrink-0 rounded-full"
                    aria-hidden="true"
                  />
                  <span className="sr-only">at 0 hit points</span>
                </>
              ) : null}
            </SegmentedControlItem>
          ))}
        </SegmentedControlList>

        <SegmentedControlPanel value="play" className="space-y-4">
          <HitPointsCard state={state} maxHitPoints={character.maxHitPoints} apply={apply} />

          <AttacksCard
            character={character}
            items={items}
            details={equippedDetails}
            detailsLoading={detailsLoading}
          />

          {down ? <DeathSavesCard state={state} apply={apply} /> : null}

          {/* Concentration (DND-049) is a Play card, not a Spells one: it is
              consulted every time this character takes a hit, and the hit
              happens here. Rendered for every character, not just casters — a
              wand, a readied spell and a DM's amulet all need concentrating
              on, and hiding the card from a fighter hides it from the player
              likeliest to forget. */}
          <ConcentrationCard
            classIndex={character.classIndex}
            knownSpellIndexes={character.knownSpellIndexes}
            state={state}
            apply={apply}
            onSelect={(spell) =>
              setSelection({ type: 'spell', index: spell.index, name: spell.name })
            }
          />

          <RestsCard character={character} state={state} apply={apply} />

          <ClassResourcesCard state={state} apply={apply} />

          <ConditionsCard state={state} apply={apply} />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="spells" className="space-y-4">
          <SpellSlotsCard
            state={state}
            classIndex={character.classIndex}
            classLabel={classLabel}
            level={character.level}
            apply={apply}
          />

          <SpellListCard
            classIndex={character.classIndex}
            level={character.level}
            knownSpellIndexes={character.knownSpellIndexes}
            state={state}
            apply={apply}
            editHref={`/characters/${character.id}/edit`}
            onSelect={(spell) =>
              setSelection({ type: 'spell', index: spell.index, name: spell.name })
            }
          />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="gear" className="space-y-4">
          {/* The vitals strip leads Gear rather than Me because its headline
              number is the one this segment changes: equipping body armour or
              a shield derives the AC (DND-035), and the confirmation belongs
              on the screen where the tap happened. */}
          <VitalsCard character={character} equippedArmor={equippedArmor} />

          <InventoryCard
            characterId={character.id}
            items={items}
            onItemsChange={setItems}
            state={state}
            apply={apply}
          />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="me" className="space-y-4">
          <AbilitiesCard character={character} />
          <SavingThrowsCard character={character} />
          <SkillsCard character={character} />

          {/* XP and the level waiting to be taken (DND-055): between-fights
              content, and the only card in Me that ever has news. */}
          <ExperienceCard
            characterId={character.id}
            level={character.level}
            state={state}
            apply={apply}
          />

          {/* Last, and last for a reason: the one card whose contents nobody
              else may see. */}
          {notes === null ? null : <CharacterNotesCard characterId={character.id} notes={notes} />}
        </SegmentedControlPanel>
      </SegmentedControl>

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />
    </div>
  )
}
