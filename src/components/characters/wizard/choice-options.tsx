import { classCardOrder, classGuide } from '@/lib/characters/wizard'
import { BACKGROUNDS } from '@/lib/srd/backgrounds'
import { CLASSES } from '@/lib/srd/classes'
import { BACKGROUND_IN_PLAY, CLASS_IN_PLAY, SPECIES_IN_PLAY } from '@/lib/srd/in-play'
import { SPECIES } from '@/lib/srd/species'
import { ABILITIES } from '@/lib/characters/schema'
import { SKILLS } from '@/lib/characters/rules'

import type { WizardOption } from './option-row'

const ABILITY_LABEL = new Map(ABILITIES.map((ability) => [ability.key as string, ability.label]))
const SKILL_LABEL = new Map(SKILLS.map((skill) => [skill.index, skill.label]))

/** "Strength and Constitution", "Dexterity, Constitution and Intelligence". */
function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/**
 * The twelve classes as cards: the authored "in play" line, the hit die and
 * primary ability as chips, and the two lowest-cognitive-load classes first
 * and badged (research §3 — a beginner reads the top of a list and stops).
 */
export function classOptions(recommended: string): WizardOption[] {
  return classCardOrder().map((index) => {
    const srd = CLASSES.get(index)

    return {
      value: index,
      title: srd?.name ?? index,
      inPlay: CLASS_IN_PLAY[index],
      meta: [
        `d${srd?.hitDie ?? 8} hit die`,
        srd?.primaryAbility ? `Best with ${srd.primaryAbility}` : '',
        classGuide(index)?.complexity === 'simple' ? 'Easiest to run' : '',
      ].filter(Boolean),
      recommended: index === recommended,
    }
  })
}

/**
 * The nine species. In the 2024 rules a species grants traits and speed and no
 * ability scores at all, which is exactly why it comes *after* the class and
 * matters less than a new player expects — so the card says what it does give.
 */
export function speciesOptions(recommended: string): WizardOption[] {
  return SPECIES.all.map((species) => ({
    value: species.index,
    title: species.name,
    inPlay: SPECIES_IN_PLAY[species.index],
    meta: [`${species.speed} ft. speed`, species.size],
    recommended: species.index === recommended,
  }))
}

/**
 * The four backgrounds — the 2024 rules' home for ability score increases, an
 * Origin feat, two skills and a tool. The increases lead the chips, because
 * that is the part the next step spends; the line under the name is what the
 * feat and the two skills mean once the character is being played.
 */
export function backgroundOptions(recommended: string): WizardOption[] {
  return BACKGROUNDS.all.map((background) => ({
    value: background.index,
    title: background.name,
    inPlay: BACKGROUND_IN_PLAY[background.index],
    meta: [
      `Raises ${joinWords(background.abilityScores.map((key) => ABILITY_LABEL.get(key) ?? key))}`,
      `${joinWords(background.skillProficiencies.map((skill) => SKILL_LABEL.get(skill) ?? skill))} proficiency`,
      `${background.originFeat.name} feat`,
    ],
    recommended: background.index === recommended,
  }))
}
