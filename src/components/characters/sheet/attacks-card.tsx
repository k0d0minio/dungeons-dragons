'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  spellAttackBonus,
  spellSaveDc,
  weaponAttack,
  type WeaponDetails,
} from '@/lib/characters/attacks'
import { abilityModifier, formatModifier, formatReferenceIndex } from '@/lib/characters/display'
import { proficiencyBonus } from '@/lib/characters/rules'
import type { Character, CharacterItem } from '@/lib/db/schema'
import type { Equipment } from '@/lib/dnd-api/swr-hooks'

/** True for a reference item the attack rules can read as a weapon. */
function isWeapon(details: Equipment): boolean {
  return (
    details.equipment_category?.index === 'weapon' ||
    details.weapon_range !== undefined ||
    details.damage !== undefined
  )
}

function AttackRow({
  name,
  bonus,
  detail,
  muted,
}: {
  name: string
  bonus: string | null
  detail: string | null
  muted?: boolean
}) {
  return (
    <li
      className="flex min-h-11 items-center justify-between gap-3 border-b py-2 last:border-b-0"
      // The whole row spelled out for a screen reader: "Longsword +5, 1d8+3
      // slashing" — the visual split into name, bonus and detail is layout.
      aria-label={`${name}${bonus ? ` ${bonus}` : ''}${detail ? `, ${detail}` : ''}`}
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
 * (which weapon, equipped), the reference API holds the dice, and
 * `weaponAttack` joins the two. Proficiency with whatever is equipped is
 * assumed (see `src/lib/characters/attacks.ts`), and the footnote says so on
 * screen rather than leaving a quietly optimistic number.
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
  details: Record<string, Equipment>
  detailsLoading: boolean
}) {
  const equipped = items.filter((item) => item.equipped)

  const rows: Array<{
    key: string
    name: string
    bonus: string | null
    detail: string | null
    muted?: boolean
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

    const attack = weaponAttack(character, reference as WeaponDetails, item.customName ?? undefined)

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
    })
  }

  const hasWeaponRows = rows.length > 0

  const spellBonus = spellAttackBonus(character)
  const saveDc = spellSaveDc(character)

  const strength = abilityModifier(character.strength)
  const unarmedBonus = proficiencyBonus(character.level) + strength
  const unarmedDamage = Math.max(0, 1 + strength)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Attacks</CardTitle>
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

        <p className="text-muted-foreground text-xs">Assumes proficiency with equipped weapons.</p>
      </CardContent>
    </Card>
  )
}
