// The curated opening hand per casting class, and the fixed list a sheet shows
// when its table is not doing daily spell preparation yet.
//
// Lifted out of `wizard.ts` by `dm-prep-suite/campaign-feature-gates`, which
// needed the same table on the *sheet* — and could not have it from there.
// `wizard.ts` reaches the SRD spell data directly (`spellsForClass`), and
// `spells.json` is precisely the long-tail file the app deliberately serves
// over `/api/srd/*` rather than bundling (D31); importing it into a card the
// sheet mounts would put 339 spells into the page opened mid-combat.
//
// So the split is by weight, not by topic: **this module is indexes only** —
// no SRD import, nothing to bundle — and `curatedSpells` in `wizard.ts` stays
// where it is, filtering these lists against the data it already loads. The
// sheet renders an index it cannot name as its formatted slug, which is what
// it already does for every spell the class list has not loaded yet.
import { spellPreparationModel } from './rules'

/**
 * A curated opening hand per casting class: cantrips first, then 1st-level
 * spells, each list long enough to fill what the class tables allow at level 1
 * and ordered so that taking them from the top gives a caster who can do
 * something on every turn.
 *
 * Never the whole list. Four hundred spells in front of someone on their first
 * evening is the single loudest finding in the research, and the class list is
 * one Advanced tap away for anyone who wants it.
 */
const CURATED_SPELLS: Readonly<Record<string, { cantrips: string[]; level1: string[] }>> = {
  bard: {
    cantrips: ['vicious-mockery', 'prestidigitation', 'minor-illusion', 'light'],
    level1: ['healing-word', 'faerie-fire', 'charm-person', 'cure-wounds', 'thunderwave'],
  },
  cleric: {
    cantrips: ['sacred-flame', 'guidance', 'light', 'spare-the-dying'],
    level1: ['cure-wounds', 'bless', 'guiding-bolt', 'healing-word', 'shield-of-faith'],
  },
  druid: {
    cantrips: ['produce-flame', 'druidcraft', 'guidance', 'shillelagh'],
    level1: ['entangle', 'cure-wounds', 'faerie-fire', 'healing-word', 'thunderwave'],
  },
  paladin: {
    cantrips: [],
    level1: ['bless', 'cure-wounds', 'divine-favor', 'shield-of-faith'],
  },
  ranger: {
    cantrips: [],
    level1: ['hunters-mark', 'cure-wounds', 'ensnaring-strike', 'longstrider'],
  },
  sorcerer: {
    cantrips: ['fire-bolt', 'prestidigitation', 'mage-hand', 'minor-illusion', 'light'],
    level1: ['magic-missile', 'shield', 'burning-hands', 'chromatic-orb'],
  },
  warlock: {
    cantrips: ['eldritch-blast', 'prestidigitation', 'minor-illusion', 'mage-hand'],
    level1: ['hex', 'hellish-rebuke', 'charm-person', 'bane'],
  },
  wizard: {
    cantrips: ['fire-bolt', 'mage-hand', 'prestidigitation', 'ray-of-frost', 'light'],
    level1: [
      'magic-missile',
      'shield',
      'mage-armor',
      'sleep',
      'burning-hands',
      'detect-magic',
      'feather-fall',
      'thunderwave',
    ],
  },
}

/** The curated lists for a class, as written — indexes, unfiltered. */
export function curatedSpellIndexes(classIndex: string): { cantrips: string[]; level1: string[] } {
  return CURATED_SPELLS[classIndex] ?? { cantrips: [], level1: [] }
}

/**
 * The spells a sheet shows while its campaign has spell preparation switched
 * off (`dm-prep-suite/campaign-feature-gates`).
 *
 * The gate hides the daily ritual, not the spells: what a caster has is
 * whatever the character record already holds — cantrips and a spellbook in
 * `known`, the day's list in `prepared` — shown as a fixed list with no
 * toggles. Nothing is written, so turning the gate on hands the player back
 * exactly the preparation state they always had.
 *
 * The one case the record cannot answer is a caster with **nothing** in either
 * column: a cleric prepares from the whole class list, so an untouched record
 * legitimately holds no spells, and a card reading "no spells" would be wrong
 * about a character who can cast. That is what the curated set is for — the
 * same opening hand the creation wizard recommends, offered as the fixed list
 * rather than as an empty one. It is display only, and stays display only: the
 * moment a DM switches preparation on, the player picks their own from a list
 * that has never been silently written to.
 */
export function fixedSpellIndexes(
  classIndex: string,
  known: readonly string[],
  prepared: readonly string[],
): string[] {
  const held = [...new Set([...known, ...prepared])]
  if (held.length > 0) return held

  if (spellPreparationModel(classIndex) === null) return []

  const curated = curatedSpellIndexes(classIndex)
  return [...curated.cantrips, ...curated.level1]
}
