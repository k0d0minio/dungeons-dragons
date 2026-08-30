import type { RulesChapterFile } from './load'

/**
 * The shipped rules chapters, in reading order (DND-053).
 *
 * One entry per page under `src/app/rules/`: the `/rules` index renders this
 * list, and each chapter page uses it for its own title and for the previous /
 * next links at the foot. It replaces the two-page `sibling` prop DND-037 used,
 * which had no way to scale past a pair.
 *
 * `slug` is the URL segment and is part of the app's public surface —
 * `conditions` and `quick-reference` predate this ticket and are linked from
 * the character sheet's ConditionsCard, so they must not be renamed.
 */
export type RulesChapterMeta = {
  slug: string
  file: RulesChapterFile
  /** Chapter name as it reads in a list — not the `# 05 — Combat` heading in the markdown. */
  title: string
  /** One line for the index card: what a reader would come here to settle. */
  blurb: string
}

export const RULES_CHAPTERS: readonly RulesChapterMeta[] = [
  {
    slug: 'core-mechanics',
    file: '01-core-mechanics.md',
    title: 'Core mechanics',
    blurb: 'The d20 engine: checks, saves, attacks, advantage, proficiency and setting DCs.',
  },
  {
    slug: 'abilities-and-skills',
    file: '02-abilities-and-skills.md',
    title: 'Abilities & skills',
    blurb: 'The six abilities, all 18 skills, carrying capacity, jumping and passive scores.',
  },
  {
    slug: 'character-creation',
    file: '03-character-creation.md',
    title: 'Character creation',
    blurb: 'Point buy, species, derived stats, levelling up and multiclassing, step by step.',
  },
  {
    slug: 'classes',
    file: '04-classes.md',
    title: 'Classes',
    blurb: 'All 12 classes — hit dice, proficiencies, casting model and features by level.',
  },
  {
    slug: 'combat',
    file: '05-combat.md',
    title: 'Combat',
    blurb: 'The whole combat loop: initiative, actions, cover, damage and death saves.',
  },
  {
    slug: 'spellcasting',
    file: '06-spellcasting.md',
    title: 'Spellcasting',
    blurb: 'Slots, prepared vs known, concentration, components, rituals and areas of effect.',
  },
  {
    slug: 'conditions',
    file: '07-conditions.md',
    title: 'Conditions',
    blurb: 'All 15 conditions plus exhaustion — exact effects, stacking, and how each one ends.',
  },
  {
    slug: 'equipment',
    file: '08-equipment.md',
    title: 'Equipment',
    blurb: 'Currency, armour and weapon tables, weapon properties, magic items and attunement.',
  },
  {
    slug: 'adventuring',
    file: '09-adventuring.md',
    title: 'Adventuring',
    blurb: 'Travel, rests, light and vision, hazards, traps, the social pillar and downtime.',
  },
  {
    slug: 'dm-guide',
    file: '10-dm-guide.md',
    title: 'DM guide',
    blurb: 'Reading a stat block, building encounters, CR and XP, treasure and session prep.',
  },
  {
    slug: 'quick-reference',
    file: '11-quick-reference.md',
    title: 'Quick reference',
    blurb: 'The DM screen: lookup tables and one-line answers to the most common disputes.',
  },
]

/** The chapter's neighbours in reading order, for the foot of a chapter page. */
export function rulesChapterNeighbours(slug: string): {
  previous?: RulesChapterMeta
  next?: RulesChapterMeta
} {
  const index = RULES_CHAPTERS.findIndex((chapter) => chapter.slug === slug)
  if (index === -1) return {}

  return { previous: RULES_CHAPTERS[index - 1], next: RULES_CHAPTERS[index + 1] }
}
