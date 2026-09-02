'use client'

import { Badge } from '@/components/ui/badge'
import { BACKGROUNDS, SKILLS } from '@/lib/characters/rules'
import { classSkillCount, type WizardChoices } from '@/lib/characters/wizard'
import { CLASSES } from '@/lib/srd/classes'

import { AdvancedDetail } from '../sheet/advanced-detail'
import { SkillProficiencyPicker } from '../skill-proficiency-picker'

const SKILL_LABEL = new Map(SKILLS.map((skill) => [skill.index, skill.label]))

/**
 * Step 5: the skills this character is good at.
 *
 * The suggested set is already chosen — the background's two, which are not a
 * choice at all, plus the class's own picks filled from the most-rolled skills
 * down — and shown as a plain sentence rather than eighteen checkboxes. The
 * full picker is one tap away for anyone who wants a different four.
 *
 * The count the class prints ("Choose 2") is guidance and not a gate, exactly
 * as it is on the one-page form: a DM hands out skills, and an app that refuses
 * the fifth is wrong more often than the player is.
 */
export function SkillsStep({
  choices,
  onChange,
}: {
  choices: WizardChoices
  onChange: (next: WizardChoices) => void
}) {
  const background = BACKGROUNDS.get(choices.backgroundIndex)
  const granted = new Set(background?.skillProficiencies ?? [])
  const className = CLASSES.get(choices.classIndex)?.name ?? 'Your class'

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {choices.skillProficiencies.map((skill) => (
          <li key={skill}>
            <Badge variant={granted.has(skill) ? 'secondary' : 'outline'} className="h-8 px-3">
              {SKILL_LABEL.get(skill) ?? skill}
              {choices.skillExpertise.includes(skill) ? ' ×2' : ''}
            </Badge>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-sm">
        {background
          ? `${background.name} gives you ${[...granted]
              .map((skill) => SKILL_LABEL.get(skill) ?? skill)
              .join(' and ')}, and ${className.toLowerCase()}s choose ${classSkillCount(
              choices.classIndex,
            )} more.`
          : `${className}s choose ${classSkillCount(choices.classIndex)} skills.`}{' '}
        Being proficient means you add your proficiency bonus when you roll one.
      </p>

      <AdvancedDetail
        label="Choose different skills"
        summary="All eighteen, with your class’s own options marked."
        relevant={false}
      >
        <SkillProficiencyPicker
          classIndex={choices.classIndex}
          classLabel={CLASSES.get(choices.classIndex)?.name}
          proficiencies={choices.skillProficiencies}
          expertise={choices.skillExpertise}
          onChange={(next) =>
            onChange({
              ...choices,
              skillProficiencies: next.proficiencies,
              skillExpertise: next.expertise,
            })
          }
        />
      </AdvancedDetail>
    </div>
  )
}
