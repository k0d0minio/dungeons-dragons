'use client'

import { GlossaryTerm } from '@/components/glossary/glossary-term'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { spellAttackBonus, spellSaveDc, weaponAttack } from '@/lib/characters/attacks'
import { abilityModifier, formatModifier, formatReferenceIndex } from '@/lib/characters/display'
import { exhaustionD20Penalty, proficiencyBonus } from '@/lib/characters/rules'
import type { Character, CharacterItem } from '@/lib/db/schema'
import type { SrdEquipment } from '@/lib/srd/types'
import { WEAPONS } from '@/lib/srd/weapons'

/** True for a reference item the attack rules can read as a weapon. */
function isWeapon(details: SrdEquipment): boolean {
  return details.categories.includes('weapons')
}

function AttackRow({
  name,
  bonus,
  detail,
  muted,
  mastery,
}: {
  name: string
  bonus: string | null
  detail: string | null
  muted?: boolean
  mastery?: { text: string; usable: boolean }
}) {
  return (
    <li
      className="flex min-h-11 items-center justify-between gap-3 border-b py-2 last:border-b-0"
      // The whole row spelled out for a screen reader: "Longsword +5, 1d8+3
      // slashing, Mastery: Sap" — the visual split into name, bonus and detail
      // is layout.
      aria-label={`${name}${bonus ? ` ${bonus}` : ''}${detail ? `, ${detail}` : ''}${
        mastery ? `, ${mastery.text}` : ''
      }`}
    >
      <span className="min-w-0" aria-hidden>
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
 */
export function AttacksCard({
  character,
  items,
  details,
  detailsLoading,
}: {
  character: Character
  items: CharacterItem[]
  /** Reference details of equipped items, keyed by equipment index. */
  details: Record<string, SrdEquipment>
  detailsLoading: boolean
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
    })
  }

  const hasWeaponRows = rows.length > 0

  const spellBonus = spellAttackBonus(character)
  const saveDc = spellSaveDc(character)

  const strength = abilityModifier(character.strength)
  const exhaustionPenalty = exhaustionD20Penalty(character.exhaustion)
  const unarmedBonus = proficiencyBonus(character.level) + strength + exhaustionPenalty
  const unarmedDamage = Math.max(0, 1 + strength)

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
            />
          ))}

          {spellBonus !== null && saveDc !== null ? (
            <AttackRow
              name="Spell attack"
              bonus={formatModifier(spellBonus)}
              detail={`save DC ${saveDc}`}
            />
          ) : null}

          <AttackRow
            name="Unarmed strike"
            bonus={formatModifier(unarmedBonus)}
            detail={`${unarmedDamage} bludgeoning`}
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
