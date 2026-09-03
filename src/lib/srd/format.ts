// How SRD 5.2.1 values are written out for a reader
// (`srd-2024-migration/long-tail-reference-data`).
//
// Deliberately free of any `./data` import. Everything here runs in a client
// component — a spell badge, a monster's Speed line — and a module that pulled
// `spells.json` in to format a number would put a megabyte of reference data
// into the browser bundle, which is the one thing `/api/srd/*` exists to avoid.
//
// One module rather than a helper beside each view, so a spell level written
// `Cantrip` in the Library cannot become `Level 0` on the character sheet.
import type { SrdCost, SrdEquipment, SrdMagicItem, SrdMonster, SrdSpell } from './types'

/** `Cantrip`, or `Level 3`. */
export function formatSpellLevel(level: number): string {
  return level === 0 ? 'Cantrip' : `Level ${level}`
}

/**
 * The SRD's Components line: `V, S, M (a ball of bat guano and sulfur)`.
 * `null` for a spell that needs no components at all.
 */
export function formatComponents(spell: Pick<SrdSpell, 'components' | 'material'>): string | null {
  if (spell.components.length === 0) return null
  const letters = spell.components.join(', ')
  return spell.material ? `${letters} (${spell.material})` : letters
}

/**
 * The SRD's Duration line, carrying the Concentration prefix the book prints:
 * `Concentration, up to 1 Minute`.
 */
export function formatDuration(spell: Pick<SrdSpell, 'duration' | 'concentration'>): string {
  return spell.concentration ? `Concentration, up to ${spell.duration}` : spell.duration
}

/** `+3`, `-1`, `+0` — the signed form every stat block prints. */
export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : String(modifier)
}

// Walking speed leads and is unlabelled; the rest are named in the SRD's order.
const MOVEMENT_ORDER = ['burrow', 'climb', 'fly', 'swim'] as const

/** The Speed line as the SRD prints it: `30 ft., Fly 60 ft.` */
export function formatSpeed(monster: Pick<SrdMonster, 'speed'>): string {
  const parts: string[] = []
  if (monster.speed.walk !== undefined) parts.push(`${monster.speed.walk} ft.`)

  for (const movement of MOVEMENT_ORDER) {
    const distance = monster.speed[movement]
    if (distance === undefined) continue
    const label = movement.charAt(0).toUpperCase() + movement.slice(1)
    const hover = movement === 'fly' && monster.speed.hover ? ' (hover)' : ''
    parts.push(`${label} ${distance} ft.${hover}`)
  }

  return parts.join(', ')
}

/** The Senses line: the ranged senses the block names, then Passive Perception. */
export function formatSenses(monster: Pick<SrdMonster, 'senses' | 'passivePerception'>): string {
  const parts: string[] = []
  for (const [sense, range] of Object.entries(monster.senses)) {
    if (typeof range !== 'number' || range <= 0) continue
    parts.push(`${sense.charAt(0).toUpperCase() + sense.slice(1)} ${range} ft.`)
  }
  if (monster.passivePerception !== null)
    parts.push(`Passive Perception ${monster.passivePerception}`)
  return parts.join(', ')
}

/**
 * A magic item's type line: `Wondrous Items, uncommon (requires attunement)`.
 * Built from the structured fields — the 2014 data had no attunement flag, so
 * the old detail view had to pattern-match the phrase out of the prose.
 */
export function formatMagicItemType(
  item: Pick<SrdMagicItem, 'categoryName' | 'rarity' | 'attunement'>,
): string {
  const base = `${item.categoryName}, ${item.rarity.toLowerCase()}`
  return item.attunement ? `${base} (requires attunement)` : base
}

/** `75 GP`, `5 CP`, or `—` for a row the SRD prices with an em dash. */
export function formatCost(cost: SrdCost | null): string {
  if (!cost) return '—'
  return `${cost.quantity} ${cost.unit.toUpperCase()}`
}

/** `3 lb.`, or `—` where the SRD table prints an em dash. */
export function formatWeight(weight: number | null): string {
  return weight === null ? '—' : `${weight} lb.`
}

/** The AC an armour gives, as the SRD's Armor table writes it: `14 + Dex (max 2)`. */
export function formatArmorClass(armorClass: SrdEquipment['armorClass']): string | null {
  if (!armorClass) return null
  if (!armorClass.dexBonus) return String(armorClass.base)
  const cap = armorClass.maxBonus === null ? '' : ` (max ${armorClass.maxBonus})`
  return `${armorClass.base} + Dex${cap}`
}

/**
 * The damage a spell does when cast with a slot of `level`, off the SRD's own
 * "At Higher Levels" table, or `null` when the book prints no row for it.
 *
 * The table is keyed by the label the book uses — `Level 4` for a slot — and
 * the join is here rather than at each call site so the cast flow and the
 * `learn-to-play/roll-walkthroughs` explanation of the same cast cannot read
 * the table two different ways.
 */
export function spellDamageAtSlotLevel(
  spell: Pick<SrdSpell, 'higherLevelDamage'>,
  level: number,
): string | null {
  return spell.higherLevelDamage.find((row) => row.label === `Level ${level}`)?.damage ?? null
}
