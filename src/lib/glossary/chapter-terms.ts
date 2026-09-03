// Which glossary terms sit at the head of which rules chapter
// (`learn-to-play/glossary-popovers`).
//
// The `/rules/*` chapters render SRD 5.2.1 prose verbatim and must keep doing
// so — nothing may reach inside that text to wrap a word. So the friendly tier
// sits *beside* the prose instead: a short strip of tappable key terms above
// the chapter, chosen as the words a beginner has to hold in their head to
// read it at all.
//
// Six a chapter at most. A strip that wraps to three lines on a phone stops
// being an aid and starts being the page.
export const CHAPTER_KEY_TERMS: Readonly<Record<string, readonly string[]>> = {
  'core-mechanics': [
    'd20-test',
    'ability-check',
    'saving-throw',
    'attack-roll',
    'advantage',
    'difficulty-class',
  ],
  'abilities-and-skills': [
    'ability-score',
    'modifier',
    'skill',
    'proficiency',
    'expertise',
    'passive-perception',
  ],
  'character-creation': [
    'species',
    'background',
    'class',
    'subclass',
    'origin-feat',
    'character-level',
  ],
  classes: ['class', 'subclass', 'hit-dice', 'proficiency-bonus', 'spell-slot', 'feat'],
  combat: ['initiative', 'turn', 'action', 'bonus-action', 'reaction', 'opportunity-attack'],
  spellcasting: [
    'spell-slot',
    'cantrip',
    'prepared-spell',
    'concentration',
    'spell-save-dc',
    'higher-level-spell',
  ],
  conditions: ['condition', 'exhaustion', 'disadvantage', 'immunity', 'saving-throw'],
  equipment: ['armour-class', 'damage-type', 'weapon-mastery', 'attunement', 'spell-components'],
  adventuring: ['short-rest', 'long-rest', 'hit-dice', 'exhaustion', 'cover', 'attunement'],
  'dm-guide': ['difficulty-class', 'experience-points', 'armour-class', 'condition', 'bloodied'],
  'quick-reference': [
    'd20-test',
    'proficiency-bonus',
    'action',
    'spell-slot',
    'death-saving-throw',
    'condition',
  ],
}

/**
 * The key terms for a chapter slug, or nothing for a page that has none.
 *
 * Every shipped chapter has an entry — `chapter-terms.test.ts` asserts the map
 * covers `RULES_CHAPTERS` exactly — but the lookup still answers for a slug it
 * has never heard of, because a new chapter should render without its strip
 * rather than not render.
 */
export function chapterKeyTerms(slug: string): readonly string[] {
  return CHAPTER_KEY_TERMS[slug] ?? []
}
