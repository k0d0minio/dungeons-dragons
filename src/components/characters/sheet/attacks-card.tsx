'use client'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  spellAttackBonus,
  spellSaveDc,
  unarmedStrike,
  weaponAttack,
} from '@/lib/characters/attacks'
import { formatModifier, formatReferenceIndex } from '@/lib/characters/display'
import { exhaustionD20Penalty } from '@/lib/characters/rules'
import {
  spellAttackWalkthrough,
  unarmedStrikeWalkthrough,
  weaponAttackWalkthrough,
  type RollWalkthrough,
} from '@/lib/characters/walkthrough'
import type { Character, CharacterItem } from '@/lib/db/schema'
import type { SrdEquipment } from '@/lib/srd/types'
import { WEAPONS } from '@/lib/srd/weapons'

/** True for a reference item the attack rules can read as a weapon. */
function isWeapon(details: SrdEquipment): boolean {
  return details.categories.includes('weapons')
}

/**
 * One attack, and — where the sheet has one to give — the tap that explains it
 * (`learn-to-play/roll-walkthroughs`).
 *
 * The whole row is the touch target, because "tap the attack" is the
 * instruction a beginner is given and anything smaller is a target to hunt
 * for. A row with no walkthrough behind it (a custom item, a reference row
 * that has not loaded) stays inert markup rather than becoming a button that
 * does nothing.
 *
 * The row's accessible name is unchanged either way — "Longsword +5, 1d8+3
 * slashing" — it has simply moved onto the control that now carries it.
 */
function AttackRow({
  name,
  bonus,
  detail,
  muted,
  mastery,
  onWalkthrough,
}: {
  name: string
  bonus: string | null
  detail: string | null
  muted?: boolean
  mastery?: { text: string; usable: boolean }
  /** Opens the explanation, or absent where there is nothing to explain. */
  onWalkthrough?: () => void
}) {
  // The whole row spelled out for a screen reader: "Longsword +5, 1d8+3
  // slashing, Mastery: Sap" — the visual split into name, bonus and detail
  // is layout.
  const label = `${name}${bonus ? ` ${bonus}` : ''}${detail ? `, ${detail}` : ''}${
    mastery ? `, ${mastery.text}` : ''
  }`

  const body = (
    <>
      <span className="min-w-0 text-left" aria-hidden>
        <span className="block text-sm font-medium">{name}</span>
        {detail ? (
          <span
            className={`block text-xs ${muted ? 'text-muted-foreground italic' : 'text-muted-foreground'}`}
          >
            {detail}
          </span>
        ) : null}
        {mastery ? (
          <span
            className={`block text-xs ${mastery.usable ? 'text-muted-foreground' : 'text-muted-foreground/60 italic'}`}
          >
            {mastery.text}
          </span>
        ) : null}
      </span>
      {bonus !== null ? (
        <span className="shrink-0 text-base font-semibold tabular-nums" aria-hidden>
          {bonus}
        </span>
      ) : null}
    </>
  )

  const rowClass = 'flex w-full min-h-11 items-center justify-between gap-3 py-2'

  return (
    <li className="border-b last:border-b-0">
      {onWalkthrough ? (
        <button
          type="button"
          aria-label={label}
          onClick={onWalkthrough}
          className={`focus-visible:ring-ring hover:bg-accent/50 rounded-sm focus-visible:ring-2 focus-visible:outline-none ${rowClass}`}
        >
          {body}
        </button>
      ) : (
        <div className={rowClass} aria-label={label}>
          {body}
        </div>
      )}
    </li>
  )
}

/**
 * The actions surface (DND-034): what this character rolls on their turn.
 *
 * Every number is derived at render time — the item row stores the *choice*
 * (which weapon, equipped), the reference data holds the dice, and
 * `weaponAttack` joins the two. Proficiency with whatever is equipped is
 * assumed (see `src/lib/characters/attacks.ts`), and the footnote says so on
 * screen rather than leaving a quietly optimistic number.
 *
 * Weapon Mastery (2024) is surfaced per row, because it is the property a
 * martial actually uses on a hit and there is nowhere else on the sheet to
 * read it. A class with the Weapon Mastery feature gets the property named on
 * the row; a class without gets it named and greyed with the reason, because
 * knowing that the longsword you are holding has Sap — and that your wizard
 * cannot use it — is worth a line, and hiding it would leave the table
 * wondering. What the property *does* is the rules chapter's job, not a third
 * line under every weapon.
 *
 * Every row is also a tap that explains itself
 * (`learn-to-play/roll-walkthroughs`): which die, what the bonus is made of
 * and why, what to beat, and what to roll on a hit. The explanation is built
 * by `src/lib/characters/walkthrough.ts` out of the same `weaponAttack` row
 * this card prints from, so the two can never disagree — and it explains the
 * roll rather than making it, because the app never rolls (D8).
 */
