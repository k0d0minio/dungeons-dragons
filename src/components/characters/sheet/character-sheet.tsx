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
import { ALL_GATES_ON, type SheetGates } from '@/lib/campaigns/gates'
import { formatReferenceIndex } from '@/lib/characters/display'
import type { RollWalkthrough } from '@/lib/characters/walkthrough'
import type { Character } from '@/lib/db/characters'
import type { CharacterItem } from '@/lib/db/schema'
import { CLASSES } from '@/lib/srd/classes'
import { useEquipmentDetails } from '@/lib/srd/hooks'

import { AttacksCard } from './attacks-card'
import { CharacterNotesCard } from './character-notes-card'
import { ClassResourcesCard } from './class-resources-card'
import { ConcentrationCard } from './concentration-card'
import { ConditionsCard } from './conditions-card'
import { DeathSavesCard } from './death-saves-card'
import { ExperienceCard } from './experience-card'
import { HeroicInspirationCard } from './heroic-inspiration-card'
import { HitPointsCard } from './hit-points-card'
import { InventoryCard } from './inventory-card'
import { OriginCard } from './origin-card'
import { RestsCard } from './rests-card'
import { SpellListCard } from './spell-list-card'
import { SpellSlotsCard } from './spell-slots-card'
import { AbilitiesCard, SavingThrowsCard, SkillsCard, VitalsCard } from './stats-cards'
import { useCombatState } from './use-combat-state'
import { WalkthroughSheet } from './walkthrough-sheet'

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
 * Tapping an attack, a skill, a save or a spell opens the walkthrough sheet
 * (`learn-to-play/roll-walkthroughs`) — which die, what the bonus is made of,
 * what to beat, what happens next. It is held here rather than per card
 * because those taps come from three different segments and only the open one
 * is mounted; the spell walkthrough is the exception, and lives inside the
 * cast flow where the slot spend it describes actually happens.
 *
 * A save that fails is reported by a toast from `useCombatState` — see the
 * `<Toaster />` in `src/app/providers.tsx`. It has to be readable from
 * wherever the tap happened, and the tap may have been in a segment the toast
 * does not belong to.
 *
 * `gates` is how much of all that this character's table has switched on
 * (D40, `dm-prep-suite/campaign-feature-gates`) — everything, for a character
 * in no campaign. A gate off means a card is **not rendered**, and that is the
 * whole mechanism: the state behind it is still in `useCombatState`, still
 * polled, still saved, and still folded into every derived number the sheet
 * prints — exhaustion keeps subtracting from saves and skills whether or not
 * its stepper is on screen, and a long rest keeps refilling a hidden rage
 * pool. Nothing here clears a column, so switching a gate on hands the player
 * a card with their own history already in it.
 *
 * The four segments do not move. A gate can empty a segment (a level-1
 * non-caster whose table has preparation off is left with slots alone in
 * Spells) but never remove one: the position of a segment is how a player
 * finds it without reading it, and a control that reflows when the DM changes
 * a setting is worse than a thin screen.
 */
export function CharacterSheet({
  character,
  items: initialItems = [],
  notes = null,
  gates = ALL_GATES_ON,
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
  /**
   * The campaign gates this character plays under, already resolved across
   * every campaign it is on. Defaults to all on, which is both what a
   * character outside any campaign gets and what any caller that has not asked
   * gets — the failure a gate is allowed to have is showing too much.
   */
  gates?: SheetGates
}) {
  const { state, saving, apply } = useCombatState(character)
  const [items, setItems] = useState<CharacterItem[]>(initialItems)
  const [selection, setSelection] = useState<ReferenceSelection | null>(null)
  // One walkthrough layer for the whole sheet, held here for the same reason
  // the reference detail sheet is: the cards that open it live in three
  // different segments, and only the open segment is mounted.
  const [walkthrough, setWalkthrough] = useState<RollWalkthrough | null>(null)
  // Local SRD data — the twelve classes ship with the sheet either way.
  const classes = CLASSES.all

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
    .filter((detail) => detail !== undefined && detail.armorClass !== null)

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
            onWalkthrough={setWalkthrough}
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

          {/* Heroic Inspiration (SRD 5.2.1) sits with the once-a-fight things
              rather than with the record in Me: it is handed over mid-scene and
              spent on the next bad roll, so it belongs where the taps are. */}
          <HeroicInspirationCard state={state} apply={apply} />

          <RestsCard character={character} state={state} apply={apply} />

          {/* Both of these are gated (D40), and both keep working while
              hidden: rests still refill the pools by recharge rule, and a
              condition or a level of exhaustion set before the gate closed
              still moves the numbers in Me and on every attack. */}
          {gates.classResources ? <ClassResourcesCard state={state} apply={apply} /> : null}

          {gates.conditions ? <ConditionsCard state={state} apply={apply} /> : null}
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
            character={character}
            classIndex={character.classIndex}
            level={character.level}
            knownSpellIndexes={character.knownSpellIndexes}
            state={state}
            apply={apply}
            editHref={`/characters/${character.id}/edit`}
            preparation={gates.spellPreparation}
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
            currency={gates.currency}
          />
        </SegmentedControlPanel>

        <SegmentedControlPanel value="me" className="space-y-4">
          <AbilitiesCard character={character} />

          {/* The 2024 origin block, above saves and skills because it is what
              explains them: the background is where two of those proficiencies
              came from, and the ability increases are why the scores above read
              as they do. */}
          <OriginCard character={character} />

          <SavingThrowsCard character={character} onWalkthrough={setWalkthrough} />
          <SkillsCard character={character} onWalkthrough={setWalkthrough} />

          {/* XP and the level it has earned (DND-055): between-fights content,
              and off unless this table has switched it on (D35 — Jamie's table
              levels by milestone, so the default sheet has no XP on it at all).
              The column keeps whatever it holds while the card is hidden, like
              every other gate, so a table that turns XP on finds its totals
              where it left them. What replaces it for a milestone table is the
              band at the head of the page, which the sheet does not render. */}
          {gates.experiencePoints ? (
            <ExperienceCard
              characterId={character.id}
              level={character.level}
              state={state}
              apply={apply}
            />
          ) : null}

          {/* Last, and last for a reason: the one card whose contents nobody
              else may see. */}
          {notes === null ? null : <CharacterNotesCard characterId={character.id} notes={notes} />}
        </SegmentedControlPanel>
      </SegmentedControl>

      <ReferenceDetailSheet selection={selection} onClose={() => setSelection(null)} />

      <WalkthroughSheet walkthrough={walkthrough} onClose={() => setWalkthrough(null)} />
    </div>
  )
}
