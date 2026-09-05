'use client'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { unarmedStrike, weaponAttack } from '@/lib/characters/attacks'
import type { CombatState } from '@/lib/characters/combat'
import { effectiveSpeed } from '@/lib/characters/rules'
import { bonusActions, hasCantrips, reactions, slotsLeft } from '@/lib/characters/turn'
import {
  unarmedStrikeWalkthrough,
  weaponAttackWalkthrough,
  type RollWalkthrough,
} from '@/lib/characters/walkthrough'
import type { Character, CharacterItem } from '@/lib/db/schema'
import { WEAPONS } from '@/lib/srd/weapons'

/** "d20 + 5", "d20 − 1" — the die and the number, the way the DM says it. */
function d20Plus(total: number | null): string {
  if (total === null) return 'd20'
  return total < 0 ? `d20 − ${Math.abs(total)}` : `d20 + ${total}`
}

/** One line of the turn, and the tap that explains it where there is one. */
function TurnLine({
  label,
  term,
  text,
  onWalkthrough,
}: {
  label: string
  term?: string
  text: string
  onWalkthrough?: () => void
}) {
  const labelNode = term ? <GlossaryTerm index={term}>{label}</GlossaryTerm> : label
  const body = (
    <>
      <span className="text-muted-foreground w-24 shrink-0 text-xs tracking-wide uppercase">
        {labelNode}
      </span>
      <span className="min-w-0 text-left text-sm">{text}</span>
    </>
  )

  return (
    <li className="border-b last:border-b-0">
      {onWalkthrough ? (
        <button
          type="button"
          aria-label={`${label}: ${text}`}
          onClick={onWalkthrough}
          className="focus-visible:ring-ring hover:bg-accent/50 flex min-h-11 w-full items-baseline gap-3 rounded-sm py-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-h-11 w-full items-baseline gap-3 py-2">{body}</div>
      )}
    </li>
  )
}

/**
 * The turn, at the top of the sheet (`first-table/your-turn-card`).
 *
 * The one artefact every source the research found wants in front of a
 * beginner, and it is per-character rather than generic: how far they move,
 * each readied weapon written the way the DM says it — "roll d20 + 5, hit if
 * it beats their AC, then 1d8 + 3 slashing" — the bonus action their class or
 * a prepared spell gives them, the reaction, and whether their spells are
 * cantrips or slots. Pinned first on Play with hit points directly under it,
 * because "what do I roll" is the first thing a level-1 table is asked.
 *
 * **Nothing here is computed.** Every attack line is the walkthrough module's
 * own row rendered as a sentence — the same `weaponAttackWalkthrough` the
 * Attacks card opens, whose tests hold each breakdown to the engine's answer —
 * and tapping the line opens that walkthrough. The bonus action and the
 * reaction come from `src/lib/characters/turn.ts`, which reads the SRD's own
 * text for them. D8 holds: nothing rolls.
 *
 * Gates apply: no slot line for a character without slots, the mastery word
 * only when that gate is on. Slots and exhaustion are read from the live
 * combat state rather than the row, so the count moves with the Spells
 * segment and the speed with the exhaustion stepper.
 */
export function TurnCard({
  character,
  items,
  state,
  mastery = true,
  onWalkthrough,
}: {
  character: Character
  items: CharacterItem[]
  state: CombatState
  /** Whether this table shows Weapon Mastery at all (`first-table/weapon-mastery-gate`). */
  mastery?: boolean
  onWalkthrough: (walkthrough: RollWalkthrough) => void
}) {
  const speed = effectiveSpeed(character.speed, state.exhaustion)

  // Readied weapons, from the local SRD table: no fetch stands between the
  // player and the first line of their turn.
  const attacks = items
    .filter((item) => item.equipped && item.equipmentIndex !== null)
    .flatMap((item) => {
      const weapon = WEAPONS.get(item.equipmentIndex as string)
      if (!weapon) return []
      const name = item.customName ?? undefined
      const attack = weaponAttack(character, weapon, name)
      const walkthrough = weaponAttackWalkthrough(character, weapon, name, { mastery })
      const damage = walkthrough.outcomes.find((outcome) => outcome.dice)?.dice
      const masteryWord = mastery && attack.mastery?.available ? ` · ${attack.mastery.name}` : ''

      return [
        {
          key: item.id,
          label: attack.name,
          text: `roll ${d20Plus(walkthrough.total)}, hit if it beats their AC${
            damage ? `, then ${damage}` : ''
          }${masteryWord}`,
          walkthrough,
        },
      ]
    })

  const unarmed = unarmedStrike(character)

  const spellState = {
    knownSpellIndexes: character.knownSpellIndexes,
    preparedSpellIndexes: state.preparedSpellIndexes,
  }
  const bonus = bonusActions({
    ...spellState,
    classIndex: character.classIndex,
    level: character.level,
  })
  const reaction = reactions(spellState)
  const cantrips = hasCantrips(character.knownSpellIndexes)
  const slots = slotsLeft(state.spellSlots)

  const spellsLine = [
    cantrips ? 'cantrips always' : null,
    slots !== null ? `${slots} slot${slots === 1 ? '' : 's'} left` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <GlossaryTerm index="turn">Your turn</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul aria-label="Your turn">
          <TurnLine label="Move" term="speed" text={`${speed} ft`} />

          {attacks.length > 0 ? (
            attacks.map((attack) => (
              <TurnLine
                key={attack.key}
                label={attack.label}
                text={attack.text}
                onWalkthrough={() => onWalkthrough(attack.walkthrough)}
              />
            ))
          ) : (
            <TurnLine
              label="Unarmed strike"
              text={`roll ${d20Plus(unarmed.attackBonus)}, hit if it beats their AC, then ${unarmed.damage} bludgeoning`}
              onWalkthrough={() => onWalkthrough(unarmedStrikeWalkthrough(character))}
            />
          )}

          <TurnLine
            label="Bonus action"
            term="bonus-action"
            text={bonus.length > 0 ? bonus.map((option) => option.name).join(' · ') : 'none yet'}
          />

          <TurnLine
            label="Reaction"
            term="reaction"
            text={reaction
              .map((option) => (option.when ? `${option.name} — ${option.when}` : option.name))
              .join(' · ')}
          />

          {spellsLine ? <TurnLine label="Spells" term="cantrip" text={spellsLine} /> : null}
        </ul>
      </CardContent>
    </Card>
  )
}