export function AttacksCard({
  character,
  items,
  details,
  detailsLoading,
  onWalkthrough,
}: {
  character: Character
  items: CharacterItem[]
  /** Reference details of equipped items, keyed by equipment index. */
  details: Record<string, SrdEquipment>
  detailsLoading: boolean
  /** Opens the explanation of a tapped row. */
  onWalkthrough: (walkthrough: RollWalkthrough) => void
}) {
  const equipped = items.filter((item) => item.equipped)

  const rows: Array<{
    key: string
    name: string
    bonus: string | null
    detail: string | null
    muted?: boolean
    /** The 2024 mastery line, when the weapon has one. */
    mastery?: { text: string; usable: boolean }
    /**
     * The explanation behind the row, built lazily on tap. Absent for a row
     * with no attack behind it to explain — a custom item, or a reference row
     * that has not arrived.
     */
    walkthrough?: () => RollWalkthrough
  }> = []

  for (const item of equipped) {
    if (!item.equipmentIndex) {
      rows.push({
        key: item.id,
        name: item.customName ?? 'Custom item',
        bonus: null,
        detail: 'stats unknown — custom item',
        muted: true,
      })
      continue
    }

    const reference = details[item.equipmentIndex]

    if (!reference) {
      // Still loading, or the reference API let this one down: the row keeps
      // its place so the list does not reflow when the details land.
      rows.push({
        key: item.id,
        name: item.customName ?? formatReferenceIndex(item.equipmentIndex),
        bonus: null,
        detail: detailsLoading ? 'Loading…' : 'stats unavailable',
        muted: true,
      })
      continue
    }

    if (!isWeapon(reference)) continue

    // The dice, properties and mastery come from the local SRD weapon table
    // rather than the equipment row: `equipment.json` carries what every item
    // has (cost, weight, category), the 38-row weapons table carries what only
    // a weapon has. An index categorised as a weapon that the table does not
    // define is not something to invent an attack for.
    const weapon = WEAPONS.get(item.equipmentIndex)
    if (!weapon) continue

    const attack = weaponAttack(character, weapon, item.customName ?? undefined)

    const parts: string[] = []
    if (attack.damage) parts.push(attack.damage)
    if (attack.versatileDamage) parts.push(`(${attack.versatileDamage} two-handed)`)
    if (attack.range) {
      parts.push(
        `· range ${attack.range.normal}${attack.range.long ? `/${attack.range.long}` : ''} ft`,
      )
    }

    rows.push({
      key: item.id,
      name: attack.name,
      bonus: formatModifier(attack.attackBonus),
      detail: parts.length > 0 ? parts.join(' ') : null,
      mastery: attack.mastery
        ? {
            text: attack.mastery.available
              ? `Mastery: ${attack.mastery.name}`
              : `Mastery: ${attack.mastery.name} — not available to your class`,
            usable: attack.mastery.available,
          }
        : undefined,
      walkthrough: () => weaponAttackWalkthrough(character, weapon, item.customName ?? undefined),
    })
  }

  const hasWeaponRows = rows.length > 0

  const spellBonus = spellAttackBonus(character)
  const saveDc = spellSaveDc(character)

  const exhaustionPenalty = exhaustionD20Penalty(character.exhaustion)
  // Off the engine, not worked out here: the walkthrough that explains this
  // row reads the same function, and two copies of "1 + Strength" is exactly
  // the drift `learn-to-play/roll-walkthroughs` exists to rule out.
  const unarmed = unarmedStrike(character)
  const spellWalkthrough = spellAttackWalkthrough(character)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <GlossaryTerm index="attack-roll">Attacks</GlossaryTerm>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasWeaponRows ? (
          <p className="text-muted-foreground text-sm">
            Equip a weapon in Inventory to see attacks.
          </p>
        ) : null}

        <ul aria-label="Attacks">
          {rows.map((row) => (
            <AttackRow
              key={row.key}
              name={row.name}
              bonus={row.bonus}
              detail={row.detail}
              muted={row.muted}
              mastery={row.mastery}
              onWalkthrough={row.walkthrough ? () => onWalkthrough(row.walkthrough!()) : undefined}
            />
          ))}

          {spellBonus !== null && saveDc !== null ? (
            <AttackRow
              name="Spell attack"
              bonus={formatModifier(spellBonus)}
              detail={`save DC ${saveDc}`}
              onWalkthrough={spellWalkthrough ? () => onWalkthrough(spellWalkthrough) : undefined}
            />
          ) : null}

          <AttackRow
            name="Unarmed strike"
            bonus={formatModifier(unarmed.attackBonus)}
            detail={`${unarmed.damage} bludgeoning`}
            onWalkthrough={() => onWalkthrough(unarmedStrikeWalkthrough(character))}
          />
        </ul>

        <p className="text-muted-foreground text-xs">
          Assumes proficiency with equipped weapons.
          {exhaustionPenalty !== 0
            ? ` Exhaustion −${Math.abs(exhaustionPenalty)} is already in every attack bonus.`
            : ''}
        </p>
      </CardContent>
    </Card>
  )
}
